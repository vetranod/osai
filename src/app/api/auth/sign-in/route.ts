import { z } from "zod";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Email and password are required." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const supabase = await getSupabaseServerAuthClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return Response.json(
      { ok: false, message: error?.message ?? "Sign-in failed." },
      { status: 401 }
    );
  }

  // SSR auth cookies are written automatically via getSupabaseServerAuthClient's
  // setAll callback — no explicit bridge call needed from the client.
  // We also return the tokens so the browser can sync its own Supabase state.
  return Response.json({
    ok: true,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? null,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      email_confirmed_at: data.user.email_confirmed_at ?? null,
    },
  });
}
