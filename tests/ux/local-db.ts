import mongoose from "mongoose";
import { readFileSync } from "node:fs";
export async function localDatabase() {
  const runtime = JSON.parse(readFileSync("test-results/qa-runtime.json", "utf8"));
  if (!runtime.MONGODB_URI.startsWith("mongodb://127.0.0.1:") || !runtime.MONGODB_URI.includes("nashmi_ux_qa")) throw new Error("Only the isolated QA database is allowed");
  return mongoose.createConnection(runtime.MONGODB_URI).asPromise();
}
