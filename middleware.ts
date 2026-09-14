import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isAuthorize = req.nextUrl.pathname.startsWith("/authorize");
  const isSilentAuthorize =
    isAuthorize && req.nextUrl.searchParams.get("prompt") === "none";

  const isPublicPath =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/api/auth/login") ||
    req.nextUrl.pathname.startsWith("/.well-known/") ||
    req.nextUrl.pathname.startsWith("/api/oidc/") ||
    // Only silent OIDC authorization bypasses the normal login redirect.
    // Normal /authorize requests must continue through /login so the
    // existing session/login flow can resume correctly.
    (isAuthorize && isSilentAuthorize);

  if (!session && !isPublicPath) {
    const loginUrl = new URL("/login", req.url);

    // Preserve the complete authorization request, including:
    // client_id, redirect_uri, code_challenge, state, etc.
    loginUrl.searchParams.set(
      "redirect",
      req.nextUrl.pathname + req.nextUrl.search
    );

    return NextResponse.redirect(loginUrl);
  }

  if (session && req.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};