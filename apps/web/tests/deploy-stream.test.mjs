import test from "node:test";
import assert from "node:assert/strict";
import { createDeployStreamParser } from "../src/lib/deploy-stream.ts";

test("deployment success requires an explicit successful completion event", () => {
  const logs = [];
  const parser = createDeployStreamParser((line) => logs.push(line));
  parser.push('data: {"text":"Release created successfully"}\n\n');
  parser.push('data: {"event":"completed","ok":false,"provider_status":"failed"}\n\n');

  const result = parser.finish();
  assert.equal(result.succeeded, false);
  assert.match(result.logs, /Release created successfully/);
  assert.deepEqual(logs, ["Release created successfully"]);
});

test("deployment stream parser handles frames split across network chunks", () => {
  const chunks = [];
  const parser = createDeployStreamParser((line) => chunks.push(line));
  parser.push('data: {"text":"Build finished"}\n');
  parser.push('\ndata: {"event":"completed","ok":true,"provider_status":"success"}\n\n');

  const result = parser.finish();
  assert.equal(result.succeeded, true);
  assert.equal(result.logs, "Build finished");
  assert.deepEqual(chunks, ["Build finished"]);
});

test("missing completion event cannot be reported as a successful deployment", () => {
  const parser = createDeployStreamParser(() => {});
  parser.push('data: {"text":"Deployment finished successfully"}\n\n');

  assert.equal(parser.finish().succeeded, false);
});
