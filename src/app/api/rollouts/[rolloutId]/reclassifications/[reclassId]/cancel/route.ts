import { NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/server/supabaseAdmin";
import { requireRolloutAccess } from "@/server/requestAuth";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  rolloutId: z.string().uuid(),
  reclassId: z.string().uuid(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ rolloutId: string; reclassId: string }> }
) {
  const paramsRaw = await ctx.params;
  const parsed = ParamsSchema.safeParse(paramsRaw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid route params", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { rolloutId, reclassId } = parsed.data;
  const access = await requireRolloutAccess(req, rolloutId);
  if (!access.ok) return access.response;

  const { data: rollout, error: rolloutErr } = await supabaseAdmin
    .from("rollouts")
    .select("status")
    .eq("id", rolloutId)
    .single();

  if (rolloutErr) {
    return NextResponse.json(
      { error: "Failed to fetch rollout", details: rolloutErr.message },
      { status: 500 }
    );
  }

  if (rollout?.status === "ARCHIVED") {
    return NextResponse.json(
      { error: "Archived rollouts are read-only" },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin.rpc(
    "osai_cancel_reclassification_proposal",
    {
      p_rollout_id: rolloutId,
      p_reclassification_id: reclassId,
    }
  );

  if (error) {
    return NextResponse.json(
      { error: "Cancel failed", details: error.message },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { ok: true, rollout_id: rolloutId, reclassification_id: reclassId, cancelled: true },
    { status: 200 }
  );
}
