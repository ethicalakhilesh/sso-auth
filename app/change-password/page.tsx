"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden p-6">
      <RibbonBackground />

      <form
        onSubmit={handleSubmit}
        className="login-card-enter relative w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-2xl space-y-6"
      >
        <div className="text-center">
          <h1 className="text-lg font-semibold text-[#F5F5F7]">
            Change password
          </h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Update your sso-auth login
          </p>
        </div>

        <div className="space-y-3">
          <Field label="Current password">
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-transparent text-sm text-[#F5F5F7] placeholder:text-[#71717A] outline-none"
            />
          </Field>

          <Field label="New password">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-transparent text-sm text-[#F5F5F7] placeholder:text-[#71717A] outline-none"
            />
          </Field>

          <Field label="Confirm new password">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-transparent text-sm text-[#F5F5F7] placeholder:text-[#71717A] outline-none"
            />
          </Field>
        </div>

        {error && (
          <p role="alert" className="text-sm text-[#FF8A8A]">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="text-sm text-[#86EFAC]">
            Password updated.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-[#6C63FF] via-[#B368F7] to-[#FF6B81] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update password"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full text-center text-sm text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
        >
          Back
        </button>
      </form>
    </main>
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
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 focus-within:border-white/30 transition-colors">
        {children}
      </div>
    </label>
  );
}

function RibbonBackground() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      viewBox="0 0 1200 1200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ribbon-a" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6C63FF" />
          <stop offset="50%" stopColor="#B368F7" />
          <stop offset="100%" stopColor="#FF6B81" />
        </linearGradient>
        <linearGradient id="ribbon-b" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4FD1FF" />
          <stop offset="100%" stopColor="#6C63FF" />
        </linearGradient>
      </defs>
      <path
        d="M -100 850 C 200 700, 400 950, 650 780 S 1100 500, 1300 650"
        fill="none"
        stroke="url(#ribbon-a)"
        strokeWidth="2"
        strokeOpacity="0.5"
      />
      <path
        d="M 1300 200 C 1000 350, 850 100, 600 280 S 150 480, -100 320"
        fill="none"
        stroke="url(#ribbon-b)"
        strokeWidth="2"
        strokeOpacity="0.4"
      />
    </svg>
  );
}
