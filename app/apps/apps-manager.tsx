"use client";

import { useState } from "react";
import Link from "next/link";

type OidcClient = {
  id: string;
  clientId: string;
  redirectUris: string[];
  name: string;
  launchUrl: string;
};

type UserOption = { id: string; username: string; displayName: string };

export function AppsManager({
  initialClients,
  isAdmin,
  users,
  initialAssignmentsByClient,
}: {
  initialClients: OidcClient[];
  isAdmin: boolean;
  users: UserOption[];
  initialAssignmentsByClient: Record<string, string[]>;
}) {
  const [clients, setClients] = useState(initialClients);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [assignmentsByClient, setAssignmentsByClient] = useState(
    initialAssignmentsByClient
  );
  const [managingAccessId, setManagingAccessId] = useState<string | null>(
    null
  );

  async function refresh() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data.clients);
  }

  async function toggleAssignment(
    clientId: string,
    userId: string,
    shouldBeAssigned: boolean
  ) {
    // Optimistic update — this is an admin-only, low-stakes toggle; a
    // failed request just gets corrected on next refresh rather than
    // blocking the UI on a round trip.
    setAssignmentsByClient((prev) => {
      const current = prev[clientId] || [];
      const next = shouldBeAssigned
        ? [...current, userId]
        : current.filter((id) => id !== userId);
      return { ...prev, [clientId]: next };
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
          <h1 className="text-lg font-semibold text-[#F5F5F7]">
            Registered apps
          </h1>
          <Link
            href="/"
            className="text-sm text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
          >
            Back
          </Link>
        </div>

        <div className="space-y-3">
          {clients.length === 0 && (
            <p className="text-sm text-[#71717A]">No apps registered yet.</p>
          )}

          {clients.map((client) =>
            editingId === client.id && isAdmin ? (
              <EditClientForm
                key={client.id}
                client={client}
                onSaved={() => {
                  setEditingId(null);
                  refresh();
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ClientRow
                key={client.id}
                client={client}
                isAdmin={isAdmin}
                onEdit={() => setEditingId(client.id)}
                users={users}
                assignedUserIds={assignmentsByClient[client.clientId] || []}
                managingAccess={managingAccessId === client.id}
                onToggleManageAccess={() =>
                  setManagingAccessId(
                    managingAccessId === client.id ? null : client.id
                  )
                }
                onToggleAssignment={(userId, assigned) =>
                  toggleAssignment(client.clientId, userId, assigned)
                }
              />
            )
          )}
        </div>

        {isAdmin &&
          (showAddForm ? (
            <AddClientForm
              onSaved={() => {
                setShowAddForm(false);
                refresh();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#A1A1AA] hover:text-[#F5F5F7] hover:border-white/20 transition-colors"
            >
              + Register new app
            </button>
          ))}
      </div>
    </main>
  );
}

function ClientRow({
  client,
  isAdmin,
  onEdit,
  users,
  assignedUserIds,
  managingAccess,
  onToggleManageAccess,
  onToggleAssignment,
}: {
  client: OidcClient;
  isAdmin: boolean;
  onEdit: () => void;
  users: UserOption[];
  assignedUserIds: string[];
  managingAccess: boolean;
  onToggleManageAccess: () => void;
  onToggleAssignment: (userId: string, assigned: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#F5F5F7] truncate">
          {client.name}
        </p>

        {isAdmin && (
          <div className="flex gap-3 shrink-0">
            <button
              onClick={onToggleManageAccess}
              className="text-xs text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
            >
              Access
            </button>
            <button
              onClick={onEdit}
              className="text-xs text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-[#71717A]">clientId: {client.clientId}</p>

      <ul className="text-xs text-[#71717A] space-y-0.5">
        {client.redirectUris.map((uri) => (
          <li key={uri} className="truncate">
            {uri}
          </li>
        ))}
      </ul>

      {isAdmin && managingAccess && (
        <div className="pt-2 mt-2 border-t border-white/10 space-y-1.5">
          <p className="text-xs text-[#A1A1AA] mb-1">Assigned users</p>
          {users.length === 0 && (
            <p className="text-xs text-[#71717A]">No users yet.</p>
          )}
          {users.map((u) => {
            const checked = assignedUserIds.includes(u.id);
            return (
              <label
                key={u.id}
                className="flex items-center gap-2 text-xs text-[#F5F5F7] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onToggleAssignment(u.id, e.target.checked)}
                  className="accent-[#B368F7]"
                />
                {u.displayName}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddClientForm({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [redirectUris, setRedirectUris] = useState("");
  const [launchUrl, setLaunchUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, name, redirectUris, launchUrl }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      return;
    }

    onSaved();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3"
    >
      <FormField label="Client ID">
        <input
          type="text"
          required
          name="clientId"
          spellCheck={false}
          placeholder="e.g. flow"
          value={clientId}
          onChange={(e) => setClientId(e.target.value.toLowerCase())}
          className="w-full bg-transparent text-sm text-[#F5F5F7] placeholder:text-[#71717A] outline-none"
        />
      </FormField>

      <FormField label="Display name">
        <input
          type="text"
          name="name"
          placeholder="e.g. Flow"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-transparent text-sm text-[#F5F5F7] placeholder:text-[#71717A] outline-none"
        />
      </FormField>

      <FormField label="Redirect URIs (comma-separated)">
        <input
          type="text"
          required
          name="redirectUris"
          placeholder="https://flow.yourdomain.com/api/auth/callback"
          value={redirectUris}
          onChange={(e) => setRedirectUris(e.target.value)}
          className="w-full bg-transparent text-sm text-[#F5F5F7] placeholder:text-[#71717A] outline-none"
        />
      </FormField>

      <FormField label="Launch URL (app's own login-start page)">
        <input
          type="text"
          required
          name="launchUrl"
          placeholder="https://flow.yourdomain.com/api/auth/login"
          value={launchUrl}
          onChange={(e) => setLaunchUrl(e.target.value)}
          className="w-full bg-transparent text-sm text-[#F5F5F7] placeholder:text-[#71717A] outline-none"
        />
      </FormField>

      {error && <p className="text-xs text-[#FF8A8A]">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-full bg-gradient-to-r from-[#6C63FF] via-[#B368F7] to-[#FF6B81] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add app"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function EditClientForm({
  client,
  onSaved,
  onCancel,
}: {
  client: OidcClient;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(client.name);
  const [redirectUris, setRedirectUris] = useState(
    client.redirectUris.join(",")
  );
  const [launchUrl, setLaunchUrl] = useState(client.launchUrl);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, redirectUris, launchUrl }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      return;
    }

    onSaved();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/20 bg-white/[0.06] p-4 space-y-3"
    >
      <p className="text-xs text-[#71717A]">
        clientId: {client.clientId} (not editable)
      </p>

      <FormField label="Display name">
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-transparent text-sm text-[#F5F5F7] outline-none"
        />
      </FormField>

      <FormField label="Redirect URIs (comma-separated)">
        <input
          type="text"
          required
          name="redirectUris"
          value={redirectUris}
          onChange={(e) => setRedirectUris(e.target.value)}
          className="w-full bg-transparent text-sm text-[#F5F5F7] outline-none"
        />
      </FormField>

      <FormField label="Launch URL (app's own login-start page)">
        <input
          type="text"
          required
          name="launchUrl"
          value={launchUrl}
          onChange={(e) => setLaunchUrl(e.target.value)}
          className="w-full bg-transparent text-sm text-[#F5F5F7] outline-none"
        />
      </FormField>

      {error && <p className="text-xs text-[#FF8A8A]">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-full bg-gradient-to-r from-[#6C63FF] via-[#B368F7] to-[#FF6B81] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-[#A1A1AA]">{label}</span>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 focus-within:border-white/30 transition-colors">
        {children}
      </div>
    </label>
  );
}
