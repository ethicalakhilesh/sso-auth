"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/";
  // Only allow same-origin relative paths (must start with exactly one "/",
  // not "//" which browsers treat as protocol-relative to another host).
  // This is what stops /login?redirect=https://evil.com or
  // /login?redirect=//evil.com from sending a just-logged-in user off-site.
  const redirect =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden p-6">
      <RibbonBackground />

      <form
        onSubmit={handleSubmit}
        className="login-card-enter relative w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-2xl space-y-6"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#6C63FF] via-[#B368F7] to-[#FF6B81]">
            <PersonIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#F5F5F7]">
              Sign in
            </h1>
            <p className="mt-1 text-sm text-[#A1A1AA]">
              Enter your username and password
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Field
            id="username"
            icon={<PersonIcon className="h-4 w-4" />}
            placeholder="Username"
          >
            <input
              id="username"
              type="text"
              required
              minLength={3}
              maxLength={25}
              pattern="[a-z0-9._]{3,25}"
              autoComplete="username"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full bg-transparent text-sm text-[#F5F5F7] placeholder:text-[#71717A] outline-none"
            />
          </Field>

          <Field
            id="password"
            icon={<LockIcon className="h-4 w-4" />}
            placeholder="Password"
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            }
          >
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm text-[#F5F5F7] placeholder:text-[#71717A] outline-none"
            />
          </Field>
        </div>

        {error && (
          <p role="alert" className="text-sm text-[#FF8A8A]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-[#6C63FF] via-[#B368F7] to-[#FF6B81] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function Field({
  id,
  icon,
  trailing,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  placeholder: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 focus-within:border-white/30 transition-colors"
    >
      <span className="text-[#A1A1AA]">{icon}</span>
      {children}
      {trailing}
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
        d="M -100 900 C 250 780, 420 1000, 700 830 S 1150 560, 1300 700"
        fill="none"
        stroke="url(#ribbon-a)"
        strokeWidth="1"
        strokeOpacity="0.3"
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

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.5 19.5c1.2-3.4 4-5 7.5-5s6.3 1.6 7.5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect
        x="5"
        y="10.5"
        width="14"
        height="9.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M2.5 12S6 5.5 12 5.5c1.9 0 3.5.5 4.8 1.2M21.5 12S18 18.5 12 18.5c-1.9 0-3.5-.5-4.8-1.2M4 4l16 16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
