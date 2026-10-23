import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, resolveLiaraCredentials, verifySessionToken } from "./session";
import { prisma } from "./prisma";

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

export async function getActiveLiaraCredentials(): Promise<{
  token: string;
  teamId: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user.authenticated || !user.username) return { token: "", teamId: "" };
    const dbUser = await prisma.user.findUnique({ where: { username: user.username } });
    const credentials = resolveLiaraCredentials(user.username, dbUser);
    return { token: credentials.token.trim(), teamId: credentials.teamId.trim() };
  } catch {
    return { token: "", teamId: "" };
  }
}


