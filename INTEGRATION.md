# Integrating a client app with sso-auth

This is the guide for the *other* side — a client app (Flow, or any future
app) that wants "log in via sso-auth" instead of its own auth.

## 0. Register the app first

Add a row to the `Clients` table in the `SSO` Airtable base:
- `clientId` — e.g. `flow`
- `redirectUris` — exact URL(s) the client will be redirected back to,
  comma-separated if more than one (e.g. local + production)
- `name` — display name, for your own reference

`/authorize` rejects anything not registered here — do this before writing
any client code, or you'll just get `unauthorized_client` / `invalid_request`.

## 1. Generate a PKCE pair (per login attempt)

```ts
import crypto from "crypto";

const codeVerifier = crypto.randomBytes(32).toString("base64url");
const codeChallenge = crypto
  .createHash("sha256")
  .update(codeVerifier)
  .digest("base64url");
```

Store `codeVerifier` somewhere that survives the redirect round trip —
a short-lived cookie is simplest (httpOnly, a few minutes' expiry). You'll
need it again in step 4.

## 2. Redirect the browser to `/authorize`

```ts
const state = crypto.randomBytes(16).toString("base64url"); // CSRF protection

const authorizeUrl = new URL("https://sso-test.vercel.app/authorize");
authorizeUrl.searchParams.set("client_id", "flow");
authorizeUrl.searchParams.set("redirect_uri", "https://flow.yourdomain.com/callback");
authorizeUrl.searchParams.set("response_type", "code");
authorizeUrl.searchParams.set("code_challenge", codeChallenge);
authorizeUrl.searchParams.set("code_challenge_method", "S256");
authorizeUrl.searchParams.set("state", state);

// Also stash `state` in a short-lived cookie, to compare in step 3.
return redirect(authorizeUrl.toString());
```

`redirect_uri` must match a value in that client's `redirectUris` field
**exactly** — no trailing slash mismatches, no extra query params.

## 3. Handle the callback

sso-auth redirects back to your `redirect_uri` with `?code=...&state=...`.

```ts
// e.g. app/callback/route.ts
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const expectedState = /* read from the cookie you set in step 2 */;
  if (!code || state !== expectedState) {
    return new Response("Invalid callback", { status: 400 });
  }
  // ...proceed to step 4
}
```

Checking `state` matters — without it, nothing stops a different login
attempt (or an attacker's crafted redirect) from being accepted as yours.

## 4. Exchange the code for an ID token

Server-to-server, not from the browser:

```ts
const codeVerifier = /* read from the cookie you set in step 1 */;

const res = await fetch("https://sso-test.vercel.app/api/oidc/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    grant_type: "authorization_code",
    code,
    redirect_uri: "https://flow.yourdomain.com/callback",
    client_id: "flow",
    code_verifier: codeVerifier,
  }),
});

if (!res.ok) {
  // invalid_grant: code was wrong, expired (60s), or already used once.
  // Send the user back to step 2 to try again — codes are single-use,
  // there's no "retry with the same code" path.
  return new Response("Login failed", { status: 401 });
}

const { id_token } = await res.json();
```

## 5. Verify the ID token

```ts
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://sso-test.vercel.app/.well-known/jwks.json")
);

const { payload } = await jwtVerify(id_token, JWKS, {
  issuer: "https://sso-test.vercel.app",
  audience: "flow", // must match this client's own clientId
});

// payload.sub / payload.preferred_username identify the logged-in user.
```

`createRemoteJWKSet` handles fetching and caching the public key itself —
no need to hardcode it or hit `/jwks.json` manually.

## 6. Set your own app's session

The ID token is proof of login, not a session token you keep reusing —
it expires in 1 hour and there's no refresh flow yet (that's Phase 5).
Once verified, set Flow's own session cookie (its own secret, its own
lifetime) so Flow doesn't need to re-verify against sso-auth on every request.

```ts
// pseudocode — use whatever session mechanism Flow already has
setFlowSessionCookie({ username: payload.preferred_username });
```

## 7. Silent renewal when Flow's own session expires

Flow's own session (set in step 6) has its own lifetime, independent of the
1-hour ID token. When it expires, don't force a full visible login —
redirect through `/authorize` again with `prompt=none` added:

```ts
authorizeUrl.searchParams.set("prompt", "none");
```

- If you're still logged into sso-auth (its own session lasts 7 days),
  this redirects straight back to Flow's callback with a fresh `code` —
  completely silent, no login screen, nothing you'd notice
- If sso-auth's session has *also* expired, it redirects back with
  `?error=login_required&state=...` instead — Flow should detect this and
  fall back to a normal (visible) `/authorize` redirect, without `prompt=none`

```ts
// in the callback handler
const error = req.nextUrl.searchParams.get("error");
if (error === "login_required") {
  // Silent renewal failed — retry visibly, without prompt=none this time.
  return redirect(buildAuthorizeUrl({ silent: false }));
}
```

## 8. Handling `access_denied`

Separate from `login_required` — this means the user *is* logged into
sso-auth, but isn't assigned access to this specific app (see sso-auth's
own README, "Access control"). Retrying `/authorize` won't help; the user
needs an admin to assign them first.

```ts
if (error === "access_denied") {
  // Don't retry — show the user a clear message instead, e.g.
  // "You don't have access to this app yet. Contact an admin."
}
```

This can happen even for a previously-working login: if an admin revokes
access, the *next* authorization attempt (not the current session) is
denied — Flow's own session isn't automatically invalidated, so build for
the case where a user is mid-session in Flow when their access is pulled.

## Checklist before going live

- [ ] `redirect_uri` in code exactly matches the `Clients` table row
- [ ] `state` is checked on callback, not just passed through
- [ ] `code_verifier` cookie is httpOnly and short-lived
- [ ] Token verification checks both `issuer` and `audience` — skipping
      `audience` would let a token meant for a *different* client be
      accepted here
- [ ] Failure path (expired/reused code, failed verification) sends the
      user back to step 2, not a dead end
