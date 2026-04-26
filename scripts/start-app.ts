import net from "net";
import { spawn, spawnSync } from "child_process";
import { formatSafeError, loadEnv } from "./env";
import { getOptionalEnv } from "../src/lib/env";

loadEnv();

const npmCommand = "npm";
const useShell = process.platform === "win32";
const mongoUri = getOptionalEnv("MONGODB_URI");

function parseMongoTarget(uri: string) {
  try {
    const parsed = new URL(uri);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: Number(parsed.port || 27017)
    };
  } catch {
    return { host: "127.0.0.1", port: 27017 };
  }
}

function canConnect(host: string, port: number, timeoutMs = 2500) {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (ok: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function main() {
  const { host, port } = parseMongoTarget(mongoUri || "");
  const mongoReady = mongoUri ? await canConnect(host, port) : false;

  if (mongoReady) {
    console.log(`MongoDB متاح على ${host}:${port}. سيتم تشغيل seed قبل التطبيق.`);
    const seed = spawnSync(npmCommand, ["run", "seed"], { stdio: "inherit", shell: useShell });
    if (seed.status !== 0) process.exit(seed.status || 1);
  } else {
    console.warn(`تحذير: MongoDB غير متاح على ${host}:${port}. سيعمل التطبيق، لكن بيانات الديمو وتسجيل الدخول تحتاج قاعدة بيانات.`);
  }

  const dev = spawn(npmCommand, ["run", "dev"], { stdio: "inherit", shell: useShell });
  dev.on("exit", (code) => process.exit(code || 0));
}

main().catch((error) => {
  console.error(formatSafeError(error));
  process.exit(1);
});
