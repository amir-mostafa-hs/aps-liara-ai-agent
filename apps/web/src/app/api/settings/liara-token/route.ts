import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, maskToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  let token = process.env.LIARA_API_TOKEN || "";

  if (user.authenticated && user.username) {
    const dbUser = await prisma.user.findUnique({
      where: { username: user.username },
    });
    if (dbUser?.liaraToken) {
      token = dbUser.liaraToken;
    }
  }

  const configured = Boolean(token && token.trim().length > 0);

  return NextResponse.json({
    configured,
    maskedToken: maskToken(token),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user.authenticated || !user.username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";

    // Persist in database
    await prisma.user.upsert({
      where: { username: user.username },
      update: { liaraToken: token },
      create: {
        username: user.username,
        passwordHash: "managed-by-env",
        liaraToken: token,
      },
    });

    // Also update process environment in-memory
    process.env.LIARA_API_TOKEN = token;

    return NextResponse.json({
      ok: true,
      configured: Boolean(token),
      maskedToken: maskToken(token),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
