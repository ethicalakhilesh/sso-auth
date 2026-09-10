# sso-auth

Standalone OIDC identity provider for personal apps (Flow first, more later).
Owns login only — no app data.

## Setup

1. Create an Airtable base called `SSO` with three tables:

   **`Users`**
   - `username` (single line text) — 3-25 chars, lowercase letters/numbers,
     at most one `_` and one `.` total (validated in `lib/username.ts`)
   - `passwordHash` (single line text)
   - `createdAt` (single line text)

   **`Clients`** — one row per app that will use this as its login provider
   - `clientId` (single line text) — any stable identifier, e.g. `flow`
   - `redirectUris` (single line text) — comma-separated, exact URLs the app
     is allowed to be redirected back to after login, e.g.
     `https://flow.yourdomain.com/callback`
   - `name` (single line text) — display name, currently unused but handy
     for your own reference

   **`AuthCodes`** — short-lived, single-use codes issued by `/authorize`
   and consumed by `/api/oidc/token`. The app manages this table entirely;
   you shouldn't need to touch rows here directly.
   - `code`, `username`, `clientId`, `redirectUri`, `codeChallenge`,
     `codeChallengeMethod`, `expiresAt` (all single line text)
   - `used` (single line text, `"true"`/`"false"`)

2. Generate your signing keypair:
   ```bash
   node scripts/generate-keys.mjs
   ```

3. Copy `.env.example` to `.env` and fill in the printed keys, your
   `AUTH_ISSUER`, and Airtable credentials.

4. Install and run:
   ```bash
   npm install
   npm run seed -- yourusername "your-password"
   npm run dev
   ```

5. Visit `http://localhost:3000` — you'll be redirected to `/login`.
   Sign in with the credentials you seeded.

## OIDC endpoints

- `GET /.well-known/openid-configuration` — discovery document
- `GET /.well-known/jwks.json` — public signing key
- `GET /authorize` — authorization endpoint (Authorization Code + PKCE only;
  `code_challenge_method=S256` is required, `plain` is rejected)
- `POST /api/oidc/token` — token endpoint; exchanges a code for an ID token

## How a client app (e.g. Flow) connects

1. Register the app as a row in the `Clients` table first — `/authorize`
   rejects any `client_id` or `redirect_uri` it doesn't recognize.
2. Client generates a PKCE `code_verifier`/`code_challenge` pair and
   redirects the browser to:
   ```
   /authorize?client_id=...&redirect_uri=...&response_type=code
     &code_challenge=...&code_challenge_method=S256&state=...
   ```
3. If not already logged in here, you'll see this app's own login form
   first, then get redirected back into the flow.
4. `sso-auth` redirects back to the client's `redirect_uri` with `?code=...&state=...`.
5. Client's **server** (not the browser) exchanges that code:
   ```
   POST /api/oidc/token
   { grant_type: "authorization_code", code, redirect_uri, client_id, code_verifier }
   ```
6. Response is `{ token_type: "Bearer", id_token, expires_in }`. Client
   verifies `id_token` against `/.well-known/jwks.json` — `aud` will be that
   client's own `client_id`, not a shared placeholder.

Codes expire in 60 seconds and are single-use — a second exchange attempt
(replay, or a retry after a bad `code_verifier`) always fails with
`invalid_grant`, so failed attempts require restarting from `/authorize`.

## Notes

- ID tokens issued via `/api/oidc/token` last 1 hour (`ID_TOKEN_MAX_AGE_SECONDS`
  in `lib/auth.ts`). There's no refresh token yet (Phase 5) — a client needs
  a fresh `/authorize` round trip once it expires.
- This app's own internal session cookie (used only on its own `/` page) is
  separate from client ID tokens — audienced to `sso-auth-self`, lasts 7 days,
  unrelated to any `client_id`.
- The Airtable `consumeAuthCode` fetch-then-mark-used isn't atomic, so two
  near-simultaneous exchanges of the same code have a small race window.
  Not a real concern at personal-use traffic levels.
