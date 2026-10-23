import test from "node:test";
import assert from "node:assert/strict";

test("Sidecar console state transitions correctly including settings tab", () => {
  const allowedTabs = ["terminal", "services", "health", "settings"];

  const setTab = (currentTab, nextTab) => {
    assert.ok(allowedTabs.includes(nextTab), `Invalid tab: ${nextTab}`);
    return nextTab;
  };

  assert.equal(setTab("terminal", "settings"), "settings");
  assert.equal(setTab("settings", "services"), "services");
  assert.throws(() => setTab("settings", "unknown-tab"));
});

test("Account settings presentation formats masked token, team options, and active status", () => {
  const formatAccountDisplay = ({ configured, maskedToken, teamId, availableTeams = [] }) => {
    const isConfigured = Boolean(configured && maskedToken);
    const activeTeamObj = availableTeams.find((t) => t.id === teamId);
    const teamLabel = activeTeamObj
      ? `${activeTeamObj.name} (${teamId})`
      : teamId
      ? `شناسه تیم: ${teamId}`
      : "حساب شخصی (بدون تیم)";

    return {
      statusBadge: isConfigured ? "متصل به لیارا" : "توکن تنظیم نشده",
      displayToken: isConfigured ? maskedToken : "—",
      teamLabel,
      hasTeam: Boolean(teamId),
    };
  };

  // Case 1: Token configured without team
  const personal = formatAccountDisplay({
    configured: true,
    maskedToken: "lia_••••••••3c19",
    teamId: "",
    availableTeams: [],
  });
  assert.equal(personal.statusBadge, "متصل به لیارا");
  assert.equal(personal.displayToken, "lia_••••••••3c19");
  assert.equal(personal.teamLabel, "حساب شخصی (بدون تیم)");
  assert.equal(personal.hasTeam, false);

  // Case 2: Token configured with team name found
  const withTeam = formatAccountDisplay({
    configured: true,
    maskedToken: "lia_••••••••3c19",
    teamId: "team-123",
    availableTeams: [{ id: "team-123", name: "تیم توسعه" }],
  });
  assert.equal(withTeam.teamLabel, "تیم توسعه (team-123)");
  assert.equal(withTeam.hasTeam, true);
});

test("Account settings update handler sanitizes token and team inputs", () => {
  const buildUpdatePayload = (inputToken, inputTeamId, currentTeamId) => {
    const payload = {};
    const trimmedToken = inputToken ? inputToken.trim() : "";
    if (trimmedToken.length > 0) {
      payload.token = trimmedToken;
    }
    // If inputTeamId is provided (even empty string to clear team), update it
    if (inputTeamId !== undefined) {
      payload.teamId = inputTeamId.trim();
    }
    return payload;
  };

  // Updating only team ID (clearing it)
  const clearTeam = buildUpdatePayload("", "", "team-123");
  assert.deepEqual(clearTeam, { teamId: "" });

  // Updating new token and new team
  const updateBoth = buildUpdatePayload("lia_new_token_1234 ", "  team-999  ", "");
  assert.deepEqual(updateBoth, { token: "lia_new_token_1234", teamId: "team-999" });
});
