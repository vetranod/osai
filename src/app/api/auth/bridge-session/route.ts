import { z } from "zod";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";

export const runtime = "nodejs";

const BodySchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

export async function POST(request: Request): Promise<Response> {
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

  const supabase = await getSupabaseServerAuthClient();
  const { access_token, refresh_token } = parsed.data;

  const {
    data: { user: tokenUser },
    error: tokenError,
  } = await supabase.auth.getUser(access_token);
  if (tokenError || !tokenUser) {
    return Response.json(
      { ok: false, message: "Invalid access token." },
      { status: 401 }
    );
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (sessionError) {
    return Response.json(
      { ok: false, message: "Failed to bridge session.", details: sessionError.message },
      { status: 401 }
    );
  }

  return Response.json({
    ok: true,
    user_id: tokenUser.id,
  });
}
