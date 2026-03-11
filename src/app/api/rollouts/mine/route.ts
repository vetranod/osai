// GET /api/rollouts/mine — returns the current user's latest active rollout, or null.
// Used post-sign-in to skip the wizard for returning paid users.
import { requireRequestUser } from "@/server/requestAuth";
import { findLatestRolloutForUser } from "@/server/rolloutAccess";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireRequestUser(request);
  if (!auth.ok) return auth.response;

  const rollout = await findLatestRolloutForUser(auth.user.id);
  if (!rollout) {
    return Response.json({ ok: true, rollout: null });
  }

  return Response.json({
    ok: true,
    rollout: { id: rollout.id, status: rollout.status, dashboard_url: `/rollouts/${rollout.id}` },
  });
}
