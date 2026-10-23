import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

test("Next.js project create proxy forwards request with X-Internal-Secret", async () => {
  const secret = "mock-internal-secret-projects";
  let receivedHeader = "";
  let receivedBody = "";

  const server = http.createServer((req, res) => {
    receivedHeader = req.headers["x-internal-secret"] || "";
    req.on("data", (chunk) => {
      receivedBody += chunk.toString();
    });
    req.on("end", () => {
      if (receivedHeader === secret) {
        const parsed = JSON.parse(receivedBody);
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            project_id: parsed.project_id,
            platform: parsed.platform,
            plan_id: parsed.plan_id,
            endpoint: `https://${parsed.project_id}.liara.run`,
            status: "created",
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

    const res = await fetch(`http://127.0.0.1:${port}/liara/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
      },
      body: JSON.stringify({
        project_id: "test-new-app",
        platform: "node",
        plan_id: "ir-standard-1",
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.project_id, "test-new-app");
    assert.equal(data.endpoint, "https://test-new-app.liara.run");
    assert.equal(receivedHeader, secret);

    const parsedReceived = JSON.parse(receivedBody);
    assert.equal(parsedReceived.project_id, "test-new-app");
    assert.equal(parsedReceived.platform, "node");
    assert.equal(parsedReceived.plan_id, "ir-standard-1");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

