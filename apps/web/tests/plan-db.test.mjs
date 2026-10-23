import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

test("Next.js plans proxy forwards request with X-Internal-Secret", async () => {
  const secret = "mock-internal-secret-999";
  let receivedHeader = "";

  const server = http.createServer((req, res) => {
    receivedHeader = req.headers["x-internal-secret"] || "";
    if (receivedHeader === secret) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          plans: [
            {
              plan_id: "ir-standard-1",
              name_fa: "اقتصادی",
              ram: "512 MB",
              cpu: "0.25 هسته",
              disk: "10 GB SSD",
              price_monthly: 60000,
              is_recommended: false,
            },
            {
              plan_id: "ir-standard-2",
              name_fa: "استاندارد",
              ram: "1024 MB (1 GB)",
              cpu: "0.5 هسته",
              disk: "20 GB SSD",
              price_monthly: 120000,
              is_recommended: true,
            },
          ],
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

    const res = await fetch(`http://127.0.0.1:${port}/liara/plans`, {
      method: "GET",
      headers: {
        "X-Internal-Secret": secret,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.plans.length, 2);
    assert.equal(data.plans[1].plan_id, "ir-standard-2");
    assert.equal(receivedHeader, secret);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Next.js database create proxy forwards request with X-Internal-Secret", async () => {
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
        const parsed = JSON.parse(receivedBody);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            db_name: parsed.db_name,
            db_type: parsed.db_type,
            plan_id: parsed.plan_id,
            port: 5432,
            internal_host: parsed.db_name,
            suggested_env_vars: {
              DATABASE_URL: `postgres://${parsed.db_name}:5432/master`,
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

    const res = await fetch(`http://127.0.0.1:${port}/agent/database/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
      },
      body: JSON.stringify({
        db_name: "test-app-db",
        db_type: "postgres",
        plan_id: "ir-standard-2",
        api_token: "test-token",
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.db_name, "test-app-db");
    assert.equal(data.port, 5432);
    assert.equal(receivedHeader, secret);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

