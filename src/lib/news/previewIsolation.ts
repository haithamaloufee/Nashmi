import { mongo } from "mongoose";
import { getMongoUri, getServerSelectionTimeoutMs } from "@/lib/env";

type DatabaseRole = { role: string; db: string };

export function assertPreviewDatabaseRoles(databaseName: string, roles: DatabaseRole[] | undefined) {
  if (databaseName !== "nashmi_preview") throw new Error("NEWS_PREVIEW_DATABASE_ISOLATION_FAILED");
  // Exact built-in roles provide a verifiable boundary. Unknown/custom roles
  // require a separate privilege audit before pipeline writes are permitted.
  if (!roles?.length || roles.some(({ role, db }) => db !== "nashmi_preview" || !["read", "readWrite"].includes(role))) {
    throw new Error("NEWS_PREVIEW_DATABASE_PERMISSIONS_UNVERIFIED");
  }
}

/** Native driver only: no Mongoose models, collection creation, or index writes. */
export async function verifyNewsPreviewIsolation() {
  if (process.env.VERCEL_ENV !== "preview") throw new Error("NEWS_PREVIEW_DEPLOYMENT_REQUIRED");
  const client = new mongo.MongoClient(getMongoUri(), { serverSelectionTimeoutMS: getServerSelectionTimeoutMs() });
  try {
    await client.connect();
    const database = client.db();
    const status = await database.admin().command({ connectionStatus: 1 });
    const roles = status.authInfo?.authenticatedUserRoles as DatabaseRole[] | undefined;
    assertPreviewDatabaseRoles(database.databaseName, roles);
    return { database: database.databaseName, roles: roles!, productionWriteGranted: false };
  } finally {
    await client.close();
  }
}
