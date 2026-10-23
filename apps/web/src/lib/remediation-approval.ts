export interface ApprovedEnvRemediation {
  action_id: string;
  operation: "set_env";
  target: string;
  env_variable: string;
  env_value: string;
  description: string;
  requires_approval: true;
}

export interface EnvRemediationInput {
  approved: boolean;
  targetApp: string;
  missingVariable: string;
  envValue: string;
  valueSource: "manual" | "generated";
}

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SENSITIVE_NAME = /(secret|password|token|api[_-]?key|credential|private[_-]?key)/i;
const EXTERNAL_CREDENTIAL = /(api[_-]?key|access[_-]?token|client[_-]?secret|credential|stripe|openai|github)/i;
const GENERATABLE_APP_SECRET = /(^|_)(service_secret|session_secret|jwt_secret|encryption_secret|password)($|_)/i;

export function isSensitiveEnvName(name: string): boolean {
  return SENSITIVE_NAME.test(name);
}

export function isRunOwnedByUser(
  runUserId: string | null | undefined,
  userId: string | null | undefined,
): boolean {
  return Boolean(runUserId && userId && runUserId === userId);
}

export function canGenerateSecretForEnvName(name: string): boolean {
  return GENERATABLE_APP_SECRET.test(name) && !EXTERNAL_CREDENTIAL.test(name);
}

export function createApprovedEnvRemediation(
  input: EnvRemediationInput,
  createActionId: () => string = () => globalThis.crypto.randomUUID(),
): ApprovedEnvRemediation {
  if (input.approved !== true) throw new Error("برای اعمال تغییر، تأیید صریح شما لازم است.");
  const target = input.targetApp.trim();
  if (!target) throw new Error("سرویس مقصد برای اعمال راهکار مشخص نیست.");
  const variable = input.missingVariable.trim();
  if (!ENV_NAME.test(variable)) throw new Error("نام متغیر محیطی تشخیص‌داده‌شده معتبر نیست.");
  const value = input.envValue.trim();
  if (!value) throw new Error("برای ادامه، مقدار متغیر محیطی را وارد کنید یا secret بسازید.");
  if (input.valueSource === "generated" && !canGenerateSecretForEnvName(variable)) {
    throw new Error("برای این متغیر نمی‌توان مقدار را خودکار ساخت؛ باید مقدار را از سرویس مربوطه دریافت و دستی وارد کنید.");
  }

  return {
    action_id: createActionId(),
    operation: "set_env",
    target,
    env_variable: variable,
    env_value: value,
    description: `ثبت مقدار تأییدشده برای ${variable} روی سرویس ${target}`,
    requires_approval: true,
  };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function remediationDigest(
  diagnosisId: string,
  action: ApprovedEnvRemediation,
): Promise<string> {
  const canonical = stableJson({ diagnosis_id: diagnosisId, remediation: action });
  const bytes = new TextEncoder().encode(canonical);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
