import { cookies } from "next/headers";
import Link from "next/link";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import {
  findUserByUsername,
  listClients,
  listAssignmentsForUser,
} from "@/lib/airtable";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  // Name isn't in the token itself (the ID token only carries sub/username),
  // so it's fetched fresh from Airtable here rather than trusting a claim.
  const user = session
    ? await findUserByUsername(session.preferred_username)
    : null;

  if (!session || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-neutral-400">Not signed in.</p>
      </main>
    );
  }

  const displayName =
    user.firstName || user.lastName
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : session.preferred_username;

  const allClients = await listClients();

  // Admins see every registered app; everyone else sees only what's been
  // explicitly assigned to them. This mirrors canAccessClient's rule
  // (admin -> all, user -> assigned only) but for display rather than the
  // /authorize enforcement itself — this list is a convenience, not the
  // security boundary.
  let visibleClients = allClients;
  if (user.role !== "admin") {
    const assignments = await listAssignmentsForUser(user.id);
    const assignedClientIds = new Set(assignments.map((a) => a.clientId));
    visibleClients = allClients.filter((c) =>
      assignedClientIds.has(c.clientId)
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-sm mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold text-[#F5F5F7]">
            App Dashboard
          </h1>
          <p className="text-sm text-neutral-400">Welcome, {displayName}</p>
        </div>

        <div className="space-y-2">
          {visibleClients.length === 0 && (
            <p className="text-sm text-center text-[#71717A]">
              {user.role === "admin"
                ? "No apps registered yet."
                : "No apps have been assigned to you yet."}
            </p>
          )}

          {visibleClients.map((client) => (
            <a
              key={client.id}
              href={client.launchUrl}
              className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-white/20 hover:bg-white/[0.06] transition-colors"
            >
              <p className="text-sm font-medium text-[#F5F5F7] truncate">
                {client.name}
              </p>
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          {user.role === "admin" && (
            <>
              <Link
                href="/apps"
                className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Manage apps
              </Link>
              <Link
                href="/users"
                className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Manage users
              </Link>
            </>
          )}
          <Link
            href="/settings"
            className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Settings
          </Link>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
