import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

test("Next.js liara services route proxies request to engine with internal secret", async () => {
  const secret = "mock-secret-services-test";
  let receivedHeader = "";
  let receivedUrl = "";

  const mockServices = [
    { name: "test-app", type: "app", status: "running", endpoint: "https://test-app.liara.run" },
    { name: "test-pg", type: "postgres", status: "running", endpoint: "test-pg:5432", port: 5432 },
  ];

  const server = http.createServer((req, res) => {
    receivedHeader = req.headers["x-internal-secret"] || "";
    receivedUrl = req.url || "";
    if (receivedHeader === secret) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          services: mockServices,
          count: 2,
        })
      );
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
    process.env.LIARA_API_TOKEN = "mock-token-abc-123";

    const res = await fetch(`http://127.0.0.1:${port}/liara/services?api_token=mock-token-abc-123`, {
      method: "GET",
      headers: {
        "X-Internal-Secret": secret,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(receivedHeader, secret);
    assert.ok(receivedUrl.includes("api_token=mock-token-abc-123"));

    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.services.length, 2);
    assert.equal(data.services[0].name, "test-app");
    assert.equal(data.services[1].name, "test-pg");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
