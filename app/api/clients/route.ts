import { NextRequest, NextResponse } from "next/server";
import {
  listClients,
  createClient,
  findClientById,
  recordAuditEvent,
} from "@/lib/airtable";
import { requireAdmin } from "@/lib/require-admin";
import {
  isValidClientId,
  isValidLaunchUrl,
  parseRedirectUris,
} from "@/lib/client-validation";

/**
 * Protected implicitly by middleware.ts (any non-public path requires
 * sso-auth's own session cookie) — this is dashboard-only, not something
 * client apps call. Listing clients doesn't need admin (the App Dashboard
 * needs to read this for admins to see "all apps"), but mutating them does.
 */
export async function GET() {
  const clients = await listClients();
  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Admin permission required" },
      { status: 403 }
    );
  }

  const body = await req.json();

  const clientId = String(body.clientId || "")
    .trim()
    .toLowerCase();

  const name = String(body.name || "").trim();

  const redirectUrisRaw = String(body.redirectUris || "");

  const launchUrl = String(body.launchUrl || "").trim();

  const appSvgCode = String(body.appSvgCode || "").trim();

  if (!isValidClientId(clientId)) {
    return NextResponse.json(
      {
        error:
          "clientId must be 2-50 characters: lowercase letters, numbers, and hyphens only",
      },
      { status: 400 }
    );
  }

  const redirectUris = parseRedirectUris(redirectUrisRaw);

  if (!redirectUris) {
    return NextResponse.json(
      {
        error:
          "redirectUris must be one or more valid, absolute URLs (comma-separated)",
      },
      { status: 400 }
    );
  }

  if (!isValidLaunchUrl(launchUrl)) {
    return NextResponse.json(
      {
        error:
          "launchUrl must be an absolute https:// URL (http:// only for localhost/127.0.0.1)",
      },
      { status: 400 }
    );
  }

  // Optional field. If supplied, it must at least be SVG markup.
  if (
    appSvgCode &&
    (!/^<svg[\s>]/i.test(appSvgCode) ||
      !/<\/svg>\s*$/i.test(appSvgCode))
  ) {
    return NextResponse.json(
      {
        error:
          "appSvgCode must contain valid SVG markup starting with <svg and ending with </svg>",
      },
      { status: 400 }
    );
  }

  const existing = await findClientById(clientId);

  if (existing) {
    return NextResponse.json(
      {
        error: `A client with clientId "${clientId}" already exists`,
      },
      { status: 409 }
    );
  }

  const id = await createClient({
    clientId,
    redirectUris,
    name: name || clientId,
    launchUrl,
    appSvgCode,
  });

  recordAuditEvent({
    type: "client_created",
    actorUserId: admin.id,
    clientId,
  });

  return NextResponse.json(
    { id, clientId },
    { status: 201 }
  );
}