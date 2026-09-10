import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { findClientById, createAuthCode } from "@/lib/airtable";

const CODE_TTL_SECONDS = 60;

/**
 * OIDC authorization endpoint (Authorization Code + PKCE).
 *
 * By the time this handler runs, middleware.ts has already redirected any
 * unauthenticated request to /login?redirect=/authorize?<these same params>,
 * so a missing session here would only happen if someone hits this route
 * directly with a stale/tampered cookie — treated as login_required rather
 * than silently failing.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const responseType = params.get("response_type");
  const state = params.get("state");
  const codeChallenge = params.get("code_challenge");
  const codeChallengeMethod = params.get("code_challenge_method");

  if (
    !clientId ||
    !redirectUri ||
    responseType !== "code" ||
    !codeChallenge ||
    codeChallengeMethod !== "S256"
  ) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description:
          "client_id, redirect_uri, response_type=code, code_challenge, and code_challenge_method=S256 are all required",
      },
      { status: 400 }
    );
  }

  const client = await findClientById(clientId);
  if (!client) {
    return NextResponse.json({ error: "unauthorized_client" }, { status: 400 });
  }

  // Exact match, not prefix match — a registered redirect_uri of
  // https://flow.example.com/callback must not also authorize
  // https://flow.example.com/callback.evil.com or similar.
  if (!client.redirectUris.includes(redirectUri)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "redirect_uri not registered for this client" },
      { status: 400 }
    );
  }

  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const code = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();

  await createAuthCode({
    code,
    username: session.preferred_username,
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    expiresAt,
  });

  const callback = new URL(redirectUri);
  callback.searchParams.set("code", code);
  if (state) callback.searchParams.set("state", state);

  return NextResponse.redirect(callback.toString());
}
