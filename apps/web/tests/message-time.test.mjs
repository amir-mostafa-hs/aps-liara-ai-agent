import test from "node:test";
import assert from "node:assert/strict";
import { formatMessageTime } from "../src/lib/message-time.ts";

test("formatMessageTime returns no label for absent or invalid timestamps", () => {
  assert.equal(formatMessageTime(undefined), null);
  assert.equal(formatMessageTime("not-a-date"), null);
});

test("formatMessageTime localizes a valid timestamp for Persian users", () => {
  assert.equal(formatMessageTime("2026-10-23T16:30:00.000Z"), "۲۰:۰۰");
});
