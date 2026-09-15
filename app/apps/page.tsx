import { cookies } from "next/headers";
import {
  findUserByUsername,
  listClients,
  listUsers,
  listAssignmentsForClient,
} from "@/lib/airtable";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { AppsManager } from "./apps-manager";

// Without this, Next.js has no signal that this page depends on live data
// and tries to prerender it statically at build time — which means every
// `next build` would call out to Airtable, and a transient Airtable issue
// (or, as caught here, invalid build-time credentials) would fail the
// build entirely rather than just this page's runtime request.
export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const clients = await listClients();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  const session = token ? await verifySession(token) : null;
  const user = session
    ? await findUserByUsername(session.preferred_username)
    : null;

  const isAdmin = user?.role === "admin";

  // Only fetched for admins — the assignment checklist needs every user
  // and, per client, which of them already have access. Non-admins never
  // see or need this data.
  const users = isAdmin
    ? (await listUsers()).map((u) => ({
        id: u.id,
        username: u.username,
        displayName:
          [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username,
      }))
    : [];

  const assignmentsByClient: Record<string, string[]> = {};
  if (isAdmin) {
    for (const client of clients) {
      const assignments = await listAssignmentsForClient(client.clientId);
      assignmentsByClient[client.clientId] = assignments.map((a) => a.userId);
    }
  }

  return (
    <AppsManager
      initialClients={clients}
      isAdmin={isAdmin}
      users={users}
      initialAssignmentsByClient={assignmentsByClient}
    />
  );
}
