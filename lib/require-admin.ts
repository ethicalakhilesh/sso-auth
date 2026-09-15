import { NextRequest } from "next/server";
import { findUserByUsername, type SsoUser } from "./airtable";
import { SESSION_COOKIE, verifySession } from "./auth";

/**
 * Shared by every admin-only API route (clients, assignments, users) so
 * the admin check lives in exactly one place — Finding 3's centralization
 * principle applies here too, not just to canAccessClient.
 */
export async function requireAdmin(req: NextRequest): Promise<SsoUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  const user = await findUserByUsername(session.preferred_username);
  if (!user || user.role !== "admin") return null;

  return user;
}
