import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, recordLogin } from "@/lib/airtable";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { isValidUsername } from "@/lib/username";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  if (!isValidUsername(username)) {
    // Same generic error as a bad password, so we don't reveal which
    // usernames are validly formatted vs which actually exist.
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const user = await findUserByUsername(username);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const token = await signSession(user.username);

  // Best-effort: a login history write failing shouldn't block sign-in.
  recordLogin(user.username, req.headers.get("user-agent") || "unknown").catch(
    () => {}
  );

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    domain: process.env.COOKIE_DOMAIN || undefined,
  });

  return res;
}
