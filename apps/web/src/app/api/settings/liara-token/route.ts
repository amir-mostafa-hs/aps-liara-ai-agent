import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, maskToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  let token = process.env.LIARA_API_TOKEN || "";
  let teamId = process.env.LIARA_TEAM_ID || "";

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

  const configured = Boolean(token && token.trim().length > 0);

  return NextResponse.json({
    configured,
    maskedToken: maskToken(token),
    teamId: teamId.trim(),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user.authenticated || !user.username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const dbUser = await prisma.user.findUnique({
      where: { username: user.username },
    });

    const token =
      body.token !== undefined
        ? typeof body.token === "string"
          ? body.token.trim()
          : ""
        : (dbUser?.liaraToken ?? process.env.LIARA_API_TOKEN ?? "");

    const teamId =
      body.teamId !== undefined
        ? typeof body.teamId === "string"
          ? body.teamId.trim()
          : ""
        : (dbUser?.liaraTeamId ?? process.env.LIARA_TEAM_ID ?? "");

    // Persist in database
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        liaraToken: token,
        liaraTeamId: teamId,
      },
      create: {
        username: user.username,
        passwordHash: "managed-by-env",
        liaraToken: token,
        liaraTeamId: teamId,
      },
    });

    // Also update process environment in-memory
    if (token) {
      process.env.LIARA_API_TOKEN = token;
    }
    process.env.LIARA_TEAM_ID = teamId;

    return NextResponse.json({
      ok: true,
      configured: Boolean(token),
      maskedToken: maskToken(token),
      teamId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
