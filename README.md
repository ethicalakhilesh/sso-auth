# sso-auth

Standalone OIDC identity provider for personal apps (Flow first, more later).
Owns login and per-user application access — no app data.

## Setup

1. Create an Airtable base called `SSO` with these tables:

   **`Users`**
   - `username` (single line text) — 3-25 chars, lowercase letters/numbers,
     at most one `_` and one `.` total (validated in `lib/username.ts`)
   - `passwordHash` (single line text)
   - `firstName`, `lastName` (single line text, optional)
   - `role` (single line text) — `admin` or `user`; missing/blank defaults
     to `user`. **Set your own row to `admin` manually** — there's no
     first-run bootstrap for this.
   - `createdAt` (single line text)

   **`Clients`** — one row per app that uses this as its login provider
   - `clientId` (single line text) — any stable identifier, e.g. `flow`
   - `redirectUris` (single line text) — comma-separated, exact URLs the app
     is allowed to be redirected back to after login, e.g.
     `https://flow.yourdomain.com/api/auth/callback`
   - `launchUrl` (single line text) — the app's **own** login-start URL
     (not an sso-auth URL) — this is where the App Dashboard sends a user
     when they click the app. Must be `https://` (or `http://localhost`
     for local dev); other schemes are rejected.
   - `name` (single line text) — display name

   **`Assignments`** — who can access what. No assignment = no access,
   except for admins (who bypass this table entirely).
   - `userId` (single line text) — a `Users` **record id**, not a username
   - `clientId` (single line text)
   - `createdAt` (single line text)
   - `createdBy` (single line text) — admin's `Users` record id

   **`AuthCodes`** — short-lived, single-use codes issued by `/authorize`
   and consumed by `/api/oidc/token`. Managed entirely by the app.
   - `code`, `username`, `clientId`, `redirectUri`, `codeChallenge`,
     `codeChallengeMethod`, `expiresAt` (all single line text)
   - `used` (single line text, `"true"`/`"false"`)

   **`Sessions`** — login history, shown on `/settings`. Written
   automatically on every successful login.
   - `username`, `loginAt` (ISO timestamp), `userAgent`, `device`
     (all single line text)

   **`AuditLog`** — security-relevant events (assignment changes, client
   changes, authorization denials). Write-only from the app; nothing reads
   it back yet, but it's there if you need to investigate something later.
   - `type`, `actorUserId`, `targetUserId`, `clientId`, `details`,
     `createdAt` (all single line text)

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

5. Set your seeded user's `role` to `admin` in Airtable directly (no UI
   for this yet — see Notes). Without this, you'll be locked out of every
   app, including ones you register yourself, until you assign yourself
   access the long way round.

6. Visit `http://localhost:3000` — you'll be redirected to `/login`.

## OIDC endpoints

- `GET /.well-known/openid-configuration` — discovery document
- `GET /.well-known/jwks.json` — public signing key
- `GET /authorize` — authorization endpoint (Authorization Code + PKCE only;
  `code_challenge_method=S256` is required, `plain` is rejected; supports
  `prompt=none` for silent renewal). **This is the access-control
  enforcement point** — see below.
- `POST /api/oidc/token` — token endpoint; exchanges a code for an ID token

## Access control

Every `/authorize` request is checked against `Assignments` before a code
is ever issued:

- **Admins bypass this check entirely** — always allowed, for every client
- **Everyone else** needs an explicit `(userId, clientId)` row in
  `Assignments`, or the request is redirected back to the client with
  `?error=access_denied` — no code, no login form, nothing to bypass by
  hiding the app from the dashboard
- This means **newly registered apps are accessible to no one but admins**
  until you explicitly assign users — including yourself, on your own apps,
  if you're testing as a non-admin account

The dashboard (`/`) is a convenience layer on top of this, not the
enforcement itself — it just filters which apps a user *sees* using the
same rule (admin → all, user → assigned only).

## Dashboard pages (this app's own UI, not part of the OIDC flow)

- `/` — **App Dashboard**. Shows assigned apps (all apps, if admin) as
  clickable launchers — each links to that client's `launchUrl`, not
  directly to `/authorize` (the client app owns its own PKCE
  `code_verifier`, so it needs to start the flow itself)
- `/settings` — change password, recent sign-ins (your own only)
- `/apps` — **admin-only.** Register new client apps, edit existing ones
  (`clientId` fixed after creation), and manage which users are assigned
  to each app
- `/users` — **admin-only.** Same assignment data as `/apps`, from the
  other direction — pick a user, manage which apps they're assigned to

## How a client app (e.g. Flow) connects

1. Register the app first, via `/apps` or directly in the `Clients` table.
   `/authorize` rejects any `client_id` or `redirect_uri` it doesn't
   recognize — and even a recognized one is denied per-user until assigned
   (see Access control above).
2. Client generates a PKCE `code_verifier`/`code_challenge` pair and
   redirects the browser to:
   ```
   /authorize?client_id=...&redirect_uri=...&response_type=code
     &code_challenge=...&code_challenge_method=S256&state=...
   ```
3. If not already logged in here, you'll see this app's own login form
   first, then get redirected back into the flow.
4. `sso-auth` redirects back to the client's `redirect_uri` with either
   `?code=...&state=...` (allowed) or `?error=access_denied&state=...`
   (not assigned) or `?error=login_required&state=...` (silent renewal
   with no session — only relevant if using `prompt=none`).
5. Client's **server** (not the browser) exchanges the code:
   ```
   POST /api/oidc/token
   { grant_type: "authorization_code", code, redirect_uri, client_id, code_verifier }
   ```
6. Response is `{ token_type: "Bearer", id_token, expires_in }`. Client
   verifies `id_token` against `/.well-known/jwks.json` — `aud` will be that
   client's own `client_id`.

Codes expire in 60 seconds and are single-use — a second exchange attempt
(replay, or a retry after a bad `code_verifier`) always fails with
`invalid_grant`.

## Notes

- ID tokens issued via `/api/oidc/token` last 1 hour. No refresh token —
  a client needs a fresh `/authorize` round trip once it expires (see
  `INTEGRATION.md` for the `prompt=none` silent-renewal pattern).
- This app's own internal session cookie (used only on its own pages) is
  separate from client ID tokens — audienced to `sso-auth-self`, lasts 7
  days, unrelated to any `client_id`.
- Role changes (`user` ↔ `admin`) are Airtable-manual only — no UI for this
  yet. Same for the very first admin: you have to set that row yourself.
- `AuditLog` is write-only for now — events are recorded but there's no
  dashboard page to read them back. Check Airtable directly if needed.
- The Airtable `consumeAuthCode` and assignment fetch-then-write operations
  aren't atomic, so there's a small race window under concurrent requests.
  Not a real concern at personal-use traffic levels.
