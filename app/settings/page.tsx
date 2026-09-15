import { cookies } from "next/headers";
import Link from "next/link";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { listRecentSessions } from "@/lib/airtable";
import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 7;

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  // Users can only ever see their own history here — listRecentSessions
  // is scoped to session.preferred_username, never an arbitrary id from
  // the request, so there's no way to view someone else's sign-ins.
  const history = session
    ? await listRecentSessions(session.preferred_username, HISTORY_LIMIT)
    : [];

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-sm mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[#F5F5F7]">Settings</h1>
          <Link
            href="/"
            className="text-sm text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
          >
            Back
          </Link>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-[#A1A1AA]">Account</h2>
          <ChangePasswordForm />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-[#A1A1AA]">
            Recent sign-ins
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-[#71717A]">
              No sign-in history yet — this starts recording from your next
              login.
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
                    {entry.device || entry.userAgent}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
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
