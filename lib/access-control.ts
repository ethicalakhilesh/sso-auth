import type { SsoUser } from "./airtable";
import { hasAssignment } from "./airtable";

/**
 * The single place this policy is decided — every route that needs to know
 * "can this user reach this client" calls this, rather than each route
 * re-implementing the admin-bypass/assignment-check logic separately.
 * (Finding 3 of the assignments plan: don't duplicate this conditional.)
 */
export async function canAccessClient(
  user: SsoUser,
  clientId: string
): Promise<boolean> {
  if (user.role === "admin") return true;
  return hasAssignment(user.id, clientId);
}
