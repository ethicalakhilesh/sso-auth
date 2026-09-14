import {
  SignJWT,
  jwtVerify,
  importPKCS8,
  importSPKI,
  exportJWK,
  type KeyLike,
} from "jose";

// Deliberately no bcrypt import here: this file is imported by middleware.ts,
// which runs on the Edge runtime, and bcryptjs needs Node APIs Edge doesn't
// have. Password hashing lives in lib/password.ts (Node-only, used by API
// routes and the seed script) instead.

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const ID_TOKEN_MAX_AGE_SECONDS = 60 * 60; // 1 hour

const ALG = "ES256";

// This app's own audience for its internal session cookie — distinct from
// any client_id, since the cookie set on login here isn't an OIDC ID token
// issued to a third party, it's just how sso-auth remembers you're logged
// in on its own /authorize page.
const SELF_AUDIENCE = "sso-auth-self";

// Identifies which key signed a given token, so a verifier with multiple
// published keys (e.g. mid-rotation) knows which one to check against.
// Static for now since there's only ever one key; bump this string if you
// ever rotate AUTH_PRIVATE_KEY/AUTH_PUBLIC_KEY.
const KID = process.env.AUTH_KEY_ID || "sso-auth-key-1";

// Lazily imported and cached, rather than at module load, so this file stays
// Edge-runtime friendly (no top-level await required to build).
let cachedPrivateKey: KeyLike | null = null;
let cachedPublicKey: KeyLike | null = null;

async function getPrivateKey(): Promise<KeyLike> {
  if (!cachedPrivateKey) {
    cachedPrivateKey = (await importPKCS8(
      process.env.AUTH_PRIVATE_KEY!,
      ALG
    )) as KeyLike;
  }
  return cachedPrivateKey;
}

async function getPublicKey(): Promise<KeyLike> {
  if (!cachedPublicKey) {
    cachedPublicKey = (await importSPKI(
      process.env.AUTH_PUBLIC_KEY!,
      ALG
    )) as KeyLike;
  }
  return cachedPublicKey;
}

function issuer(): string {
  const rawIssuer =
    process.env.AUTH_ISSUER || "http://localhost:3000";

  return rawIssuer.replace(/\/+$/, "");
}

export type TokenClaims = {
  sub: string;
  preferred_username: string;
  iss: string;
  aud: string;
};

/**
 * General-purpose signer. `audience` is either SELF_AUDIENCE (this app's own
 * internal session) or a real client_id (an OIDC ID token issued to a
 * registered client via /api/oidc/token).
 */
async function signToken(
  username: string,
  audience: string,
  maxAgeSeconds: number
): Promise<string> {
  const privateKey = await getPrivateKey();

  return new SignJWT({ preferred_username: username })
    .setProtectedHeader({ alg: ALG, kid: KID })
    .setSubject(username)
    .setIssuer(issuer())
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(privateKey);
}

async function verifyToken(
  token: string,
  audience: string
): Promise<TokenClaims | null> {
  try {
    const publicKey = await getPublicKey();

    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: [ALG],
      issuer: issuer(),
      audience,
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.preferred_username !== "string"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      preferred_username: payload.preferred_username,
      iss: String(payload.iss),
      aud: String(payload.aud),
    };
  } catch {
    return null;
  }
}

/** This app's own internal session cookie (not an OIDC token given to a client). */
export async function signSession(username: string): Promise<string> {
  return signToken(username, SELF_AUDIENCE, SESSION_MAX_AGE_SECONDS);
}

export async function verifySession(
  token: string
): Promise<TokenClaims | null> {
  return verifyToken(token, SELF_AUDIENCE);
}

/** Real OIDC ID token, issued to a specific client via /api/oidc/token. */
export async function signIdToken(
  username: string,
  clientId: string
): Promise<string> {
  return signToken(username, clientId, ID_TOKEN_MAX_AGE_SECONDS);
}

/**
 * Publishes the public key as a JWK for the /jwks.json endpoint, so any
 * client can verify tokens without holding a shared secret. Only ever
 * exports the public key — never the private one.
 */
export async function getPublicJwk() {
  const publicKey = await getPublicKey();
  const jwk = await exportJWK(publicKey);

  return {
    ...jwk,
    kid: KID,
    use: "sig",
    alg: ALG,
  };
}