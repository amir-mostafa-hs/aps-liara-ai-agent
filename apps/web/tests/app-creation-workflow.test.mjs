import test from "node:test";
import assert from "node:assert/strict";
import { createLiaraApp } from "../src/lib/app-creation-workflow.ts";
import { loadAppPlans, recommendAppPlan } from "../src/lib/app-preflight.ts";

test("new app continues to deployment only after Liara confirms creation", async () => {
  const requests = [];
  const confirmations = [];
  const planResult = await loadAppPlans(async (url) => {
    requests.push({ url: String(url), init: {} });
    return {
      ok: true,
      json: async () => ({ ok: true, plans: [
        { plan_id: "g2-small", name_fa: "پلن کوچک", ram: "1 GB", cpu: "0.5 هسته", disk: "10 GB", price_monthly: 90000, is_recommended: true },
      ] }),
    };
  });
  assert.equal(planResult.ok, true);
  const selectedPlan = recommendAppPlan(planResult.plans, { platform: "node", databaseCount: 0 }).plan;
  assert.equal(selectedPlan.plan_id, "g2-small");
  const fetcher = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (String(url).startsWith("/api/liara/projects/availability")) {
      return { ok: true, json: async () => ({ ok: true, available: true }) };
    }
    return {
      ok: true,
      json: async () => ({ ok: true, project_id: "simple-app", status: "created" }),
    };
  };

  const result = await createLiaraApp(
    { appName: "simple-app", platform: "node", planId: selectedPlan.plan_id, teamId: "team-42", priceMonthly: selectedPlan.price_monthly },
    { fetcher, onConfirmed: (service) => confirmations.push(service) },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(requests.map((request) => request.url), [
    "/api/liara/app-plans",
    "/api/liara/projects/availability?name=simple-app",
    "/api/liara/projects",
  ]);
  assert.deepEqual(JSON.parse(requests[2].init.body), {
    projectId: "simple-app",
    platform: "node",
    planId: "g2-small",
    teamId: "team-42",
    priceMonthly: 90000,
    approval: {
      appName: "simple-app",
      platform: "node",
      planId: "g2-small",
      teamId: "team-42",
      priceMonthly: 90000,
      confirmed: true,
    },
  });
  assert.equal(confirmations.length, 1);
  assert.equal(confirmations[0].status, "created");
});

test("unavailable name prevents creation and deployment continuation", async () => {
  const requests = [];
  let continued = false;
  const result = await createLiaraApp(
    { appName: "simple-app", platform: "node", planId: "g2-small", teamId: null, priceMonthly: null },
    {
      fetcher: async (url) => {
        requests.push(String(url));
        if (String(url) === "/api/liara/services") {
          return { ok: true, json: async () => ({ ok: true, services: [] }) };
        }
        return { ok: true, json: async () => ({ ok: true, available: false, reason: "already_exists" }) };
      },
      onConfirmed: () => { continued = true; },
    },
  );

  assert.equal(result.ok, false);
  assert.match(result.error, /این نام قبلاً در حساب یا تیم انتخاب‌شده/);
  assert.equal(requests.length, 2);
  assert.equal(continued, false);
});

test("unverified or failed creation never proceeds to deployment", async () => {
  let continued = false;
  let createAttempts = 0;
  const result = await createLiaraApp(
    { appName: "simple-app", platform: "node", planId: "g2-small", teamId: null, priceMonthly: null },
    {
      fetcher: async (url) => {
        if (String(url).startsWith("/api/liara/projects/availability")) {
          return { ok: true, json: async () => ({ ok: true, available: true }) };
        }
        createAttempts += 1;
        return { ok: false, json: async () => ({ ok: false, error: "تأیید ساخت سرویس ممکن نشد." }) };
      },
      onConfirmed: () => { continued = true; },
    },
  );

  assert.equal(result.ok, false);
  assert.equal(createAttempts, 1);
  assert.equal(continued, false);
});

test("ambiguous create checks current inventory and offers the found app for explicit reuse", async () => {
  const requests = [];
  let continued = false;
  const result = await createLiaraApp(
    { appName: "simple-app", platform: "node", planId: "g2-small", teamId: "team-42", priceMonthly: 90000 },
    {
      fetcher: async (url) => {
        requests.push(String(url));
        if (String(url).includes("availability")) {
          return { ok: true, json: async () => ({ ok: true, available: true }) };
        }
        if (String(url) === "/api/liara/projects") {
          return { ok: false, status: 502, json: async () => ({ ok: false, reason: "unverified", error: "وضعیت ساخت مشخص نیست." }) };
        }
        return {
          ok: true,
          json: async () => ({ ok: true, services: [{ name: "simple-app", type: "app", status: "created", endpoint: "https://simple-app.liara.run" }] }),
        };
      },
      onConfirmed: () => { continued = true; },
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.recovery?.service.name, "simple-app");
  assert.deepEqual(requests, [
    "/api/liara/projects/availability?name=simple-app",
    "/api/liara/projects",
    "/api/liara/services",
  ]);
  assert.equal(continued, false);
});
