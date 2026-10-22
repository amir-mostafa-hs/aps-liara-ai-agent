import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

test("Next.js deploy SSE proxy forwards request with X-Internal-Secret and streams events", async () => {
  const secret = "mock-internal-secret-888";
  let receivedHeader = "";
  let receivedBody = "";

  const server = http.createServer((req, res) => {
    receivedHeader = req.headers["x-internal-secret"] || "";
    req.on("data", (chunk) => {
      receivedBody += chunk.toString();
    });
    req.on("end", () => {
      if (receivedHeader === secret) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        res.write('data: {"text": "Initiating deployment...\\n"}\n\n');
        res.write('data: {"text": "Building image...\\n"}\n\n');
        res.write('data: {"text": "Release deployed successfully.\\n"}\n\n');
        res.end();
      } else {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ detail: "Forbidden" }));
      }
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/agent/deploy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
      },
      body: JSON.stringify({
        source_path: "/sample-app",
        plan: { target_app: "test-app", platform: "nodejs", port: 3000 },
      }),
    });

    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") || "", /text\/event-stream/);
    const bodyText = await res.text();
    assert.match(bodyText, /Initiating deployment/);
    assert.match(bodyText, /Release deployed successfully/);
    assert.equal(receivedHeader, secret);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
