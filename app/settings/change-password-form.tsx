"use client";

import { useState } from "react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3"
    >
      <Field label="Current password">
        <input
          type="password"
          required
          name="currentPassword"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full bg-transparent text-sm text-[#F5F5F7] outline-none"
        />
      </Field>

      <Field label="New password">
        <input
          type="password"
          required
          minLength={8}
          name="newPassword"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full bg-transparent text-sm text-[#F5F5F7] outline-none"
        />
      </Field>

      <Field label="Confirm new password">
        <input
          type="password"
          required
          minLength={8}
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full bg-transparent text-sm text-[#F5F5F7] outline-none"
        />
      </Field>

      {error && (
        <p role="alert" className="text-xs text-[#FF8A8A]">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-xs text-[#86EFAC]">
          Password updated.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-gradient-to-r from-[#6C63FF] via-[#B368F7] to-[#FF6B81] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

function Field({
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
