import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { checkEngineHealth } from "../src/lib/agent-client.ts";

test("checkEngineHealth returns unreachable error when server is not running", async () => {
  process.env.ENGINE_URL = "http://127.0.0.1:59999"; // Non-existent port
  process.env.INTERNAL_AGENT_SECRET = "test-secret";

  const result = await checkEngineHealth();
  assert.equal(result.ok, false);
  assert.ok(result.error?.includes("Could not connect"));
});

test("checkEngineHealth sends X-Internal-Secret and succeeds when server accepts it", async () => {
  const secret = "correct-mock-secret-123";
  let receivedHeader = "";

  const server = http.createServer((req, res) => {
    receivedHeader = req.headers["x-internal-secret"] || "";
    if (receivedHeader === secret) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy", service: "liara-agent-engine", version: "0.1.0" }));
    } else {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ detail: "Forbidden" }));
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    process.env.ENGINE_URL = `http://127.0.0.1:${port}`;
    process.env.INTERNAL_AGENT_SECRET = secret;

    const result = await checkEngineHealth();
    assert.equal(result.ok, true);
    assert.equal(result.statusCode, 200);
    assert.equal(result.data?.status, "healthy");
    assert.equal(result.data?.service, "liara-agent-engine");
    assert.equal(receivedHeader, secret);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("checkEngineHealth reports 403 when X-Internal-Secret is rejected", async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ detail: "Forbidden: Invalid or missing internal secret" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    process.env.ENGINE_URL = `http://127.0.0.1:${port}`;
    process.env.INTERNAL_AGENT_SECRET = "wrong-secret";

    const result = await checkEngineHealth();
    assert.equal(result.ok, false);
    assert.equal(result.statusCode, 403);
    assert.ok(result.error?.includes("403"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

