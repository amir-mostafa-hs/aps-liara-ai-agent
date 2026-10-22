import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

test("Next.js verify proxy forwards request with X-Internal-Secret and handles health outcome", async () => {
  const secret = "mock-internal-secret-777";
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
            verification: {
              endpoint_url: "https://test-app.liara.run",
              provider_status: "success",
              application_health: "unhealthy",
              http_status_code: 500,
              response_body_snippet: "Missing SERVICE_SECRET",
              ready_for_sre: true,
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
    const res = await fetch(`http://127.0.0.1:${port}/agent/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
      },
      body: JSON.stringify({
        app_id: "test-app",
        provider_status: "success",
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.verification.application_health, "unhealthy");
    assert.equal(data.verification.provider_status, "success");
    assert.equal(data.verification.ready_for_sre, true);
    assert.equal(receivedHeader, secret);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

