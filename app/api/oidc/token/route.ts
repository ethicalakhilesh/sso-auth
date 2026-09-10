import { NextRequest, NextResponse } from "next/server";
import { consumeAuthCode } from "@/lib/airtable";
import { verifyPkce } from "@/lib/pkce";
import { signIdToken, ID_TOKEN_MAX_AGE_SECONDS } from "@/lib/auth";

/**
 * OIDC token endpoint. Called server-to-server by the client app (not the
 * browser), so it's intentionally reachable with no session cookie —
 * middleware.ts allows /api/oidc/ through unauthenticated. Security here
 * comes entirely from the single-use code + PKCE check, not a cookie.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  let body: Record<string, string>;
  if (contentType.includes("application/json")) {
    body = await req.json();
  } else {
    // Standard OIDC clients send application/x-www-form-urlencoded.
    const form = await req.formData();
    body = Object.fromEntries(
      Array.from(form.entries()).map(([k, v]) => [k, String(v)])
    );
  }

  const { grant_type, code, redirect_uri, client_id, code_verifier } = body;

  if (grant_type !== "authorization_code") {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  }

  if (!code || !redirect_uri || !client_id || !code_verifier) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // consumeAuthCode marks the code used immediately, so a retried or
  // intercepted-and-replayed code fails here on its second use.
  const authCode = await consumeAuthCode(code);

  // Same generic error for "code doesn't exist", "already used", "expired",
  // and "doesn't match this client/redirect_uri" — an attacker probing
  // shouldn't be able to tell which case they hit.
  if (
    !authCode ||
    authCode.clientId !== client_id ||
    authCode.redirectUri !== redirect_uri
  ) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  const pkceValid = await verifyPkce(
    code_verifier,
    authCode.codeChallenge,
    authCode.codeChallengeMethod
  );
  if (!pkceValid) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  const idToken = await signIdToken(authCode.username, client_id);

  return NextResponse.json({
    token_type: "Bearer",
    id_token: idToken,
    expires_in: ID_TOKEN_MAX_AGE_SECONDS,
  });
}
