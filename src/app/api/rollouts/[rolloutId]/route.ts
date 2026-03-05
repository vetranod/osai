// GET /api/rollouts/:rolloutId - return rollout meta for dashboard
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import { getServiceRoleSupabase } from "@/lib/supabase-server";
import { userCanAccessRollout } from "@/server/rolloutAccess";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ rolloutId: string }> }
): Promise<Response> {
  const { rolloutId } = await params;
  const auth = await getSupabaseServerAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return Response.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const allowed = await userCanAccessRollout(rolloutId, user.id);
  if (!allowed) {
    return Response.json({ ok: false, message: "Rollout not found." }, { status: 404 });
  }

  const supabase = getServiceRoleSupabase();

  const { data, error } = await supabase
    .from("rollouts")
    .select(
      "id, primary_goal, adoption_state, sensitivity_anchor, leadership_posture, " +
      "rollout_mode, sensitivity_tier, needs_stabilization, " +
      "initiative_lead_name, initiative_lead_title, " +
      "approving_authority_name, approving_authority_title, " +
      "created_at, status, archived_at, archive_restart_used_at"
    )
    .eq("id", rolloutId)
    .single();

  if (error || !data) {
    return Response.json({ ok: false, message: "Rollout not found." }, { status: 404 });
  }

  return Response.json({ ok: true, rollout: data });
}
