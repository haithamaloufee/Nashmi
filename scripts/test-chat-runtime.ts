import assert from "node:assert/strict";
import { buildBoundedConversation, classifyAiProviderError, ModelAttemptError, runWithModelFallback } from "../src/lib/ai/resilience";

function providerError(status: number) {
  return Object.assign(new Error("provider failed"), { status });
}

async function main() {
  const history = buildBoundedConversation(
    [{ role: "user", content: "first" }, { role: "assistant", content: "answer" }],
    "latest",
    100
  );
  assert.equal(history.at(-1)?.content, "latest");
  assert.equal(history[0]?.role, "user");

  const calls: string[] = [];
  const success = await runWithModelFallback("primary", "fallback", async (model) => {
    calls.push(model);
    return "answer";
  }, (error) => classifyAiProviderError(error).retryable);
  assert.deepEqual(success, { result: "answer", model: "primary" });
  assert.deepEqual(calls, ["primary"]);

  for (const status of [404, 429, 503]) {
    const attempts: string[] = [];
    const recovered = await runWithModelFallback("primary", "fallback", async (model) => {
      attempts.push(model);
      if (model === "primary") throw providerError(status);
      return "fallback answer";
    }, (error) => classifyAiProviderError(error).retryable);
    assert.equal(recovered.model, "fallback");
    assert.deepEqual(attempts, ["primary", "fallback"]);
  }

  await assert.rejects(
    runWithModelFallback("primary", "fallback", async (model) => {
      throw providerError(model === "primary" ? 404 : 503);
    }, (error) => classifyAiProviderError(error).retryable),
    (error: unknown) => error instanceof ModelAttemptError && error.model === "fallback" && error.stage === "fallback"
  );
  await assert.rejects(
    runWithModelFallback("primary", "fallback", async () => { throw providerError(401); }, (error) => classifyAiProviderError(error).retryable),
    (error: unknown) => error instanceof ModelAttemptError && error.stage === "primary"
  );
  assert.deepEqual(classifyAiProviderError(providerError(400)), { code: "invalid_request", retryable: false });
  assert.deepEqual(classifyAiProviderError(new Error("request timed out")), { code: "timeout", retryable: true });
  console.log("Chat runtime tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
