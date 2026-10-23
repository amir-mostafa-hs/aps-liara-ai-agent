export type EnvironmentValueSource =
  | "platform_provided"
  | "liara_service"
  | "external_credential"
  | "generated_secret"
  | "unresolved";

export interface EnvironmentRequirement {
  name: string;
  evidence: string[];
  required: boolean;
  sensitive: boolean;
  value_source: EnvironmentValueSource;
  example_is_placeholder: boolean;
}

export interface EnvironmentQuestion extends EnvironmentRequirement {
  resolution: "user_input" | "choose_secret_source" | "unresolved";
}

export async function environmentApprovalDigest(
  appName: string,
  values: Record<string, string>,
): Promise<string> {
  const canonical = JSON.stringify({
    app_name: appName.trim(),
    env_vars: Object.fromEntries(Object.entries(values).sort(([a], [b]) => a.localeCompare(b))),
  });
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function isEnvironmentApprovalValid(
  appName: string,
  values: Record<string, string>,
  approval: { confirmed?: boolean; appName?: string; digest?: string } | null | undefined,
): Promise<boolean> {
  if (!approval || approval.confirmed !== true || approval.appName !== appName.trim()) return false;
  return approval.digest === await environmentApprovalDigest(appName, values);
}

export function getEnvironmentQuestions(
  requirements: EnvironmentRequirement[],
  serviceValues: Record<string, string>,
): EnvironmentQuestion[] {
  return requirements.flatMap((requirement) => {
    if (!requirement.required || requirement.value_source === "platform_provided") {
      return [];
    }
    if (requirement.value_source === "liara_service" && serviceValues[requirement.name]) {
      return [];
    }

    const resolution = requirement.value_source === "generated_secret"
      ? "choose_secret_source"
      : requirement.value_source === "external_credential"
        ? "user_input"
        : "unresolved";

    return [{ ...requirement, resolution }];
  });
}

export function allEnvironmentQuestionsAnswered(
  questions: EnvironmentQuestion[],
  values: Record<string, string>,
  secretChoices: Record<string, "manual" | "generated">,
): boolean {
  return questions.every((question) => {
    if (question.resolution === "choose_secret_source" && !secretChoices[question.name]) {
      return false;
    }
    return Boolean(values[question.name]?.trim());
  });
}

export async function writeApprovedEnvironment(
  appName: string,
  values: Record<string, string>,
  fetcher: typeof fetch = fetch,
  onConfirmed?: (variableNames: string[]) => void,
): Promise<{ ok: true; variablesSet: string[] }> {
  if (Object.keys(values).length === 0) {
    const result = { ok: true as const, variablesSet: [] };
    onConfirmed?.(result.variablesSet);
    return result;
  }

  let response: Response;
  try {
    const approval = {
      confirmed: true,
      appName: appName.trim(),
      digest: await environmentApprovalDigest(appName, values),
    };
    response = await fetcher("/api/liara/env/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appName, envVars: values, approval }),
    });
  } catch {
    throw new Error("تنظیم متغیرهای محیطی در لیارا تأیید نشد؛ دپلوی تا زمان رفع خطا شروع نخواهد شد.");
  }

  const providerResult = await response.json().catch(() => ({}));
  if (!response.ok || providerResult.ok !== true) {
    throw new Error("تنظیم متغیرهای محیطی در لیارا تأیید نشد؛ دپلوی تا زمان رفع خطا شروع نخواهد شد.");
  }

  const result = { ok: true as const, variablesSet: Object.keys(values) };
  onConfirmed?.(result.variablesSet);
  return result;
}
