import test from "node:test";
import assert from "node:assert/strict";
import { allEnvironmentQuestionsAnswered, environmentApprovalDigest, getEnvironmentQuestions, isEnvironmentApprovalValid, writeApprovedEnvironment } from "../src/lib/env-preflight.ts";

const requirements = [
  { name: "PORT", evidence: [".env.example"], required: false, sensitive: false, value_source: "platform_provided", example_is_placeholder: false },
  { name: "DATABASE_URL", evidence: ["database dependency"], required: true, sensitive: true, value_source: "liara_service", example_is_placeholder: false },
  { name: "SERVICE_SECRET", evidence: [".env.example", "server.js"], required: true, sensitive: true, value_source: "generated_secret", example_is_placeholder: true },
  { name: "PAYMENT_API_KEY", evidence: ["server.js"], required: true, sensitive: true, value_source: "external_credential", example_is_placeholder: true },
  { name: "CUSTOM_ENDPOINT", evidence: ["server.js"], required: true, sensitive: false, value_source: "unresolved", example_is_placeholder: false },
];

test("env preflight asks for unresolved values, while platform and verified service values need no input", () => {
  const questions = getEnvironmentQuestions(requirements, { DATABASE_URL: "postgres://private" });

  assert.deepEqual(questions.map(({ name, resolution }) => [name, resolution]), [
    ["SERVICE_SECRET", "choose_secret_source"],
    ["PAYMENT_API_KEY", "user_input"],
    ["CUSTOM_ENDPOINT", "unresolved"],
  ]);
  assert.equal(JSON.stringify(questions).includes("postgres://private"), false);
});

test("generated application secret requires a source choice and a value before cloud write", () => {
  const questions = getEnvironmentQuestions([requirements[2]], {});

  assert.equal(allEnvironmentQuestionsAnswered(questions, { SERVICE_SECRET: "random-value" }, {}), false);
  assert.equal(allEnvironmentQuestionsAnswered(questions, { SERVICE_SECRET: "random-value" }, { SERVICE_SECRET: "generated" }), true);
  assert.equal(allEnvironmentQuestionsAnswered(questions, { SERVICE_SECRET: "   " }, { SERVICE_SECRET: "manual" }), false);
  assert.equal(allEnvironmentQuestionsAnswered(questions, { SERVICE_SECRET: "entered-by-user" }, { SERVICE_SECRET: "manual" }), true);
  assert.equal(questions[0].example_is_placeholder, true);
  assert.equal(allEnvironmentQuestionsAnswered(questions, {}, {}), false);
});

test("external credentials cannot be treated as complete before the user enters a value", () => {
  const questions = getEnvironmentQuestions([requirements[3]], {});
  assert.equal(allEnvironmentQuestionsAnswered(questions, {}, {}), false);
  assert.equal(allEnvironmentQuestionsAnswered(questions, { PAYMENT_API_KEY: "provider-key" }, {}), true);
});

test("approved environment write waits for provider confirmation and returns names only", async () => {
  const secret = "secret-that-must-not-return";
  let requestBody;
  let continuedWith;
  const result = await writeApprovedEnvironment("simple-app", { SERVICE_SECRET: secret }, async (url, options) => {
    assert.equal(url, "/api/liara/env/set");
    requestBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ ok: true, variables_set: ["SERVICE_SECRET"], output: secret }) };
  }, (names) => { continuedWith = names; });

  assert.equal(requestBody.appName, "simple-app");
  assert.deepEqual(requestBody.envVars, { SERVICE_SECRET: secret });
  assert.deepEqual(requestBody.approval, {
    confirmed: true,
    appName: "simple-app",
    digest: await environmentApprovalDigest("simple-app", { SERVICE_SECRET: secret }),
  });
  assert.deepEqual(result, { ok: true, variablesSet: ["SERVICE_SECRET"] });
  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.deepEqual(continuedWith, ["SERVICE_SECRET"]);
});

test("environment approval digest binds the exact app and values", async () => {
  const values = { SERVICE_SECRET: "private", API_URL: "https://example.test" };
  const digest = await environmentApprovalDigest("simple-app", values);
  assert.equal(digest, await environmentApprovalDigest("simple-app", { API_URL: values.API_URL, SERVICE_SECRET: values.SERVICE_SECRET }));
  assert.notEqual(digest, await environmentApprovalDigest("other-app", values));
  assert.notEqual(digest, await environmentApprovalDigest("simple-app", { ...values, SERVICE_SECRET: "changed" }));
  assert.equal(digest.includes("private"), false);
  const approval = { confirmed: true, appName: "simple-app", digest };
  assert.equal(await isEnvironmentApprovalValid("simple-app", values, approval), true);
  assert.equal(await isEnvironmentApprovalValid("other-app", values, approval), false);
  assert.equal(await isEnvironmentApprovalValid("simple-app", { ...values, SERVICE_SECRET: "changed" }, approval), false);
  assert.equal(await isEnvironmentApprovalValid("simple-app", values, { ...approval, confirmed: false }), false);
});

test("failed provider write cannot authorize deployment continuation or leak the secret", async () => {
  const secret = "private-secret-from-user";
  let continued = false;
  try {
    await writeApprovedEnvironment("simple-app", { SERVICE_SECRET: secret }, async () => ({
      ok: false,
      json: async () => ({ ok: false, error: secret }),
    }), (names) => {
      continued = true;
      assert.deepEqual(names, ["SERVICE_SECRET"]);
    });
  } catch (error) {
    assert.equal(error.message.includes(secret), false);
  }
  assert.equal(continued, false);
});
