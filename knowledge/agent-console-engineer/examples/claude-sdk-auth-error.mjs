// Worked example: call the REAL Claude API with the official SDK and a deliberately invalid key,
// to prove the endpoint, headers and typed error handling. Costs nothing (request is rejected).
// Run: node claude-sdk-auth-error.mjs
import Anthropic from "@anthropic-ai/sdk";
import assert from "node:assert/strict";

const client = new Anthropic({ apiKey: "sk-ant-invalid-demo-key", maxRetries: 0, timeout: 20_000 });
try {
  await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16,
    messages: [{ role: "user", content: "ping" }],
  });
  throw new Error("expected an authentication error");
} catch (err) {
  // Most specific first: AuthenticationError (401) → RateLimitError (429) → APIError → connection errors
  if (err instanceof Anthropic.AuthenticationError) {
    assert.equal(err.status, 401);
    console.log(`status=${err.status} type=${err.error?.error?.type} request-id=${err.requestID ? "present" : "absent"}`);
    console.log("OK: real API reached; invalid key rejected with typed AuthenticationError (401)");
  } else if (err instanceof Anthropic.APIConnectionError) {
    console.log("SKIP: no network route to api.anthropic.com from this machine");
  } else {
    throw err;
  }
}
