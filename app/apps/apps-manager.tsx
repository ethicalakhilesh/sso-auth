"use client";

import { useState } from "react";
import Link from "next/link";

type OidcClient = {
  id: string;
  clientId: string;
  redirectUris: string[];
  name: string;
  launchUrl: string;
  appSvgCode: string;
};

type UserOption = {
  id: string;
  username: string;
  displayName: string;
};

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

    if (!res.ok) {
      return;
    }

    const data = await res.json();

    setClients(data.clients || []);
  }

  async function toggleAssignment(
    clientId: string,
    userId: string,
    shouldBeAssigned: boolean
  ) {
    setAssignmentsByClient((prev) => {
      const current = prev[clientId] || [];

      const next = shouldBeAssigned
        ? current.includes(userId)
          ? current
          : [...current, userId]
        : current.filter((id) => id !== userId);

      return {
        ...prev,
        [clientId]: next,
      };
    });

    if (shouldBeAssigned) {
      await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          clientId,
        }),
      });
    } else {
      await fetch(
        `/api/assignments?userId=${encodeURIComponent(
          userId
        )}&clientId=${encodeURIComponent(clientId)}`,
        {
          method: "DELETE",
        }
      );
    }
  }

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#71717A]">
              NOVA SSO
            </p>

            <h1 className="text-lg font-semibold text-[#F5F5F7]">
              Registered apps
            </h1>
          </div>

          <Link
            href="/"
            className="shrink-0 text-sm text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
          >
            Back
          </Link>
        </div>

        <div className="space-y-3">
          {clients.length === 0 && (
            <p className="text-sm text-[#71717A]">
              No apps registered yet.
            </p>
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
                assignedUserIds={
                  assignmentsByClient[client.clientId] || []
                }
                managingAccess={
                  managingAccessId === client.id
                }
                onToggleManageAccess={() =>
                  setManagingAccessId(
                    managingAccessId === client.id
                      ? null
                      : client.id
                  )
                }
                onToggleAssignment={(userId, assigned) =>
                  toggleAssignment(
                    client.clientId,
                    userId,
                    assigned
                  )
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
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full min-h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#A1A1AA] hover:text-[#F5F5F7] hover:border-white/20 transition-colors"
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
  onToggleAssignment: (
    userId: string,
    assigned: boolean
  ) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ClientIcon
            name={client.name}
            svgCode={client.appSvgCode}
          />

          <div className="min-w-0">
            <p className="text-sm font-medium text-[#F5F5F7] truncate">
              {client.name}
            </p>

            <p className="text-xs text-[#71717A] truncate">
              clientId: {client.clientId}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleManageAccess}
              className="min-h-9 rounded-lg px-2.5 text-xs text-[#A1A1AA] hover:text-[#F5F5F7] hover:bg-white/[0.05] transition-colors"
            >
              Access
            </button>

            <button
              type="button"
              onClick={onEdit}
              className="min-h-9 rounded-lg px-2.5 text-xs text-[#A1A1AA] hover:text-[#F5F5F7] hover:bg-white/[0.05] transition-colors"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      <ul className="text-xs text-[#71717A] space-y-0.5">
        {client.redirectUris.map((uri) => (
          <li
            key={uri}
            className="truncate"
          >
            {uri}
          </li>
        ))}
      </ul>

      {client.launchUrl && (
        <p className="text-xs text-[#71717A] truncate">
          Launch: {client.launchUrl}
        </p>
      )}

      {isAdmin && managingAccess && (
        <div className="pt-3 mt-2 border-t border-white/10 space-y-2">
          <p className="text-xs text-[#A1A1AA]">
            Assigned users
          </p>

          {users.length === 0 && (
            <p className="text-xs text-[#71717A]">
              No users yet.
            </p>
          )}

          {users.map((u) => {
            const checked = assignedUserIds.includes(u.id);

            return (
              <label
                key={u.id}
                className="flex items-center gap-3 min-h-10 text-xs text-[#F5F5F7] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    onToggleAssignment(
                      u.id,
                      e.target.checked
                    )
                  }
                  className="h-4 w-4 accent-[#B368F7]"
                />

                <span className="truncate">
                  {u.displayName}
                </span>
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
  const [appSvgCode, setAppSvgCode] = useState("");

  const [error, setError] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          name,
          redirectUris,
          launchUrl,
          appSvgCode,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        setError(
          data.error || "Something went wrong"
        );

        return;
      }

      onSaved();
    } catch {
      setError(
        "Unable to register the app. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold text-[#F5F5F7]">
          Register application
        </h2>

        <p className="mt-1 text-xs text-[#71717A]">
          Add the application's OIDC configuration and
          optional SVG icon.
        </p>
      </div>

      <FormField label="Client ID">
        <input
          type="text"
          required
          name="clientId"
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. flow"
          value={clientId}
          onChange={(e) =>
            setClientId(
              e.target.value.toLowerCase()
            )
          }
          className={inputClassName}
        />
      </FormField>

      <FormField label="Display name">
        <input
          type="text"
          name="name"
          placeholder="e.g. Flow"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          className={inputClassName}
        />
      </FormField>

      <FormField label="Redirect URIs (comma-separated)">
        <input
          type="text"
          required
          name="redirectUris"
          inputMode="url"
          placeholder="https://flow.example.com/api/auth/callback"
          value={redirectUris}
          onChange={(e) =>
            setRedirectUris(e.target.value)
          }
          className={inputClassName}
        />
      </FormField>

      <FormField label="Launch URL">
        <input
          type="text"
          required
          name="launchUrl"
          inputMode="url"
          placeholder="https://flow.example.com/api/auth/login"
          value={launchUrl}
          onChange={(e) =>
            setLaunchUrl(e.target.value)
          }
          className={inputClassName}
        />
      </FormField>

      <SvgCodeField
        value={appSvgCode}
        onChange={setAppSvgCode}
      />

      {error && (
        <p
          role="alert"
          className="text-xs text-[#FF8A8A]"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full border border-white/10 px-4 py-2 text-sm text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="flex-1 min-h-11 rounded-full bg-gradient-to-r from-[#6C63FF] via-[#B368F7] to-[#FF6B81] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add app"}
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

  const [redirectUris, setRedirectUris] =
    useState(client.redirectUris.join(","));

  const [launchUrl, setLaunchUrl] = useState(
    client.launchUrl
  );

  const [appSvgCode, setAppSvgCode] = useState(
    client.appSvgCode || ""
  );

  const [error, setError] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/clients/${client.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            redirectUris,
            launchUrl,
            appSvgCode,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        setError(
          data.error || "Something went wrong"
        );

        return;
      }

      onSaved();
    } catch {
      setError(
        "Unable to save the app. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/20 bg-white/[0.06] p-4 sm:p-5 space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold text-[#F5F5F7]">
          Edit application
        </h2>

        <p className="mt-1 text-xs text-[#71717A]">
          Update the application's display and launch
          configuration.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2.5">
        <p className="text-[11px] uppercase tracking-wider text-[#71717A]">
          Client ID
        </p>

        <p className="mt-1 text-sm text-[#A1A1AA] break-all">
          {client.clientId}
        </p>

        <p className="mt-1 text-[11px] text-[#52525B]">
          Client IDs are intentionally not editable.
        </p>
      </div>

      <FormField label="Display name">
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          className={inputClassName}
        />
      </FormField>

      <FormField label="Redirect URIs (comma-separated)">
        <input
          type="text"
          required
          name="redirectUris"
          inputMode="url"
          value={redirectUris}
          onChange={(e) =>
            setRedirectUris(e.target.value)
          }
          className={inputClassName}
        />
      </FormField>

      <FormField label="Launch URL">
        <input
          type="text"
          required
          name="launchUrl"
          inputMode="url"
          value={launchUrl}
          onChange={(e) =>
            setLaunchUrl(e.target.value)
          }
          className={inputClassName}
        />
      </FormField>

      <SvgCodeField
        value={appSvgCode}
        onChange={setAppSvgCode}
      />

      {error && (
        <p
          role="alert"
          className="text-xs text-[#FF8A8A]"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full border border-white/10 px-4 py-2 text-sm text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="flex-1 min-h-11 rounded-full bg-gradient-to-r from-[#6C63FF] via-[#B368F7] to-[#FF6B81] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function SvgCodeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label
          htmlFor="appSvgCode"
          className="text-xs text-[#A1A1AA]"
        >
          App SVG code
        </label>

        <p className="mt-1 text-[11px] leading-4 text-[#71717A]">
          Paste the raw SVG markup for this application's
          icon. Do not upload an SVG file.
        </p>
      </div>

      <textarea
        id="appSvgCode"
        name="appSvgCode"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder={'<svg viewBox="0 0 24 24">...</svg>'}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        rows={7}
        className="w-full resize-y rounded-xl border border-white/10 bg-black/10 px-3 py-3 font-mono text-xs leading-5 text-[#F5F5F7] placeholder:text-[#52525B] outline-none focus:border-white/30 transition-colors"
      />

      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-[#52525B]">
          {value.length.toLocaleString()} characters
        </span>

        <SvgPreview svgCode={value} />
      </div>
    </div>
  );
}

function SvgPreview({
  svgCode,
}: {
  svgCode: string;
}) {
  const cleanedSvg = sanitizeSvgMarkup(svgCode);

  if (!cleanedSvg) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-[#52525B]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-white/10">
          —
        </span>

        <span>No valid SVG preview</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-[#71717A]">
        Preview
      </span>

      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] p-2 text-white [&_svg]:h-full [&_svg]:w-full"
        aria-label="SVG preview"
        dangerouslySetInnerHTML={{
          __html: cleanedSvg,
        }}
      />
    </div>
  );
}

function ClientIcon({
  name,
  svgCode,
}: {
  name: string;
  svgCode?: string;
}) {
  const cleanedSvg = sanitizeSvgMarkup(svgCode);

  if (cleanedSvg) {
    return (
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] p-2 text-white [&_svg]:h-full [&_svg]:w-full"
        aria-hidden="true"
        dangerouslySetInnerHTML={{
          __html: cleanedSvg,
        }}
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-[#F5F5F7]">
      {name.trim().charAt(0).toUpperCase() || "A"}
    </div>
  );
}

function sanitizeSvgMarkup(value?: string) {
  if (!value) {
    return "";
  }

  const svg = value.trim();

  if (!svg) {
    return "";
  }

  if (!/^<svg[\s>]/i.test(svg)) {
    return "";
  }

  if (!/<\/svg>\s*$/i.test(svg)) {
    return "";
  }

  if (
    /<script\b/i.test(svg) ||
    /\bon[a-z]+\s*=/i.test(svg) ||
    /javascript\s*:/i.test(svg) ||
    /<iframe\b/i.test(svg) ||
    /<object\b/i.test(svg) ||
    /<embed\b/i.test(svg) ||
    /<foreignObject\b/i.test(svg)
  ) {
    return "";
  }

  return svg;
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-[#A1A1AA]">
        {label}
      </span>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 focus-within:border-white/30 transition-colors">
        {children}
      </div>
    </label>
  );
}

const inputClassName =
  "w-full min-h-7 bg-transparent text-sm text-[#F5F5F7] placeholder:text-[#71717A] outline-none";