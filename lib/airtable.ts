import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_SSO_BASE_ID!
);

const USERS_TABLE = "Users";

export type SsoUser = {
  id: string; // Airtable record id
  username: string;
  passwordHash: string;
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

  return {
    id: record.id,
    username: String(record.get("username")),
    passwordHash: String(record.get("passwordHash")),
  };
}

export async function createUser(username: string, passwordHash: string) {
  const created = await base(USERS_TABLE).create([
    {
      fields: {
        username: username.toLowerCase(),
        passwordHash,
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
  };
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
