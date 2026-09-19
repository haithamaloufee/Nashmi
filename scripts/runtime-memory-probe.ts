import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const port = Number(process.env.MEMORY_PROBE_PORT || 3012);
const inspectorPort = Number(process.env.MEMORY_INSPECTOR_PORT || 9230);
const loadSeconds = Number(process.env.MEMORY_LOAD_SECONDS || 180);
const recoverySeconds = Number(process.env.MEMORY_RECOVERY_SECONDS || 60);
const baseUrl = `http://127.0.0.1:${port}`;
const routes = ["/", "/laws", "/parties", "/updates", "/surveys", "/chat", "/api/laws?limit=5", "/api/surveys?limit=5", "/api/health"];

type MemorySample = ReturnType<typeof process.memoryUsage> & { phase: string; elapsedSeconds: number };

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForUrl(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3_000) });
      if (response.ok) return;
    } catch {
      // Server or inspector is still starting.
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function inspectorWebSocketUrl() {
  const response = await fetch(`http://127.0.0.1:${inspectorPort}/json/list`);
  const targets = (await response.json()) as Array<{ webSocketDebuggerUrl?: string }>;
  const url = targets[0]?.webSocketDebuggerUrl;
  if (!url) throw new Error("Node inspector target was not available");
  return url;
}

async function readProcessMemory(webSocketUrl: string) {
  return new Promise<ReturnType<typeof process.memoryUsage>>((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("Inspector memory query timed out"));
    }, 5_000);
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: "process.memoryUsage()", returnByValue: true } }));
    });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== 1) return;
      clearTimeout(timer);
      socket.close();
      if (message.error || message.result?.exceptionDetails) reject(new Error("Inspector memory query failed"));
      else resolve(message.result.result.value);
    });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("Inspector WebSocket failed"));
    });
  });
}

async function exerciseRoutes(latencies: number[]) {
  const started = performance.now();
  await Promise.all(
    routes.map(async (route) => {
      const response = await fetch(`${baseUrl}${route}`, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
      if (!response.ok) throw new Error(`${route} returned ${response.status}`);
      await response.arrayBuffer();
    })
  );
  // This is a local-safety response and never calls Gemini, while still exercising
  // the assistant request validation, rate limiter, local retrieval, and rendering path.
  const ai = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "أعطني وصفة طبخ" }),
    signal: AbortSignal.timeout(45_000)
  });
  if (![200, 429].includes(ai.status)) throw new Error(`/api/chat returned ${ai.status}`);
  await ai.arrayBuffer();
  latencies.push(Math.round(performance.now() - started));
}

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] || 0;
}

async function stopServer(child: ChildProcess) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => child.once("exit", resolve)), wait(5_000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function main() {
  const child = spawn(process.execPath, [`--inspect=127.0.0.1:${inspectorPort}`, nextBin, "start", "-p", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      RATE_LIMIT_SECRET: process.env.RATE_LIMIT_SECRET || "local-memory-probe-rate-limit-secret-only"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let serverOutput = "";
  child.stdout?.on("data", (chunk) => (serverOutput += String(chunk).slice(-2_000)));
  child.stderr?.on("data", (chunk) => (serverOutput += String(chunk).slice(-2_000)));
  const samples: MemorySample[] = [];
  const latencies: number[] = [];
  const startedAt = Date.now();

  try {
    await Promise.all([
      waitForUrl(`${baseUrl}/api/health`, 60_000),
      waitForUrl(`http://127.0.0.1:${inspectorPort}/json/list`, 60_000)
    ]);
    const inspector = await inspectorWebSocketUrl();
    const sample = async (phase: string) => {
      const memory = await readProcessMemory(inspector);
      samples.push({ ...memory, phase, elapsedSeconds: Math.round((Date.now() - startedAt) / 1000) });
    };

    // Warm route modules, the MongoDB pool, and the local assistant safety path
    // before measuring idle memory so cold-start compilation/connection costs do
    // not masquerade as retained growth during the load phase.
    await exerciseRoutes([]);
    await wait(5_000);
    await sample("idle");
    await wait(10_000);
    await sample("idle");

    const loadDeadline = Date.now() + loadSeconds * 1_000;
    let nextSample = Date.now();
    while (Date.now() < loadDeadline) {
      await exerciseRoutes(latencies);
      if (Date.now() >= nextSample) {
        await sample("load");
        nextSample = Date.now() + 10_000;
      }
    }

    const recoveryDeadline = Date.now() + recoverySeconds * 1_000;
    while (Date.now() < recoveryDeadline) {
      await wait(10_000);
      await sample("recovery");
    }

    const megabytes = (bytes: number) => Number((bytes / 1024 / 1024).toFixed(2));
    const summarized = samples.map((item) => ({
      phase: item.phase,
      elapsedSeconds: item.elapsedSeconds,
      rssMb: megabytes(item.rss),
      heapTotalMb: megabytes(item.heapTotal),
      heapUsedMb: megabytes(item.heapUsed),
      externalMb: megabytes(item.external),
      arrayBuffersMb: megabytes(item.arrayBuffers)
    }));
    const report = {
      durationSeconds: Math.round((Date.now() - startedAt) / 1_000),
      loadSeconds,
      recoverySeconds,
      requestBatches: latencies.length,
      batchLatencyMs: { p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95), max: Math.max(...latencies) },
      samples: summarized
    };
    const outputDir = path.join(process.cwd(), "test-results");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(path.join(outputDir, "runtime-memory.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : "Memory probe failed"}; server=${serverOutput.slice(-500)}`);
  } finally {
    await stopServer(child);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Runtime memory probe failed");
  process.exit(1);
});
