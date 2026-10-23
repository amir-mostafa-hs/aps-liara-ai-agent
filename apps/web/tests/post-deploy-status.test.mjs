import test from "node:test";
import assert from "node:assert/strict";
import {
  createPostDeployProgressMessage,
  runPostDeployCheck,
  updateChatMessage,
} from "../src/lib/post-deploy-status.ts";

test("post-deploy progress is a visible Persian assistant message and can be replaced in place", () => {
  const progress = createPostDeployProgressMessage("post-deploy-1", "2026-10-23T14:00:00.000Z");
  assert.equal(progress.role, "assistant");
  assert.match(progress.content, /دپلوی انجام شد/);
  assert.match(progress.content, /در حال بررسی سلامت سایت و لاگ‌های اجرای برنامه هستم/);

  const messages = [progress, { id: "later", role: "assistant", content: "بعدی" }];
  const updated = updateChatMessage(messages, progress.id, {
    content: "🎉 دپلوی انجام شد و برنامه در دسترس است.",
  });

  assert.equal(updated.length, 2);
  assert.equal(updated[0].id, progress.id);
  assert.equal(updated[0].content, "🎉 دپلوی انجام شد و برنامه در دسترس است.");
});

test("the Persian progress message is published before the post-deploy request starts", async () => {
  const events = [];
  const { progressMessage, result } = await runPostDeployCheck(
    "run-42",
    (message) => events.push(["message", message]),
    async (url, options) => {
      events.push(["request", url, options.method]);
      return {
        ok: true,
        json: async () => ({ ok: true, result: { application_health: "healthy" } }),
      };
    },
  );

  assert.equal(events[0][0], "message");
  assert.match(events[0][1].content, /در حال بررسی سلامت سایت/);
  assert.deepEqual(events[1], ["request", "/api/runs/run-42/post-deploy-check", "POST"]);
  assert.equal(progressMessage.id, events[0][1].id);
  assert.equal(result.application_health, "healthy");
});
