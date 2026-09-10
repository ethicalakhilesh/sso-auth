import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export default async function Home() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-4 text-center">
        <h1 className="text-xl font-semibold">SSO</h1>
        {session ? (
          <>
            <p className="text-neutral-400">
              Signed in as {session.preferred_username}
            </p>
            <LogoutButton />
          </>
        ) : (
          <p className="text-neutral-400">Not signed in.</p>
        )}
      </div>
    </main>
  );
}
