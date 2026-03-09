import { getServiceRoleSupabase } from "@/lib/supabase-server";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";

export const runtime = "nodejs";

function getAdminEmail(): string {
  return (process.env.OSAI_ADMIN_EMAIL ?? "").trim().toLowerCase();
}

export async function POST(request: Request): Promise<Response> {
  // Must be authenticated as the admin account.
  const supabase = await getSupabaseServerAuthClient();
  const cookieResult = await supabase.auth.getUser();
  let resolvedUser = cookieResult.data.user;
  const cookieError = cookieResult.error?.message ?? null;

  const authHeader = request.headers.get("authorization");
  let bearerError: string | null = null;

  // Fall back to bearer token if SSR cookies aren't hydrated.
  if (!resolvedUser) {
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (token) {
      const bearerResult = await supabase.auth.getUser(token);
      resolvedUser = bearerResult.data.user ?? null;
      bearerError = bearerResult.error?.message ?? null;
    }
  }

  const user = resolvedUser;
  if (!user || !user.email) {
    return Response.json(
      {
        ok: false,
        message: "Authentication required.",
        debug: {
          cookie_error: cookieError,
          had_auth_header: Boolean(authHeader),
          auth_header_prefix: authHeader ? authHeader.slice(0, 20) : null,
          bearer_error: bearerError,
          host: request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? null,
        },
      },
      { status: 401 }
    );
  }

  const adminEmail = getAdminEmail();
  if (!adminEmail || user.email.trim().toLowerCase() !== adminEmail) {
    return Response.json({ ok: false, message: "Not authorized." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const email =
    typeof (body as Record<string, unknown>).email === "string"
      ? ((body as Record<string, unknown>).email as string).trim().toLowerCase()
      : "";

  if (!email || !email.includes("@")) {
    return Response.json({ ok: false, message: "Valid email required." }, { status: 400 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.SITE_URL ?? "https://deploysure.com";
  const redirectTo = `${appUrl}/auth/callback?next=/demo/generate`;

  const admin = getServiceRoleSupabase();

  const { data: inviteData, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { demo_access: true }, // user_metadata
    redirectTo,
  });

  if (error) {
    return Response.json({ ok: false, message: error.message }, { status: 500 });
  }

  // Also stamp app_metadata (tamper-proof — only writable via service role).
  if (inviteData.user?.id) {
    await admin.auth.admin.updateUserById(inviteData.user.id, {
      app_metadata: { demo_access: true },
    });
  }

  return Response.json({ ok: true, email });
}
