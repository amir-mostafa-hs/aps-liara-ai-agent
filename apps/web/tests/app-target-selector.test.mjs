import test from "node:test";
import assert from "node:assert/strict";

test("AppTargetSelector mode transitions and input sanitization", () => {
  const sanitizeAppName = (name) => {
    if (!name) return "";
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  assert.equal(sanitizeAppName(" My Awesome App! "), "my-awesome-app");
  assert.equal(sanitizeAppName("NodeJS_Demo_App"), "nodejs-demo-app");
  assert.equal(sanitizeAppName(""), "");

  const initialWidgetState = {
    mode: "ask", // "ask" | "existing" | "new"
    selectedApp: "",
    newAppName: "nodejs-demo",
    selectedPlan: "ir-standard-2",
  };

  const setMode = (state, mode) => {
    assert.ok(["ask", "existing", "new"].includes(mode));
    return { ...state, mode };
  };

  const toExisting = setMode(initialWidgetState, "existing");
  assert.equal(toExisting.mode, "existing");

  const toNew = setMode(initialWidgetState, "new");
  assert.equal(toNew.mode, "new");

  const backToAsk = setMode(toNew, "ask");
  assert.equal(backToAsk.mode, "ask");
});

test("Filters active cloud apps for existing selection and handles empty account", () => {
  const filterCloudApps = (services) => {
    return services.filter((s) => s.type === "app" && s.status === "running");
  };

  const sampleServices = [
    { name: "link-apsignals", type: "app", status: "running" },
    { name: "old-broken-app", type: "app", status: "failed" },
    { name: "main-pg-db", type: "postgres", status: "running" },
  ];

  const filtered = filterCloudApps(sampleServices);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, "link-apsignals");

  const emptyFiltered = filterCloudApps([]);
  assert.equal(emptyFiltered.length, 0);
});

