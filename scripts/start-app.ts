import { spawn, spawnSync } from "child_process";
import { formatSafeError, loadEnv } from "./env";
import { connectToDatabase, mongoose } from "../src/lib/db";
import { InvalidEnvError, MissingEnvError, validateRuntimeEnv } from "../src/lib/env";
import { describeMissingDemoData, getDemoDataCounts, hasRequiredDemoData } from "./demo-data";

loadEnv();

const npmCommand = "npm";
const useShell = process.platform === "win32";

function diagnoseMongoFailure(error: unknown) {
  if (error instanceof MissingEnvError) return `missing required variable: ${error.variableName}`;
  if (error instanceof InvalidEnvError) {
    if (error.variableName === "MONGODB_URI" && error.message.includes("database name")) return "invalid database name";
    return `invalid environment value: ${error.variableName}`;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";

  if (message.includes("bad auth") || message.includes("authentication failed")) return "wrong credentials";
  if (message.includes("ip") && (message.includes("whitelist") || message.includes("access"))) return "MongoDB Atlas IP whitelist issue";
  if (code === "8000") return "wrong credentials or MongoDB Atlas IP whitelist issue";
  if (message.includes("querysrv") || message.includes("enotfound") || message.includes("eai_again")) return "network/DNS problem";
  if (message.includes("server selection timed out") || message.includes("timed out")) return "network, Atlas IP whitelist, or cluster availability";
  if (message.includes("invalid scheme") || message.includes("mongodb")) return "MongoDB connection string issue";

  return "unknown MongoDB connection issue";
}

function runSeed() {
  const result = spawnSync(npmCommand, ["run", "seed"], { stdio: "inherit", shell: useShell });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

async function validateEnvironment() {
  console.log("Checking environment...");
  const result = validateRuntimeEnv({ requireDatabase: true, requireAuth: true });
  if (!result.ok) {
    for (const variableName of result.missing) console.error(`Missing required environment variable: ${variableName}`);
    for (const message of result.invalid) console.error(message);
    process.exit(1);
  }
  console.log("Environment OK.");
}

async function testMongoConnection() {
  console.log("Testing MongoDB connection...");
  try {
    const connection = await connectToDatabase();
    if (!connection.connection.db) throw new Error("MongoDB connection opened without a database handle");
    await connection.connection.db.admin().ping();
    console.log("MongoDB connection OK.");
  } catch (error) {
    console.error(`MongoDB connection failed. Possible cause: ${diagnoseMongoFailure(error)}.`);
    console.error(formatSafeError(error));
    process.exit(1);
  }
}

async function ensureDemoData() {
  console.log("Checking demo data...");
  const counts = await getDemoDataCounts();
  if (hasRequiredDemoData(counts)) {
    console.log("Demo data exists. Skipping seed.");
    return;
  }

  console.log(`Demo data is missing. Running seed... (${describeMissingDemoData(counts).join(", ")})`);
  await mongoose.disconnect();
  runSeed();
  await connectToDatabase();

  const updatedCounts = await getDemoDataCounts();
  if (!hasRequiredDemoData(updatedCounts)) {
    console.error(`Seed completed, but required demo data is still missing: ${describeMissingDemoData(updatedCounts).join(", ")}`);
    process.exit(1);
  }
  console.log("Seed completed.");
}

async function startDevServer() {
  await mongoose.disconnect();
  console.log("Starting development server...");
  const dev = spawn(npmCommand, ["run", "dev"], { stdio: "inherit", shell: useShell });

  dev.on("exit", (code) => {
    process.exit(code || 0);
  });
}

async function main() {
  await validateEnvironment();
  await testMongoConnection();
  await ensureDemoData();
  await startDevServer();
}

main().catch(async (error) => {
  console.error(formatSafeError(error));
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
