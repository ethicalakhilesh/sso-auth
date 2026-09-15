"use client";

import { useState } from "react";
import Link from "next/link";

type UserOption = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "user";
};
type ClientOption = { clientId: string; name: string };

export function UsersManager({
  users,
  clients,
  initialAssignmentsByUser,
}: {
  users: UserOption[];
  clients: ClientOption[];
  initialAssignmentsByUser: Record<string, string[]>;
}) {
  const [assignmentsByUser, setAssignmentsByUser] = useState(
    initialAssignmentsByUser
  );
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  async function toggleAssignment(
    userId: string,
    clientId: string,
    shouldBeAssigned: boolean
  ) {
    setAssignmentsByUser((prev) => {
      const current = prev[userId] || [];
      const next = shouldBeAssigned
        ? [...current, clientId]
        : current.filter((id) => id !== clientId);
      return { ...prev, [userId]: next };
    });

    if (shouldBeAssigned) {
      await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, clientId }),
      });
    } else {
      await fetch(
        `/api/assignments?userId=${encodeURIComponent(userId)}&clientId=${encodeURIComponent(clientId)}`,
        { method: "DELETE" }
      );
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[#F5F5F7]">Users</h1>
          <Link
            href="/"
            className="text-sm text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
          >
            Back
          </Link>
        </div>

        <div className="space-y-3">
          {users.length === 0 && (
            <p className="text-sm text-[#71717A]">No users yet.</p>
          )}

          {users.map((user) => {
            const assignedClientIds = assignmentsByUser[user.id] || [];
            const expanded = expandedUserId === user.id;

            return (
              <div
                key={user.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#F5F5F7]">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-[#71717A]">
                      @{user.username} · {user.role}
                    </p>
                  </div>

                  {user.role === "admin" ? (
                    <span className="text-xs text-[#71717A]">
                      All apps (admin)
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        setExpandedUserId(expanded ? null : user.id)
                      }
                      className="text-xs text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
                    >
                      Apps
                    </button>
                  )}
                </div>

                {user.role !== "admin" && expanded && (
                  <div className="pt-2 mt-2 border-t border-white/10 space-y-1.5">
                    {clients.length === 0 && (
                      <p className="text-xs text-[#71717A]">
                        No apps registered yet.
                      </p>
                    )}
                    {clients.map((client) => {
                      const checked = assignedClientIds.includes(
                        client.clientId
                      );
                      return (
                        <label
                          key={client.clientId}
                          className="flex items-center gap-2 text-xs text-[#F5F5F7] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              toggleAssignment(
                                user.id,
                                client.clientId,
                                e.target.checked
                              )
                            }
                            className="accent-[#B368F7]"
                          />
                          {client.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
