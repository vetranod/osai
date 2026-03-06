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
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.session || !data.user) {
    return Response.json(
      {
        ok: false,
        message: error?.message ?? "Sign-in failed.",
      },
      { status: 401 }
    );
  }

  return Response.json({
    ok: true,
    user_id: data.user.id,
    email: data.user.email ?? null,
  });
}
