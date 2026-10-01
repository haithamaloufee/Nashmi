import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { readdirSync, existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

// Use the official npm-cached Microsoft server over its documented stdio transport.
const cache = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
const cli = readdirSync(cache).map(dir => path.join(cache, dir, "node_modules", "@playwright", "mcp", "cli.js")).find(file => existsSync(file));
if (!cli) throw new Error("Run npx -y @playwright/mcp@latest --help once to populate the official npm cache");
const pkg = JSON.parse(readFileSync(path.join(path.dirname(cli), "package.json"), "utf8"));
if (pkg.repository.url !== "git+https://github.com/microsoft/playwright-mcp.git") throw new Error("Unexpected MCP package provenance");
mkdirSync("test-results/mcp", { recursive: true });
const server = spawn(process.execPath, [cli, "--headless", "--isolated", "--browser", "chrome", "--executable-path", chromium.executablePath(), "--sandbox", "--output-dir", "test-results/mcp", "--save-session"], { stdio: ["pipe", "pipe", "pipe"] });
server.stderr.on("data", data => process.stderr.write(data));
const pending = new Map();
let id = 0;
createInterface({ input: server.stdout }).on("line", line => {
  try { const msg = JSON.parse(line); if (msg.id !== undefined && pending.has(msg.id)) { const { resolve, reject, timer } = pending.get(msg.id); clearTimeout(timer); pending.delete(msg.id); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result); } } catch { console.error(line); }
});
function rpc(method, params) {
  const requestId = ++id;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`MCP timeout: ${method}`)); }, 90_000);
    pending.set(requestId, { resolve, reject, timer });
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params }) + "\n");
  });
}
const initialized = await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "nashmi-local-ux-qa", version: "1.0" } });
server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
console.log(JSON.stringify({ initialized }));
const list = await rpc("tools/list", {});
console.log(JSON.stringify(list.tools.map(({ name, inputSchema }) => ({ name, inputSchema }))));
console.log("MCP_READY: Send one JSON object per line: {name, arguments}. Only local QA navigation is allowed.");
for await (const line of createInterface({ input: process.stdin, terminal: false })) {
  if (line.trim() === "exit") break;
  try {
    const call = JSON.parse(line);
    if (call.name === "browser_navigate" && !call.arguments?.url?.startsWith("http://127.0.0.1:3020")) throw new Error("Only loopback QA navigation allowed");
    const result = await rpc("tools/call", call);
    appendFileSync("test-results/mcp/tool-results.jsonl", JSON.stringify({ call, result, at: new Date().toISOString() }) + "\n");
    for (const content of result.content || []) if (content.type === "text") console.log(content.text);
    console.log(`MCP_RESULT ${call.name} isError=${Boolean(result.isError)}`);
  } catch (error) { console.error(String(error)); }
}
await rpc("tools/call", { name: "browser_close", arguments: {} }).catch(() => {});
server.kill();
