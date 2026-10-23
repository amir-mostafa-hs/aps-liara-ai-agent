import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

test("Next.js SRE diagnose proxy forwards logs with X-Internal-Secret and returns diagnosis", async () => {
  const secret = "mock-internal-secret-666";
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
            diagnosis: {
              diagnosis_id: "diag-1",
              root_cause: "Missing SERVICE_SECRET environment variable",
              error_evidence: "[FATAL] Missing required environment variable: SERVICE_SECRET",
              missing_variable: "SERVICE_SECRET",
              remediation: {
                action_id: "rem-1",
                operation: "set_env",
                target: "demo-app",
                env_variable: "SERVICE_SECRET",
                env_value: "recovery-key-123",
                description: "Set SERVICE_SECRET",
                requires_approval: true,
              },
              digest: "mock-digest-64",
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
    const res = await fetch(`http://127.0.0.1:${port}/agent/diagnose`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
      },
      body: JSON.stringify({
        app_id: "demo-app",
        logs: "FATAL Missing SERVICE_SECRET",
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.diagnosis.missing_variable, "SERVICE_SECRET");
    assert.equal(data.diagnosis.remediation.operation, "set_env");
    assert.equal(receivedHeader, secret);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

