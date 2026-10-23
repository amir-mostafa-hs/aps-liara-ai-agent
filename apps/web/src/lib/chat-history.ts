const SENSITIVE_FIELD = /(?:api[_ -]?token|access[_ -]?token|refresh[_ -]?token|secret|password|credential|private[_ -]?key|authorization)/i;

export function redactChatText(value: string): string {
  return value
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+\-/]+=*/gi, "$1[REDACTED]")
    .replace(/\b((?:api[_ -]?token|access[_ -]?token|refresh[_ -]?token|service[_ -]?secret|secret|password|credential|private[_ -]?key|authorization)["']?\s*[:=]\s*["']?)[^\s"',;}]+/gi, "$1[REDACTED]");
}

export function redactChatValue<T>(value: T, depth = 0): T {
  if (depth > 12) return "[OMITTED]" as T;
  if (typeof value === "string") return redactChatText(value) as T;
  if (Array.isArray(value)) return value.map((item) => redactChatValue(item, depth + 1)) as T;
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_FIELD.test(key) ? "[REDACTED]" : redactChatValue(item, depth + 1);
    }
    return output as T;
  }
  return value;
}
