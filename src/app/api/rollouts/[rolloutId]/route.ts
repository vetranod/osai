// GET /api/rollouts/:rolloutId — return rollout meta for dashboard
import { getServiceRoleSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ rolloutId: string }> }
): Promise<Response> {
  const { rolloutId } = await params;
  const supabase = getServiceRoleSupabase();

  const { data, error } = await supabase
    .from("rollouts")
    .select(
      "id, rollout_mode, sensitivity_tier, needs_stabilization, " +
      "initiative_lead_name, initiative_lead_title, " +
      "approving_authority_name, approving_authority_title, " +
      "created_at"
    )
    .eq("id", rolloutId)
    .single();

  if (error || !data) {
    return Response.json({ ok: false, message: "Rollout not found." }, { status: 404 });
  }

  return Response.json({ ok: true, rollout: data });
}
