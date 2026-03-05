import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/generate" ||
    pathname === "/auth/confirmed" ||
    pathname === "/rollouts" ||
    pathname.startsWith("/rollouts/") ||
    pathname === "/api/rollouts" ||
    pathname.startsWith("/api/rollouts/") ||
    pathname.startsWith("/api/billing/")
  );
}

function isApiPath(pathname: string): boolean {
  return (
    pathname === "/api/rollouts" ||
    pathname.startsWith("/api/rollouts/") ||
    pathname.startsWith("/api/checkout/") ||
    pathname.startsWith("/api/auth/") ||
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
  const { pathname, search } = request.nextUrl;
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

  let user: { id: string } | null = null;
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

  if (!user && isProtectedPath(pathname)) {
    if (isApiPath(pathname)) {
      // Allow API routes to proceed when caller provides a bearer token.
      // Route handlers can validate token directly even if auth cookie is stale/missing.
      if (hasBearerAuth) return response;
      return NextResponse.json(
        { ok: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
    const nextUrl = new URL(next, request.nextUrl.origin);
    const target = request.nextUrl.clone();
    target.pathname = nextUrl.pathname;
    target.search = nextUrl.search;
    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  matcher: [
    "/generate",
    "/auth/confirmed",
    "/rollouts/:path*",
    "/api/rollouts/:path*",
    "/api/checkout/:path*",
    "/api/auth/:path*",
    "/api/billing/:path*",
    "/login",
  ],
};
