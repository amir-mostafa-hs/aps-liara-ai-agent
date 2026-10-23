import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";
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
  let token = process.env.LIARA_API_TOKEN || "";
  let teamId = process.env.LIARA_TEAM_ID || "";

  try {
    const user = await getCurrentUser();
    if (user.authenticated && user.username) {
      const dbUser = await prisma.user.findUnique({
        where: { username: user.username },
      });
      if (dbUser?.liaraToken) {
        token = dbUser.liaraToken;
      }
      if (dbUser?.liaraTeamId) {
        teamId = dbUser.liaraTeamId;
      }
    }
  } catch {
    // fallback to env vars
  }

  return { token: token.trim(), teamId: teamId.trim() };
}


