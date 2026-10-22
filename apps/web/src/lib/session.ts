import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "liara_agent_session";

export function getExpectedAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
  };
}

export function maskToken(token?: string | null): string {
  if (!token || token.trim().length === 0) {
    return "";
  }
  const clean = token.trim();
  if (clean.length <= 4) {
    return "••••";
  }
  return `••••••••${clean.slice(-4)}`;
}

export function createSessionToken(username: string): string {
  const secret = process.env.APP_SECRET || "dev-session-secret-change-me";
  const timestamp = Date.now().toString();
  const data = `${username}:${timestamp}`;
  const signature = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return Buffer.from(`${data}:${signature}`).toString("base64url");
}

export function verifySessionToken(token: string): { valid: boolean; username?: string } {
  try {
    const secret = process.env.APP_SECRET || "dev-session-secret-change-me";
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return { valid: false };

    const [username, timestamp, signature] = parts;
    const expectedData = `${username}:${timestamp}`;
    const expectedSig = crypto.createHmac("sha256", secret).update(expectedData).digest("hex");

    if (signature !== expectedSig) {
      return { valid: false };
    }

    // Session valid for 7 days
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > 7 * 24 * 60 * 60 * 1000) {
      return { valid: false };
    }

    return { valid: true, username };
  } catch {
    return { valid: false };
  }
}

