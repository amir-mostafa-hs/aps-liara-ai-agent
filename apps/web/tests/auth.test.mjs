import test from "node:test";
import assert from "node:assert/strict";
import { maskToken, createSessionToken, verifySessionToken } from "../src/lib/session.ts";

test("maskToken masks secret strings properly", () => {
  assert.equal(maskToken(""), "");
  assert.equal(maskToken(null), "");
  assert.equal(maskToken("123"), "••••");
  assert.equal(maskToken("my-super-secret-token-abcdef"), "••••••••cdef");
  assert.ok(!maskToken("my-super-secret-token-abcdef").includes("secret"));
});

test("createSessionToken produces verifiable signature", () => {
  process.env.APP_SECRET = "super-secret-key-123";
  const token = createSessionToken("admin");
  const verified = verifySessionToken(token);

  assert.equal(verified.valid, true);
  assert.equal(verified.username, "admin");
});

test("verifySessionToken rejects tampered signature", () => {
  process.env.APP_SECRET = "super-secret-key-123";
  const token = createSessionToken("admin");
  const tampered = token + "xyz";

  const verified = verifySessionToken(tampered);
  assert.equal(verified.valid, false);
});

