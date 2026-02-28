import { z } from "zod";

import { getServiceRoleSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  rolloutId: z.string().uuid(),
  reclassId: z.string().uuid(),
});

const BodySchema = z.object({
  acknowledged_by: z.string().min(1, "acknowledged_by must be a non-empty string"),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ rolloutId: string; reclassId: string }> }
): Promise<Response> {
  const paramsRaw = await ctx.params;
  const paramsParsed = ParamsSchema.safeParse(paramsRaw);
  if (!paramsParsed.success) {
    return Response.json(
      { ok: false, error: "Invalid route params", details: paramsParsed.error.flatten() },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const bodyParsed = BodySchema.safeParse(body);
  if (!bodyParsed.success) {
    return Response.json(
      { ok: false, error: "Invalid body", details: bodyParsed.error.flatten() },
      { status: 400 }
    );
  }

  const { rolloutId, reclassId } = paramsParsed.data;
  const { acknowledged_by } = bodyParsed.data;

  const supabase = getServiceRoleSupabase();

  // Fetch the event to verify it exists and is still PROPOSED
  const { data: event, error: fetchErr } = await supabase
    .from("reclassification_events")
    .select("id, rollout_id, status, acknowledged_at, acknowledged_by")
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

  // Must be PROPOSED to acknowledge — no point acknowledging applied/cancelled events
  if (event.status !== "PROPOSED") {
    return Response.json(
      {
        ok: false,
        error: "Cannot acknowledge: reclassification is no longer PROPOSED",
        current_status: event.status,
      },
      { status: 409 }
    );
  }

  // Already acknowledged — idempotent: return success with existing values
  if (event.acknowledged_at && event.acknowledged_by) {
    return Response.json(
      {
        ok: true,
        rollout_id: rolloutId,
        reclassification_id: reclassId,
        acknowledged_by: event.acknowledged_by,
        acknowledged_at: event.acknowledged_at,
        note: "Already acknowledged — no change made",
      },
      { status: 200 }
    );
  }

  // Stamp acknowledgement
  const { data: updated, error: updateErr } = await supabase
    .from("reclassification_events")
    .update({
      acknowledged_by,
      acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reclassId)
    .eq("rollout_id", rolloutId)
    .eq("status", "PROPOSED") // extra safety: don't update if status changed between fetch and write
    .select("id, acknowledged_by, acknowledged_at")
    .single();

  if (updateErr) {
    return Response.json(
      { ok: false, error: "Failed to record acknowledgement", details: updateErr.message },
      { status: 500 }
    );
  }

  return Response.json(
    {
      ok: true,
      rollout_id: rolloutId,
      reclassification_id: reclassId,
      acknowledged_by: updated.acknowledged_by,
      acknowledged_at: updated.acknowledged_at,
    },
    { status: 200 }
  );
}
