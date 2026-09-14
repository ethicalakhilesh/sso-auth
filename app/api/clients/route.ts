import { NextRequest, NextResponse } from "next/server";
import {
  findUserByUsername,
  listClients,
  createClient,
  findClientById,
} from "@/lib/airtable";
import {
  SESSION_COOKIE,
  verifySession,
} from "@/lib/auth";
import { isValidClientId, parseRedirectUris } from "@/lib/client-validation";

/**
 * Protected implicitly by middleware.ts (any non-public path requires
 * sso-auth's own session cookie) — this is dashboard-only, not something
 * client apps call.
 */
export async function GET() {
  const clients = await listClients();
  return NextResponse.json({ clients });
}

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await verifySession(token);

  if (!session) {
    return null;
  }

  const user = await findUserByUsername(session.preferred_username);

  if (!user || user.role !== "admin") {
    return null;
  }

  return user;
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
  const clientId = String(body.clientId || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const redirectUrisRaw = String(body.redirectUris || "");

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

  const existing = await findClientById(clientId);

  if (existing) {
    return NextResponse.json(
      { error: `A client with clientId "${clientId}" already exists` },
      { status: 409 }
    );
  }

  const id = await createClient({
    clientId,
    redirectUris,
    name: name || clientId,
  });

  return NextResponse.json({ id, clientId }, { status: 201 });
}