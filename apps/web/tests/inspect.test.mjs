import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

test("Next.js inspect proxy forwards request with X-Internal-Secret", async () => {
  const secret = "mock-internal-secret-999";
  let receivedHeader = "";
  let receivedBody = "";

  const server = http.createServer((req, res) => {
    receivedHeader = req.headers["x-internal-secret"] || "";
    req.on("data", (chunk) => {
      receivedBody += chunk.toString();
    });
    req.on("end", () => {
      if (receivedHeader === secret) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            analysis: {
              detected_platform: "nodejs",
              confidence: 0.95,
              start_command: "node server.js",
              port: 3000,
              evidence_files: ["package.json"],
              required_env_names: ["SERVICE_SECRET"],
            },
          })
        );
      } else {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ detail: "Forbidden" }));
      }
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    process.env.ENGINE_URL = `http://127.0.0.1:${port}`;
    process.env.INTERNAL_AGENT_SECRET = secret;

    const res = await fetch(`http://127.0.0.1:${port}/agent/inspect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
      },
      body: JSON.stringify({ path: "/sample-app" }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.analysis.detected_platform, "nodejs");
    assert.equal(receivedHeader, secret);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

