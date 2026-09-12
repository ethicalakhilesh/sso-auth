import { cookies } from "next/headers";
import Link from "next/link";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { listRecentSessions } from "@/lib/airtable";

const HISTORY_LIMIT = 7;

export default async function SessionsPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  // Defense in depth: middleware.ts already requires a session to reach
  // this route at all, but without a session there's no username to look
  // history up for.
  const history = session
    ? await listRecentSessions(session.preferred_username, HISTORY_LIMIT)
    : [];

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[#F5F5F7]">
            Recent sign-ins
          </h1>
          <Link
            href="/"
            className="text-sm text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
          >
            Back
          </Link>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-[#71717A]">
            No sign-in history yet — this starts recording from your next login.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((entry, i) => (
              <li
                key={i}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <p className="text-sm text-[#F5F5F7]">
                  {formatDate(entry.loginAt)}
                </p>
                <p className="text-xs text-[#71717A] mt-1 truncate">
                  {entry.userAgent}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
