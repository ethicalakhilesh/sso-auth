import { NextResponse } from "next/server";

/**
 * OIDC discovery document. authorization_endpoint and token_endpoint are
 * listed here even though they don't exist yet — those land in Phase 3.
 * Publishing the full shape now means any OIDC client library can already
 * point at this issuer and read its capabilities correctly once those
 * routes exist, with no further changes to this document needed.
 */
export async function GET() {
  const issuer = process.env.AUTH_ISSUER || "http://localhost:3000";

  return NextResponse.json({
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/api/oidc/token`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["ES256"],
    scopes_supported: ["openid", "profile"],
    claims_supported: ["sub", "preferred_username", "iss", "aud", "exp", "iat"],
    code_challenge_methods_supported: ["S256"],
    prompt_values_supported: ["none"],
  });
}
