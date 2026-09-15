import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import {
  findClientById,
  findUserByUsername,
  createAuthCode,
  recordAuditEvent,
} from "@/lib/airtable";
import { canAccessClient } from "@/lib/access-control";

const CODE_TTL_SECONDS = 60;

/**
 * OIDC authorization endpoint (Authorization Code + PKCE).
 *
 * This route now owns its own auth decision (middleware.ts treats
 * /authorize as public and lets every request reach here), because the
 * right behavior on "not logged in" differs by request:
 *
 * - Normal request: redirect to /login, show the form, resume afterward.
 * - prompt=none (silent renewal, e.g. Flow's own session expired and it's
 *   checking whether you're still logged into sso-auth): never show a
 *   login form — error straight back to the client's redirect_uri so it
 *   can fall back to a normal, visible login instead of hanging.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const responseType = params.get("response_type");
  const state = params.get("state");
  const codeChallenge = params.get("code_challenge");
  const codeChallengeMethod = params.get("code_challenge_method");
  const prompt = params.get("prompt"); // e.g. "none" for silent renewal

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
    if (prompt === "none") {
      // Silent renewal failed — sso-auth's own session is also gone.
      // Error back to the client instead of showing a login form; the
      // client decides whether to retry visibly.
      const callback = new URL(redirectUri);
      callback.searchParams.set("error", "login_required");
      if (state) callback.searchParams.set("state", state);
      return NextResponse.redirect(callback.toString());
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "redirect",
      req.nextUrl.pathname + req.nextUrl.search
    );
    return NextResponse.redirect(loginUrl);
  }

  // Resolve the backing user record — session only carries a username,
  // but role and assignment checks need the stable Airtable record id
  // (Finding 15: username-based session is fine, just resolve once here).
  const user = await findUserByUsername(session.preferred_username);

  // Missing backing user for a valid session shouldn't normally happen,
  // but fail closed rather than let a broken lookup slip through as access.
  const allowed = user ? await canAccessClient(user, clientId) : false;

  if (!allowed) {
    recordAuditEvent({
      type: "authorization_denied",
      actorUserId: user?.id || "unknown",
      clientId,
    });

    const callback = new URL(redirectUri);
    callback.searchParams.set("error", "access_denied");
    if (state) callback.searchParams.set("state", state);
    return NextResponse.redirect(callback.toString());
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
