import test from "node:test";
import assert from "node:assert/strict";

test("Chat message model maintains valid role, content, and optional widget data", () => {
  const createMessage = (role, content, widget = null) => {
    assert.ok(["user", "assistant", "system"].includes(role), "Invalid role");
    assert.ok(typeof content === "string", "Content must be string");
    return {
      id: "msg-" + Math.random().toString(36).substring(2, 9),
      role,
      content,
      widget,
      timestamp: new Date().toISOString(),
    };
  };

  const userMsg = createMessage("user", "پروژه من یک وب‌سایت Node.js است");
  assert.equal(userMsg.role, "user");
  assert.equal(userMsg.content, "پروژه من یک وب‌سایت Node.js است");
  assert.equal(userMsg.widget, null);

  const agentMsg = createMessage("assistant", "پروژه شناسایی شد. نیاز به دیتابیس دارد.", {
    type: "plan_selector",
    plans: [{ id: "g1", name: "پلن پایه" }],
  });
  assert.equal(agentMsg.role, "assistant");
  assert.ok(agentMsg.widget);
  assert.equal(agentMsg.widget.type, "plan_selector");

  const appSelectorMsg = createMessage("assistant", "لطفاً سرویس مقصد در لیارا را تعیین کنید.", {
    type: "app_target_selector",
    data: { suggestedAppName: "nodejs-demo", detectedPlatform: "node" },
  });
  assert.equal(appSelectorMsg.widget.type, "app_target_selector");
  assert.equal(appSelectorMsg.widget.data.suggestedAppName, "nodejs-demo");
});

test("Sidecar console state transitions correctly between terminal, services, health, and settings tabs", () => {
  const initialSidecarState = {
    activeTab: "terminal", // terminal | services | health | settings
    isCollapsed: false,
    terminalLines: ["[AGENT] آماده دریافت دستورات..."],
  };

  const setTab = (state, tab) => {
    assert.ok(["terminal", "services", "health", "settings"].includes(tab));
    return { ...state, activeTab: tab };
  };

  const toggleCollapsed = (state) => ({
    ...state,
    isCollapsed: !state.isCollapsed,
  });

  const state1 = setTab(initialSidecarState, "services");
  assert.equal(state1.activeTab, "services");

  const stateSettings = setTab(state1, "settings");
  assert.equal(stateSettings.activeTab, "settings");

  const state2 = toggleCollapsed(stateSettings);
  assert.equal(state2.isCollapsed, true);

  const state3 = toggleCollapsed(state2);
  assert.equal(state3.isCollapsed, false);
});

test("Sidecar health mapping correctly reflects database and engine disconnections", () => {
  const evaluateHealthDisplay = (systemHealth) => {
    const dbStatus = systemHealth.database
      ? { text: "متصل", isError: false }
      : { text: "قطع ارتباط / خطای پایگاه‌داده", isError: true };
    const engineStatus = systemHealth.engine
      ? { text: "متصل", isError: false }
      : { text: "قطع ارتباط با موتور", isError: true };
    return {
      allHealthy: systemHealth.database && systemHealth.engine,
      dbStatus,
      engineStatus,
    };
  };

  const healthy = evaluateHealthDisplay({ database: true, engine: true });
  assert.equal(healthy.allHealthy, true);
  assert.equal(healthy.dbStatus.isError, false);
  assert.equal(healthy.engineStatus.isError, false);

  const dbDown = evaluateHealthDisplay({ database: false, engine: true });
  assert.equal(dbDown.allHealthy, false);
  assert.equal(dbDown.dbStatus.isError, true);
  assert.equal(dbDown.dbStatus.text, "قطع ارتباط / خطای پایگاه‌داده");
  assert.equal(dbDown.engineStatus.isError, false);

  const engineDown = evaluateHealthDisplay({ database: true, engine: false });
  assert.equal(engineDown.allHealthy, false);
  assert.equal(engineDown.engineStatus.isError, true);
  assert.equal(engineDown.engineStatus.text, "قطع ارتباط با موتور");
});

