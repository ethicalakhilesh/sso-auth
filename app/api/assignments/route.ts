import { NextRequest, NextResponse } from "next/server";
import {
  findUserById,
  findClientById,
  listAssignmentsForUser,
  listAssignmentsForClient,
  createAssignment,
  deleteAssignment,
  recordAuditEvent,
} from "@/lib/airtable";
import { requireAdmin } from "@/lib/require-admin";

/**
 * Every operation here independently checks requireAdmin — Finding 10:
 * a normal user must never be able to grant/revoke access through a
 * crafted API request, even if the UI never exposes these controls to them.
 */

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { error: "Admin permission required" },
      { status: 403 }
    );
  }

  const userId = req.nextUrl.searchParams.get("userId");
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (userId) {
    return NextResponse.json({ assignments: await listAssignmentsForUser(userId) });
  }
  if (clientId) {
    return NextResponse.json({ assignments: await listAssignmentsForClient(clientId) });
  }

  return NextResponse.json(
    { error: "Provide either ?userId= or ?clientId=" },
    { status: 400 }
  );
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
  const userId = String(body.userId || "").trim();
  const clientId = String(body.clientId || "").trim();

  if (!userId || !clientId) {
    return NextResponse.json(
      { error: "userId and clientId are required" },
      { status: 400 }
    );
  }

  const [targetUser, targetClient] = await Promise.all([
    findUserById(userId),
    findClientById(clientId),
  ]);

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!targetClient) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  await createAssignment(userId, clientId, admin.id);

  recordAuditEvent({
    type: "assignment_created",
    actorUserId: admin.id,
    targetUserId: userId,
    clientId,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { error: "Admin permission required" },
      { status: 403 }
    );
  }

  const userId = req.nextUrl.searchParams.get("userId");
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (!userId || !clientId) {
    return NextResponse.json(
      { error: "userId and clientId are required" },
      { status: 400 }
    );
  }

  await deleteAssignment(userId, clientId);

  recordAuditEvent({
    type: "assignment_removed",
    actorUserId: admin.id,
    targetUserId: userId,
    clientId,
  });

  return NextResponse.json({ ok: true });
}
