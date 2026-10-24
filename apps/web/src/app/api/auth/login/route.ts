import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getExpectedAdminCredentials, getExpectedDemoCredentials, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const expected = getExpectedAdminCredentials();

    const demo = getExpectedDemoCredentials();
    const isAdmin = username === expected.username && password === expected.password;
    const isDemo = demo !== null && username === demo.username && password === demo.password;
    if (!isAdmin && !isDemo) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const sessionToken = createSessionToken(username);

    const response = NextResponse.json({
      success: true,
      username,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

