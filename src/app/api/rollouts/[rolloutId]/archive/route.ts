import { z } from "zod";

import { getServiceRoleSupabase } from "@/lib/supabase-server";
import { MilestoneStatus } from "@/governance/milestones/milestoneStatus";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  rolloutId: z.string().uuid(),
});

type JoinedMilestone = { code: string; order_index: number };

function normalizeJoinedMilestone(raw: JoinedMilestone | JoinedMilestone[] | null): JoinedMilestone | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ rolloutId: string }> }
): Promise<Response> {
  const paramsRaw = await ctx.params;
  const paramsParsed = ParamsSchema.safeParse(paramsRaw);
  if (!paramsParsed.success) {
    return Response.json(
      { ok: false, error: "Invalid route params", details: paramsParsed.error.flatten() },
      { status: 400 }
    );
  }

  const { rolloutId } = paramsParsed.data;
  const supabase = getServiceRoleSupabase();

  const { data: rollout, error: rolloutErr } = await supabase
    .from("rollouts")
    .select(
      "id, status, archived_at, archive_restart_used_at"
    )
    .eq("id", rolloutId)
    .single();

  if (rolloutErr || !rollout) {
    return Response.json({ ok: false, error: "Rollout not found" }, { status: 404 });
  }

  if (rollout.status === "ARCHIVED") {
    return Response.json(
      {
        ok: true,
        archived: true,
        rollout_id: rolloutId,
        archived_at: rollout.archived_at,
        note: "Already archived",
      },
      { status: 200 }
    );
  }

  if (rollout.archive_restart_used_at) {
    return Response.json(
      {
        ok: false,
        error: "Archive + Restart has already been used for this rollout",
      },
      { status: 409 }
    );
  }

  const { data: milestoneRows, error: milestoneErr } = await supabase
    .from("rollout_milestone_state")
    .select("milestone_id, status, milestones!inner(code, order_index)")
    .eq("rollout_id", rolloutId);

  if (milestoneErr) {
    return Response.json(
      { ok: false, error: "Failed to fetch milestone state", details: milestoneErr.message },
      { status: 500 }
    );
  }

  const m3 = (milestoneRows ?? []).find(
    (row: { milestones: JoinedMilestone | JoinedMilestone[] | null; status: string }) =>
      normalizeJoinedMilestone(row.milestones)?.code === "M3"
  );

  if (m3?.status === MilestoneStatus.ACTIVATED) {
    return Response.json(
      {
        ok: false,
        error: "Archive is no longer available after the rollout plan has been activated",
      },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await supabase
    .from("rollouts")
    .update({
      status: "ARCHIVED",
      archived_at: now,
      archive_restart_used_at: now,
    })
    .eq("id", rolloutId)
    .select("id, status, archived_at, archive_restart_used_at")
    .single();

  if (updateErr || !updated) {
    return Response.json(
      { ok: false, error: "Failed to archive rollout", details: updateErr?.message },
      { status: 500 }
    );
  }

  return Response.json(
    {
      ok: true,
      archived: true,
      rollout_id: rolloutId,
      archived_at: updated.archived_at,
    },
    { status: 200 }
  );
}
