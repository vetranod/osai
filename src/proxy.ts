import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/generate" ||
    pathname === "/rollouts" ||
    pathname.startsWith("/rollouts/") ||
    pathname === "/api/rollouts" ||
    pathname.startsWith("/api/rollouts/") ||
    pathname === "/api/checkout/start" ||
    pathname === "/api/checkout/session" ||
    pathname.startsWith("/api/billing/")
  );
}

function isApiPath(pathname: string): boolean {
  return (
    pathname === "/api/rollouts" ||
    pathname.startsWith("/api/rollouts/") ||
    pathname === "/api/checkout/start" ||
    pathname === "/api/checkout/session" ||
    pathname.startsWith("/api/billing/")
  );
}

function sanitizeNextPath(raw: string | null): string {
  if (!raw) return "/generate";
  if (!raw.startsWith("/")) return "/generate";
  if (raw.startsWith("//")) return "/generate";
  return raw;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
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
    const target = request.nextUrl.clone();
    target.pathname = next;
    target.search = "";
    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  matcher: ["/generate", "/rollouts/:path*", "/api/rollouts/:path*", "/api/checkout/:path*", "/api/billing/:path*", "/login"],
};
