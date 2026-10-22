import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";

export * from "./session";

export async function getCurrentUser(): Promise<{ authenticated: boolean; username?: string }> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return { authenticated: false };
    }

    const result = verifySessionToken(sessionCookie.value);
    if (!result.valid || !result.username) {
      return { authenticated: false };
    }

    return { authenticated: true, username: result.username };
  } catch {
    return { authenticated: false };
  }
}
