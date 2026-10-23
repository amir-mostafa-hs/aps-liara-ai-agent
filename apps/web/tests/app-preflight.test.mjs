import test from "node:test";
import assert from "node:assert/strict";
import { checkAppNameAvailability, formatPlanPrice, loadAppPlans, recommendAppPlan } from "../src/lib/app-preflight.ts";

test("new-service preflight shows provider plans and checks the name in Liara inventory", async () => {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(String(url));
    if (String(url) === "/api/liara/app-plans") {
      return { ok: true, json: async () => ({ ok: true, plans: [
        { plan_id: "app-small", name_fa: "پلن کوچک", ram: "1 GB", cpu: "0.5 هسته", disk: "10 GB", price_monthly: null, is_recommended: true },
      ] }) };
    }
    return { ok: true, json: async () => ({ ok: true, available: true }) };
  };

  const plans = await loadAppPlans(fetcher);
  const availability = await checkAppNameAvailability("simple-app", fetcher);

  assert.equal(plans.ok, true);
  assert.equal(plans.plans[0].plan_id, "app-small");
  assert.equal(availability.available, true);
  assert.deepEqual(calls, ["/api/liara/app-plans", "/api/liara/projects/availability?name=simple-app"]);
});

test("new-service preflight blocks creation and gives Persian guidance when provider data is unavailable", async () => {
  const result = await loadAppPlans(async () => ({
    ok: false,
    json: async () => ({ ok: false, error: "provider failure fake-liara-token" }),
  }));

  assert.equal(result.ok, false);
  assert.match(result.error, /دریافت پلن‌های معتبر از لیارا ممکن نشد/);
  assert.doesNotMatch(result.error, /fake-liara-token/);
});

test("new-service preflight explains a name conflict in Persian", async () => {
  const result = await checkAppNameAvailability("simple-app", async () => ({
    ok: true,
    json: async () => ({ ok: true, available: false, reason: "already_exists" }),
  }));

  assert.equal(result.available, false);
  assert.match(result.message, /این نام قبلاً در حساب یا تیم انتخاب‌شده استفاده شده است/);
});

test("plan cards do not invent a price when Liara omits pricing data", () => {
  assert.equal(formatPlanPrice(null), "قیمت توسط لیارا اعلام نشده");
  assert.equal(formatPlanPrice(120000), "۱۲۰٬۰۰۰ تومان/ماه");
});

test("plan recommendation reflects inspected project platform and database requirements", () => {
  const plans = [
    { plan_id: "tiny", name_fa: "کمینه", ram: "512 MB", cpu: "0.25", disk: "5 GB", price_monthly: 50000, is_recommended: false },
    { plan_id: "small", name_fa: "کوچک", ram: "1 GB", cpu: "0.5", disk: "10 GB", price_monthly: 90000, is_recommended: false },
    { plan_id: "medium", name_fa: "متوسط", ram: "2 GB", cpu: "1", disk: "20 GB", price_monthly: 150000, is_recommended: false },
  ];

  const simpleNode = recommendAppPlan(plans, { platform: "node", databaseCount: 0 });
  const databaseBacked = recommendAppPlan(plans, { platform: "python", databaseCount: 1 });

  assert.equal(simpleNode.plan.plan_id, "tiny");
  assert.match(simpleNode.reason, /node/i);
  assert.equal(databaseBacked.plan.plan_id, "small");
  assert.match(databaseBacked.reason, /پایگاه‌داده/);
});
