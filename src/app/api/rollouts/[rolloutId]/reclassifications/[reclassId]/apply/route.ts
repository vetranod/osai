import { z } from "zod";

import { getServiceRoleSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  rolloutId: z.string().uuid(),
  reclassId: z.string().uuid(),
});

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ rolloutId: string; reclassId: string }> }
): Promise<Response> {
  const paramsRaw = await ctx.params;
  const parsed = ParamsSchema.safeParse(paramsRaw);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Invalid route params", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { rolloutId, reclassId } = parsed.data;

  const supabase = getServiceRoleSupabase();

  // --- Pre-flight checks (route layer) ---
  // Fetch the event row before calling the RPC so we can apply guards
  // that the DB function alone does not enforce.
  const { data: event, error: fetchErr } = await supabase
    .from("reclassification_events")
    .select("id, rollout_id, status, acknowledged_at, acknowledged_by, is_loosening")
    .eq("id", reclassId)
    .eq("rollout_id", rolloutId)
    .maybeSingle();

  if (fetchErr) {
    return Response.json(
      { ok: false, error: "Failed to fetch reclassification event", details: fetchErr.message },
      { status: 500 }
    );
  }

  if (!event) {
    return Response.json(
      { ok: false, error: "Reclassification event not found" },
      { status: 404 }
    );
  }

  // Guard A: must still be PROPOSED
  if (event.status !== "PROPOSED") {
    return Response.json(
      {
        ok: false,
        error: "Cannot apply: reclassification is no longer PROPOSED",
        current_status: event.status,
      },
      { status: 409 }
    );
  }

  // Guard B: must be acknowledged by leadership before applying
  if (!event.acknowledged_at || !event.acknowledged_by) {
    return Response.json(
      {
        ok: false,
        error: "Cannot apply: reclassification has not been acknowledged by leadership",
      },
      { status: 409 }
    );
  }

  // Guard C: block loosening — downgrading risk posture requires archive + restart
  if (event.is_loosening) {
    return Response.json(
      {
        ok: false,
        error: "Cannot apply: this reclassification loosens the current risk posture",
        recommendation: "Archive this rollout and start a new one with the updated inputs",
      },
      { status: 409 }
    );
  }

  // --- Apply (atomic via DB RPC) ---
  const { error: rpcErr } = await supabase.rpc(
    "osai_apply_reclassification_proposal",
    {
      p_rollout_id: rolloutId,
      p_reclassification_id: reclassId,
    }
  );

  if (rpcErr) {
    return Response.json(
      { ok: false, error: "Apply failed", details: rpcErr.message },
      { status: 409 }
    );
  }

  return Response.json(
    { ok: true, rollout_id: rolloutId, reclassification_id: reclassId, applied: true },
    { status: 200 }
  );
}
