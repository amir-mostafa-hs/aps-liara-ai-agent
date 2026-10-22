import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

test("Next.js test-connection proxy forwards team_id to Python engine", async () => {
  const secret = "test-internal-secret-999";
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
            app_count: 1,
            apps: [{ project_id: "aps-test", type: "node", status: "ACTIVE" }],
            team_id: "6ace4ec3ec13fe0c3c19c4db",
            teams: [{ id: "6ace4ec3ec13fe0c3c19c4db", name: "لیارا" }],
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
    const res = await fetch(`http://127.0.0.1:${port}/liara/test-connection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
      },
      body: JSON.stringify({
        api_token: "mock-token",
        team_id: "6ace4ec3ec13fe0c3c19c4db",
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.team_id, "6ace4ec3ec13fe0c3c19c4db");
    assert.equal(data.apps[0].project_id, "aps-test");

    const parsedReceived = JSON.parse(receivedBody);
    assert.equal(parsedReceived.team_id, "6ace4ec3ec13fe0c3c19c4db");
    assert.equal(parsedReceived.api_token, "mock-token");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
