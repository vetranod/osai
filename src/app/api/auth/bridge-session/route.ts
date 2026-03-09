import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

export const runtime = "nodejs";

const BodySchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, message: "Invalid body.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { access_token, refresh_token } = parsed.data;
  const requestHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    new URL(request.url).host;
  const appHost = (() => {
    try {
      const app = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL;
      return app ? new URL(app).host : null;
    } catch {
      return null;
    }
  })();

  // Collect cookies that Supabase wants to set, then write them directly onto
  // the NextResponse — cookies().set() in Next.js 16 Route Handlers does not
  // reliably attach to the returned response object.
  const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options: options as CookieOptions });
        });
      },
    },
  });

  const {
    data: { user: tokenUser },
    error: tokenError,
  } = await supabase.auth.getUser(access_token);
  if (tokenError || !tokenUser) {
    return Response.json(
      {
        ok: false,
        message: "Invalid access token.",
        reason: "invalid_access_token",
        details: tokenError?.message ?? null,
        request_host: requestHost,
        app_host: appHost,
      },
      { status: 401 }
    );
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (sessionError) {
    return Response.json(
      {
        ok: false,
        message: "Failed to bridge session.",
        reason: "set_session_failed",
        details: sessionError.message,
        request_host: requestHost,
        app_host: appHost,
      },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    user_id: tokenUser.id,
    request_host: requestHost,
    app_host: appHost,
  });

  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
