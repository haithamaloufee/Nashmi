import mongoose from "mongoose";
import { formatSafeError, loadEnv } from "./env";
import { getMongoUri, getServerSelectionTimeoutMs, InvalidEnvError, MissingEnvError } from "../src/lib/env";

loadEnv();

function diagnoseMongoFailure(error: unknown) {
  if (error instanceof MissingEnvError) return `missing env loading or missing variable: ${error.variableName}`;
  if (error instanceof InvalidEnvError) return `invalid environment value: ${error.variableName}`;

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";

  if (message.includes("bad auth") || message.includes("authentication failed")) return "wrong credentials";
  if (message.includes("ip") && (message.includes("whitelist") || message.includes("access"))) return "MongoDB Atlas IP access list";
  if (code === "8000") return "wrong credentials or MongoDB Atlas IP access list";
  if (message.includes("querysrv") || message.includes("enotfound") || message.includes("eai_again")) return "network or DNS";
  if (message.includes("server selection timed out") || message.includes("timed out")) return "network, Atlas IP access list, or cluster availability";
  if (message.includes("invalid scheme") || message.includes("mongodb")) return "connection string format";

  return "unknown database connection issue";
}

async function main() {
  const uri = getMongoUri();
  const connection = await mongoose.createConnection(uri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: getServerSelectionTimeoutMs()
  }).asPromise();

  try {
    if (!connection.db) throw new Error("MongoDB connection opened without a database handle");
    await connection.db.admin().ping();
    console.log("MongoDB ping succeeded.");
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(`MongoDB ping failed. Likely reason: ${diagnoseMongoFailure(error)}.`);
  console.error(formatSafeError(error));
  process.exit(1);
});
