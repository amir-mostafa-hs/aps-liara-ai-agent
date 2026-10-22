import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverScript = path.join(__dirname, "server.js");

test("server exits with code 1 when SERVICE_SECRET is missing", async () => {
  const child = spawn("node", [serverScript], {
    env: { ...process.env, SERVICE_SECRET: "" },
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise((resolve) => {
    child.on("close", resolve);
  });

  assert.equal(exitCode, 1);
  assert.ok(stderr.includes("Missing required environment variable: SERVICE_SECRET"));
});

test("server starts successfully when SERVICE_SECRET is provided", async () => {
  const testPort = 43210;
  const child = spawn("node", [serverScript], {
    env: {
      ...process.env,
      PORT: String(testPort),
      SERVICE_SECRET: "mock-valid-secret",
    },
  });

  try {
    // Wait for server to bind
    await new Promise((resolve) => setTimeout(resolve, 500));

    const res = await fetch(`http://127.0.0.1:${testPort}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "healthy");
    assert.equal(data.app, "liara-node-demo");
  } finally {
    child.kill("SIGTERM");
  }
});

