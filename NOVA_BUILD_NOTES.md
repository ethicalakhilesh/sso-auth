# NOVA SSO dashboard build

This package contains the dashboard UI replacement prepared against sso-auth
main commit `f598da3841d1371674611cd543d6a9366c12ba8e`.

Files:
- `app/page.tsx` — NOVA dashboard
- `app/globals.css` — NOVA dashboard styling

The existing authentication, OIDC, Airtable, assignment, role, audit-log,
session-history, and device-detection code is intentionally not duplicated
here. Replace the corresponding files in your current sso-auth checkout.

The dashboard preserves:
- admin-only `/apps` and `/users`
- assigned-app filtering for normal users
- recent sign-in/device history
- `/settings` password and history flow
- existing `/authorize` security boundary

No secrets or `.env` values are included.
