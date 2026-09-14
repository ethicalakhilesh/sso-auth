import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, updateClient } from "@/lib/airtable";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { parseRedirectUris } from "@/lib/client-validation";

/**
 * clientId is intentionally not accepted here — see updateClient's comment
 * in lib/airtable.ts for why it's immutable after creation.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Admin permission required" },
      { status: 403 }
    );
  }

  const session = await verifySession(token);

  if (!session) {
    return NextResponse.json(
      { error: "Admin permission required" },
      { status: 403 }
    );
  }

  const user = await findUserByUsername(session.preferred_username);

  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin permission required" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const redirectUrisRaw = String(body.redirectUris || "");

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

  await updateClient(params.id, {
    redirectUris,
    name: name || params.id,
  });

  return NextResponse.json({ ok: true });
}