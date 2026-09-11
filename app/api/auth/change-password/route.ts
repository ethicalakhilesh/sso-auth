import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { findUserByUsername, updatePasswordHash } from "@/lib/airtable";
import { hashPassword, verifyPassword } from "@/lib/password";

const MIN_PASSWORD_LENGTH = 8;

/**
 * This is sso-auth's own dashboard action — changing the password used to
 * log into sso-auth itself, not something any client app (Flow, etc.)
 * calls. middleware.ts already requires a session cookie to reach this
 * route at all; verifying it again here is what tells us *which* user,
 * since middleware doesn't pass that downstream.
 */
export async function POST(req: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required" },
      { status: 400 }
    );
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    );
  }

  const user = await findUserByUsername(session.preferred_username);
  if (!user) {
    // Session was valid but the underlying user row is gone — shouldn't
    // normally happen, but fail closed rather than continue.
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const currentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentValid) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 }
    );
  }

  const newHash = await hashPassword(newPassword);
  await updatePasswordHash(user.id, newHash);

  return NextResponse.json({ ok: true });
}
