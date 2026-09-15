import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_SSO_BASE_ID!
);

const USERS_TABLE = "Users";

export type UserRole = "admin" | "user";

export type SsoUser = {
  id: string; // Airtable record id
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

export async function findUserByUsername(
  username: string
): Promise<SsoUser | null> {
  const records = await base(USERS_TABLE)
    .select({
      filterByFormula: `LOWER({username}) = "${username.toLowerCase()}"`,
      maxRecords: 1,
    })
    .firstPage();

  const record = records[0];
  if (!record) return null;

  const role = String(record.get("role") || "user").toLowerCase();

  return {
    id: record.id,
    username: String(record.get("username")),
    passwordHash: String(record.get("passwordHash")),
    firstName: String(record.get("firstName") || ""),
    lastName: String(record.get("lastName") || ""),
    role: role === "admin" ? "admin" : "user",
  };
}

/**
 * Assignment checks and the /users admin view need to resolve a user by
 * their stable Airtable record id (not username) — this is the lookup
 * Finding 2 of the assignments plan relies on.
 */
export async function findUserById(userId: string): Promise<SsoUser | null> {
  try {
    const record = await base(USERS_TABLE).find(userId);
    const role = String(record.get("role") || "user").toLowerCase();
    return {
      id: record.id,
      username: String(record.get("username")),
      passwordHash: String(record.get("passwordHash")),
      firstName: String(record.get("firstName") || ""),
      lastName: String(record.get("lastName") || ""),
      role: role === "admin" ? "admin" : "user",
    };
  } catch {
    return null;
  }
}

export async function listUsers(): Promise<SsoUser[]> {
  const records = await base(USERS_TABLE).select().all();
  return records.map((record) => {
    const role = String(record.get("role") || "user").toLowerCase();
    return {
      id: record.id,
      username: String(record.get("username")),
      passwordHash: String(record.get("passwordHash")),
      firstName: String(record.get("firstName") || ""),
      lastName: String(record.get("lastName") || ""),
      role: role === "admin" ? "admin" : "user",
    };
  });
}

export async function updatePasswordHash(
  recordId: string,
  newPasswordHash: string
) {
  await base(USERS_TABLE).update(recordId, {
    passwordHash: newPasswordHash,
  });
}

export async function createUser(username: string, passwordHash: string) {
  const created = await base(USERS_TABLE).create([
    {
      fields: {
        username: username.toLowerCase(),
        passwordHash,
        role: "user",
        createdAt: new Date().toISOString(),
      },
    },
  ]);
  return created[0];
}

const CLIENTS_TABLE = "Clients";

export type OidcClient = {
  id: string;
  clientId: string;
  redirectUris: string[];
  name: string;
  launchUrl: string;
};

export async function findClientById(
  clientId: string
): Promise<OidcClient | null> {
  const records = await base(CLIENTS_TABLE)
    .select({
      filterByFormula: `{clientId} = "${clientId}"`,
      maxRecords: 1,
    })
    .firstPage();

  const record = records[0];
  if (!record) return null;

  const redirectUrisRaw = String(record.get("redirectUris") || "");

  return {
    id: record.id,
    clientId: String(record.get("clientId")),
    redirectUris: redirectUrisRaw
      .split(",")
      .map((uri) => uri.trim())
      .filter(Boolean),
    name: String(record.get("name") || clientId),
    launchUrl: String(record.get("launchUrl") || ""),
  };
}

export async function listClients(): Promise<OidcClient[]> {
  const records = await base(CLIENTS_TABLE).select().all();

  return records.map((record) => {
    const redirectUrisRaw = String(record.get("redirectUris") || "");
    const clientId = String(record.get("clientId"));
    return {
      id: record.id,
      clientId,
      redirectUris: redirectUrisRaw
        .split(",")
        .map((uri) => uri.trim())
        .filter(Boolean),
      name: String(record.get("name") || clientId),
      launchUrl: String(record.get("launchUrl") || ""),
    };
  });
}

export async function createClient(params: {
  clientId: string;
  redirectUris: string[];
  name: string;
  launchUrl: string;
}) {
  const created = await base(CLIENTS_TABLE).create([
    {
      fields: {
        clientId: params.clientId,
        redirectUris: params.redirectUris.join(","),
        name: params.name,
        launchUrl: params.launchUrl,
      },
    },
  ]);
  return created[0].id;
}

export async function updateClient(
  recordId: string,
  params: { redirectUris: string[]; name: string; launchUrl: string }
) {
  // clientId is intentionally not editable here — apps hardcode it, so
  // changing it would silently break whatever's already configured to use it.
  await base(CLIENTS_TABLE).update(recordId, {
    redirectUris: params.redirectUris.join(","),
    name: params.name,
    launchUrl: params.launchUrl,
  });
}

const AUTH_CODES_TABLE = "AuthCodes";

export type NewAuthCode = {
  code: string;
  username: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  expiresAt: string; // ISO timestamp
};

export type ConsumedAuthCode = {
  username: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
};

export async function createAuthCode(params: NewAuthCode) {
  await base(AUTH_CODES_TABLE).create([
    {
      fields: { ...params, used: "false" },
    },
  ]);
}

/**
 * Fetches an authorization code and immediately marks it used, so it can't
 * be exchanged twice. Returns null for a code that doesn't exist, is
 * already used, or has expired — the token endpoint treats all three the
 * same way (a generic invalid_grant error).
 *
 * Note: this fetch-then-update isn't atomic against Airtable, so two
 * near-simultaneous exchanges of the same code have a small race window.
 * Not a real concern at personal-use traffic levels; worth revisiting if
 * this ever serves more than one person.
 */
export async function consumeAuthCode(
  code: string
): Promise<ConsumedAuthCode | null> {
  const records = await base(AUTH_CODES_TABLE)
    .select({
      filterByFormula: `{code} = "${code}"`,
      maxRecords: 1,
    })
    .firstPage();

  const record = records[0];
  if (!record) return null;

  const used = String(record.get("used")) === "true";
  const expiresAt = String(record.get("expiresAt"));
  if (used || new Date(expiresAt).getTime() < Date.now()) {
    return null;
  }

  await base(AUTH_CODES_TABLE).update(record.id, { used: "true" });

  return {
    username: String(record.get("username")),
    clientId: String(record.get("clientId")),
    redirectUri: String(record.get("redirectUri")),
    codeChallenge: String(record.get("codeChallenge")),
    codeChallengeMethod: String(record.get("codeChallengeMethod")),
  };
}

const SESSIONS_TABLE = "Sessions";

export type SessionRecord = {
  username: string;
  loginAt: string; // ISO timestamp
  userAgent: string;
  device: string;
};

/**
 * Fire-and-forget from the caller's perspective: a login attempt that
 * fails to record its history entry shouldn't fail the login itself, so
 * callers should catch/ignore errors from this rather than let a logging
 * hiccup block someone from signing in.
 */
export async function recordLogin(
  username: string,
  userAgent: string,
  device: string
) {
  await base(SESSIONS_TABLE).create([
    {
      fields: {
        username,
        loginAt: new Date().toISOString(),
        userAgent: userAgent.slice(0, 500), // Airtable text fields have limits
        device: device.slice(0, 100),
      },
    },
  ]);
}

export async function listRecentSessions(
  username: string,
  limit: number
): Promise<SessionRecord[]> {
  const records = await base(SESSIONS_TABLE)
    .select({
      filterByFormula: `LOWER({username}) = "${username.toLowerCase()}"`,
      sort: [{ field: "loginAt", direction: "desc" }],
      maxRecords: limit,
    })
    .firstPage();

  return records.map((record) => ({
    username: String(record.get("username")),
    loginAt: String(record.get("loginAt")),
    userAgent: String(record.get("userAgent") || ""),
    device: String(record.get("device") || ""),
  }));
}

const ASSIGNMENTS_TABLE = "Assignments";

export type Assignment = {
  id: string;
  userId: string;
  clientId: string;
  createdAt: string;
  createdBy: string;
};

export async function hasAssignment(
  userId: string,
  clientId: string
): Promise<boolean> {
  const records = await base(ASSIGNMENTS_TABLE)
    .select({
      filterByFormula: `AND({userId} = "${userId}", {clientId} = "${clientId}")`,
      maxRecords: 1,
    })
    .firstPage();
  return records.length > 0;
}

export async function listAssignmentsForUser(
  userId: string
): Promise<Assignment[]> {
  const records = await base(ASSIGNMENTS_TABLE)
    .select({ filterByFormula: `{userId} = "${userId}"` })
    .all();
  return records.map((record) => ({
    id: record.id,
    userId: String(record.get("userId")),
    clientId: String(record.get("clientId")),
    createdAt: String(record.get("createdAt") || ""),
    createdBy: String(record.get("createdBy") || ""),
  }));
}

export async function listAssignmentsForClient(
  clientId: string
): Promise<Assignment[]> {
  const records = await base(ASSIGNMENTS_TABLE)
    .select({ filterByFormula: `{clientId} = "${clientId}"` })
    .all();
  return records.map((record) => ({
    id: record.id,
    userId: String(record.get("userId")),
    clientId: String(record.get("clientId")),
    createdAt: String(record.get("createdAt") || ""),
    createdBy: String(record.get("createdBy") || ""),
  }));
}

/**
 * Idempotent: creating an assignment that already exists is a no-op rather
 * than a duplicate row, so a UI checkbox can call this freely without
 * needing to check state first.
 */
export async function createAssignment(
  userId: string,
  clientId: string,
  createdBy: string
) {
  const exists = await hasAssignment(userId, clientId);
  if (exists) return;

  await base(ASSIGNMENTS_TABLE).create([
    {
      fields: {
        userId,
        clientId,
        createdAt: new Date().toISOString(),
        createdBy,
      },
    },
  ]);
}

/** Idempotent in the other direction: deleting a nonexistent assignment is a no-op. */
export async function deleteAssignment(userId: string, clientId: string) {
  const records = await base(ASSIGNMENTS_TABLE)
    .select({
      filterByFormula: `AND({userId} = "${userId}", {clientId} = "${clientId}")`,
    })
    .all();

  for (const record of records) {
    await base(ASSIGNMENTS_TABLE).destroy(record.id);
  }
}

const AUDIT_LOG_TABLE = "AuditLog";

export type AuditEventType =
  | "assignment_created"
  | "assignment_removed"
  | "client_created"
  | "client_updated"
  | "user_role_changed"
  | "authorization_denied";

/**
 * Best-effort, like recordLogin — an audit write failing should never block
 * the action it's describing. Never pass secrets (passwords, PKCE verifiers,
 * auth codes, tokens) in `details`.
 */
export async function recordAuditEvent(params: {
  type: AuditEventType;
  actorUserId: string;
  targetUserId?: string;
  clientId?: string;
  details?: string;
}) {
  try {
    await base(AUDIT_LOG_TABLE).create([
      {
        fields: {
          type: params.type,
          actorUserId: params.actorUserId,
          targetUserId: params.targetUserId || "",
          clientId: params.clientId || "",
          details: (params.details || "").slice(0, 500),
          createdAt: new Date().toISOString(),
        },
      },
    ]);
  } catch {
    // Deliberately swallowed — see doc comment above.
  }
}
