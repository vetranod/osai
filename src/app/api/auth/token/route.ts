import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const supabase = await getSupabaseServerAuthClient();

  // getUser() validates with the Supabase server and refreshes expired tokens
  // using the refresh token in SSR cookies. getSession() alone only does a
  // local JWT decode and returns null on expiry without attempting a refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return Response.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  return Response.json({ ok: true, access_token: session.access_token });
}
