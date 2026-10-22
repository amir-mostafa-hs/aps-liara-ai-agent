import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

test("Next.js config diff proxy forwards request with X-Internal-Secret", async () => {
  const secret = "mock-internal-secret-999";
  let receivedHeader = "";

  const server = http.createServer((req, res) => {
    receivedHeader = req.headers["x-internal-secret"] || "";
    if (receivedHeader === secret) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          files: {
            "liara.json": {
              exists: false,
              diff: "+++ b/liara.json\n+  \"platform\": \"node\"",
              new_content: '{"platform": "node"}',
            },
          },
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

    const res = await fetch(`http://127.0.0.1:${port}/agent/config/diff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
      },
      body: JSON.stringify({
        source_path: "/sample-app",
        app_name: "test-app",
        platform: "nodejs",
        port: 3000,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(Boolean(data.files["liara.json"]), true);
    assert.equal(receivedHeader, secret);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Next.js config apply proxy forwards request with X-Internal-Secret", async () => {
  const secret = "mock-internal-secret-999";
  let receivedHeader = "";

  const server = http.createServer((req, res) => {
    receivedHeader = req.headers["x-internal-secret"] || "";
    if (receivedHeader === secret) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          modified_files: ["liara.json", ".env"],
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

    const res = await fetch(`http://127.0.0.1:${port}/agent/config/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
      },
      body: JSON.stringify({
        source_path: "/sample-app",
        app_name: "test-app",
        platform: "nodejs",
        port: 3000,
        apply_liara_json: true,
        apply_local_env: true,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.deepEqual(data.modified_files, ["liara.json", ".env"]);
    assert.equal(receivedHeader, secret);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Next.js cloud env set proxy forwards request with X-Internal-Secret", async () => {
  const secret = "mock-internal-secret-999";
  let receivedHeader = "";

  const server = http.createServer((req, res) => {
    receivedHeader = req.headers["x-internal-secret"] || "";
    if (receivedHeader === secret) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          app_name: "test-app",
          variables_set: ["DATABASE_URL"],
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

    const res = await fetch(`http://127.0.0.1:${port}/agent/cloud/env/set`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
      },
      body: JSON.stringify({
        app_name: "test-app",
        env_vars: { DATABASE_URL: "postgres://localhost:5432/db" },
        api_token: "mock-token",
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.app_name, "test-app");
    assert.equal(receivedHeader, secret);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
