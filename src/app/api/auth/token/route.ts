import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const supabase = await getSupabaseServerAuthClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return Response.json(
      {
        ok: false,
        message: "Authentication required.",
      },
      { status: 401 }
    );
  }

  return Response.json({
    ok: true,
    access_token: session.access_token,
  });
}
