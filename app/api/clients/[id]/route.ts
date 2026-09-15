import { NextRequest, NextResponse } from "next/server";
import { updateClient, recordAuditEvent } from "@/lib/airtable";
import { requireAdmin } from "@/lib/require-admin";
import {
  isValidLaunchUrl,
  parseRedirectUris,
} from "@/lib/client-validation";

/**
 * clientId is intentionally not accepted here — see updateClient's comment
 * in lib/airtable.ts for why it's immutable after creation.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin(req);

  if (!admin) {
    return NextResponse.json(
      { error: "Admin permission required" },
      { status: 403 }
    );
  }

  const body = await req.json();

  const name = String(body.name || "").trim();

  const redirectUrisRaw = String(body.redirectUris || "");

  const launchUrl = String(body.launchUrl || "").trim();

  const appSvgCode = String(body.appSvgCode || "").trim();

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

  await updateClient(params.id, {
    redirectUris,
    name: name || params.id,
    launchUrl,
    appSvgCode,
  });

  recordAuditEvent({
    type: "client_updated",
    actorUserId: admin.id,
    clientId: params.id,
  });

  return NextResponse.json({ ok: true });
}