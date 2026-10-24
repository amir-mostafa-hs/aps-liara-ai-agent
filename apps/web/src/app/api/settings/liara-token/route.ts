import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isDemoUsername, maskToken, resolveLiaraCredentials } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user.authenticated || !user.username) {
    return NextResponse.json({ configured: false, maskedToken: "", teamId: "" }, { status: 401 });
  }
  if (isDemoUsername(user.username)) {
    return NextResponse.json({ configured: false, maskedToken: "", teamId: "" });
  }
  const dbUser = user.authenticated && user.username
    ? await prisma.user.findUnique({ where: { username: user.username } })
    : null;
  const { token, teamId } = resolveLiaraCredentials(user.username, dbUser);

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
  if (isDemoUsername(user.username)) {
    return NextResponse.json({ error: "حساب نمایشی عمومی است و امکان ذخیرهٔ توکن Liara ندارد." }, { status: 403 });
  }

  try {
    const body = await req.json();

    const dbUser = await prisma.user.findUnique({
      where: { username: user.username },
    });

    const existing = resolveLiaraCredentials(user.username, dbUser);
    const token = body.token !== undefined
      ? typeof body.token === "string" ? body.token.trim() : ""
      : existing.token;

    const teamId = body.teamId !== undefined
      ? typeof body.teamId === "string" ? body.teamId.trim() : ""
      : existing.teamId;

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
