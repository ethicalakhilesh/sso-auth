import { cookies } from "next/headers";
import Link from "next/link";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { findUserByUsername } from "@/lib/airtable";
import { LogoutButton } from "./logout-button";

export default async function Home() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  // Name isn't in the token itself (the ID token only carries sub/username),
  // so it's fetched fresh from Airtable here rather than trusting a claim.
  const user = session
    ? await findUserByUsername(session.preferred_username)
    : null;

  const displayName =
    user?.firstName || user?.lastName
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : session?.preferred_username;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-4 text-center">
        <h1 className="text-xl font-semibold">SSO</h1>
        {session ? (
          <>
            <p className="text-neutral-400">Welcome, {displayName}</p>
            {displayName !== session.preferred_username && (
              <p className="text-sm text-neutral-500">
                @{session.preferred_username}
              </p>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/apps"
                className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Registered apps
              </Link>
              <Link
                href="/sessions"
                className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Recent sign-ins
              </Link>
              <Link
                href="/change-password"
                className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Change password
              </Link>
              <LogoutButton />
            </div>
          </>
        ) : (
          <p className="text-neutral-400">Not signed in.</p>
        )}
      </div>
    </main>
  );
}
