import { NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/server/supabaseAdmin";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  rolloutId: z.string().uuid(),
});

type MilestoneRow = {
  milestone_id: number;
  status: string;
  milestones: {
    code: string;
    order_index: number;
  } | null;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ rolloutId: string }> }
) {
  const paramsRaw = await ctx.params;
  const parsed = ParamsSchema.safeParse(paramsRaw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid route params", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { rolloutId } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("rollout_milestone_state")
    .select(
      `
      milestone_id,
      status,
      milestones!inner(
        code,
        order_index
      )
    `
    )
    .eq("rollout_id", rolloutId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch milestones", details: error.message },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as unknown as MilestoneRow[];

  const milestones = rows
    .map((r) => ({
      milestone_id: r.milestone_id,
      code: r.milestones?.code ?? "",
      order_index: r.milestones?.order_index ?? 0,
      status: r.status,
    }))
    .sort((a, b) => a.order_index - b.order_index);

  return NextResponse.json(
    {
      ok: true,
      rollout_id: rolloutId,
      milestones,
    },
    { status: 200 }
  );
}