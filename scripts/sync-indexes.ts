import { formatSafeError, loadEnv } from "./env";
import { connectToDatabase, mongoose } from "../src/lib/db";
import "../src/models";

loadEnv();

async function main() {
  await connectToDatabase();
  for (const name of mongoose.modelNames()) {
    await mongoose.model(name).syncIndexes();
    console.log(`Synced indexes: ${name}`);
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(formatSafeError(error));
  await mongoose.disconnect();
  process.exit(1);
});
