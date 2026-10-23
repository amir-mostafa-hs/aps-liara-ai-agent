export function formatMessageTime(timestamp?: string): string | null {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;

  return date.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
  });
}
