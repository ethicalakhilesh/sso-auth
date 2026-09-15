import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  findUserByUsername,
  listUsers,
  listClients,
  listAssignmentsForUser,
} from "@/lib/airtable";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { UsersManager } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const currentUser = session
    ? await findUserByUsername(session.preferred_username)
    : null;

  // Admin-only page — non-admins get redirected rather than shown an
  // empty/broken view. The API routes this page calls are independently
  // admin-gated too (Finding 10/11), so this redirect is a UX nicety on
  // top of real enforcement, not the enforcement itself.
  if (currentUser?.role !== "admin") {
    redirect("/");
  }

  const [users, clients] = await Promise.all([listUsers(), listClients()]);

  const assignmentsByUser: Record<string, string[]> = {};
  for (const user of users) {
    const assignments = await listAssignmentsForUser(user.id);
    assignmentsByUser[user.id] = assignments.map((a) => a.clientId);
  }

  return (
    <UsersManager
      users={users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName:
          [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username,
        role: u.role,
      }))}
      clients={clients.map((c) => ({ clientId: c.clientId, name: c.name }))}
      initialAssignmentsByUser={assignmentsByUser}
    />
  );
}
