import { z } from "zod";

import { getServiceRoleSupabase } from "@/lib/supabase-server";
import type { MilestoneImpact } from "@/governance/reclassification/milestoneImpactPolicy";
import { requireRolloutAccess } from "@/server/requestAuth";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  rolloutId: z.string().uuid(),
  reclassId: z.string().uuid(),
});

function normalizeStoredMilestoneImpacts(raw: unknown): MilestoneImpact[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      return {
        milestone_code: String(item.milestone_code ?? ""),
        current_status: String(item.current_status ?? ""),
        recommended_action: String(item.recommended_action ?? ""),
        reason: String(item.reason ?? ""),
        changed_fields: Array.isArray(item.changed_fields) ? item.changed_fields.map(String) : [],
      };
    })
    .filter((entry) => entry.milestone_code && entry.current_status && entry.recommended_action && entry.reason) as MilestoneImpact[];
}

function classifyApplyRpcError(message: string | undefined): { error: string; status: number } {
  const details = message ?? "Unknown apply failure";

  if (details.includes("changed since proposal was reviewed")) {
    return {
      error: "Cannot apply: rollout milestone state changed after leadership reviewed this proposal",
      status: 409,
    };
  }

  if (details.includes("cannot be paused from status") || details.includes("cannot be invalidated from status")) {
    return {
      error: "Cannot apply: milestone state is no longer compatible with this proposal",
      status: 409,
    };
  }

  if (details.includes("not applicable under the stored governance summary")) {
    return {
      error: "Cannot apply: this reclassification is not applicable under the stored governance summary",
      status: 409,
    };
  }

  return {
    error: "Apply failed",
    status: 409,
  };
}

export async function POST(
  req: Request,
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
  const access = await requireRolloutAccess(req, rolloutId);
  if (!access.ok) return access.response;

  const supabase = getServiceRoleSupabase();

  const rolloutState = await supabase
    .from("rollouts")
    .select("status")
    .eq("id", rolloutId)
    .single();

  if (rolloutState.error) {
    return Response.json(
      { ok: false, error: "Failed to fetch rollout", details: rolloutState.error.message },
      { status: 500 }
    );
  }

  if (rolloutState.data?.status === "ARCHIVED") {
    return Response.json(
      { ok: false, error: "Archived rollouts are read-only" },
      { status: 409 }
    );
  }

  // --- Pre-flight checks (route layer) ---
  // Fetch the event row before calling the RPC so we can apply guards
  // that the DB function alone does not enforce.
  const { data: event, error: fetchErr } = await supabase
    .from("reclassification_events")
    .select("id, rollout_id, status, acknowledged_at, acknowledged_by, is_loosening, apply_allowed")
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

  if (event.apply_allowed === false) {
    return Response.json(
      {
        ok: false,
        error: "Cannot apply: this reclassification is not applicable under the stored governance summary",
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
    const classified = classifyApplyRpcError(rpcErr.message);
    return Response.json(
      { ok: false, error: classified.error, details: rpcErr.message },
      { status: classified.status }
    );
  }

  return Response.json(
    { ok: true, rollout_id: rolloutId, reclassification_id: reclassId, applied: true },
    { status: 200 }
  );
}
