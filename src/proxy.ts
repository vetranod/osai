import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

function isProtectedApiPath(pathname: string): boolean {
  return (
    pathname === "/api/rollouts" ||
    pathname.startsWith("/api/rollouts/") ||
    pathname.startsWith("/api/billing/")
  );
}

function sanitizeNextPath(raw: string | null): string {
  if (!raw) return "/generate";
  if (!raw.startsWith("/")) return "/generate";
  if (raw.startsWith("//")) return "/generate";
  return raw;
}

function getCanonicalHost(): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL;
  if (!appUrl) return null;
  try {
    return new URL(appUrl).host;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const hasBearerAuth = request.headers.get("authorization")?.startsWith("Bearer ") ?? false;
  const canonicalHost = getCanonicalHost();
  const requestHost = request.nextUrl.host;

  // Prevent split auth sessions between hosts (e.g., apex vs www).
  if (canonicalHost && canonicalHost !== requestHost) {
    const redirect = request.nextUrl.clone();
    redirect.host = canonicalHost;
    return NextResponse.redirect(redirect, 307);
  }

  let response = NextResponse.next({
    request,
  });

  // Only call getUser() when we actually need the result.  Calling it
  // unconditionally on every matched route (including page routes like
  // /rollouts/:path*) is dangerous: @supabase/ssr's setAll callback fires on
  // any token-refresh attempt, and a failed refresh writes empty Set-Cookie
  // headers that WIPE the SSR auth cookies before the page handler runs.
  //
  // We only need to know the user for:
  //   (a) protected API paths that don't carry their own bearer token — to
  //       return 401 before hitting the route handler
  //   (b) the login page — to redirect an already-authenticated user away
  //
  // All other routes (page routes, API routes with bearer auth) handle their
  // own auth checks without needing the middleware to validate cookies.
  const needsUserCheck = (isProtectedApiPath(pathname) && !hasBearerAuth) || pathname === "/login";

  let user: { id: string } | null = null;
  if (needsUserCheck) {
    try {
      const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      });

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      user = currentUser ? { id: currentUser.id } : null;
    } catch {
      user = null;
    }
  }

  if (!user && isProtectedApiPath(pathname)) {
    // Allow API routes to proceed when caller provides a bearer token.
    // Route handlers can validate token directly even if auth cookie is stale/missing.
    if (hasBearerAuth) return response;
    return NextResponse.json(
      { ok: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  if (user && pathname === "/login") {
    // If the user was redirected here because of a session error (e.g. a stale
    // SSR cookie that the dashboard rejected), let the login page render so they
    // can sign in fresh and get new tokens.  Without this guard the proxy would
    // immediately bounce them back to the failing destination and create an
    // infinite redirect loop.
    const authError = request.nextUrl.searchParams.get("auth_error");
    if (!authError) {
      const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
      const nextUrl = new URL(next, request.nextUrl.origin);
      const target = request.nextUrl.clone();
      target.pathname = nextUrl.pathname;
      target.search = nextUrl.search;
      return NextResponse.redirect(target);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/generate",
    "/demo/generate",
    "/auth/confirmed",
    "/rollouts/:path*",
    "/admin/:path*",
    "/api/rollouts/:path*",
    "/api/checkout/:path*",
    "/api/auth/:path*",
    "/api/billing/:path*",
    "/api/admin/:path*",
    "/login",
  ],
};
