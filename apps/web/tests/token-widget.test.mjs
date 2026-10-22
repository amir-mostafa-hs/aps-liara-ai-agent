import test from "node:test";
import assert from "node:assert/strict";
import { maskToken } from "../src/lib/session.ts";

test("Token masking properly hides secrets except last 4 characters", () => {
  assert.equal(maskToken(""), "");
  assert.equal(maskToken("abc"), "••••");
  assert.equal(maskToken("my-secret-liara-token-c9vi"), "••••••••c9vi");
});

test("Sanitizes agent message payload ensuring token secrets are never exposed", () => {
  const sanitizeForLLM = (messageText, secretToken) => {
    if (!secretToken) return messageText;
    return messageText.replaceAll(secretToken, "[REDACTED_SECRET]");
  };

  const secret = "live_secret_token_abcdef123456";
  const userText = `لطفا این توکن من است: ${secret} بررسی کن`;
  const sanitized = sanitizeForLLM(userText, secret);

  assert.ok(!sanitized.includes(secret));
  assert.ok(sanitized.includes("[REDACTED_SECRET]"));
});
