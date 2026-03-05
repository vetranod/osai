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
    .select("milestone_id, status")
    .eq("rollout_id", rolloutId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch milestones", details: error.message },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as unknown as MilestoneRow[];
  const milestoneIds = Array.from(new Set(rows.map((r) => r.milestone_id))).filter((id) =>
    Number.isInteger(id)
  );

  const milestoneMetaById = new Map<number, { code: string; order_index: number }>();
  if (milestoneIds.length > 0) {
    const { data: milestoneMeta, error: milestoneMetaError } = await supabaseAdmin
      .from("milestones")
      .select("id, code, order_index")
      .in("id", milestoneIds);

    if (milestoneMetaError) {
      return NextResponse.json(
        { error: "Failed to fetch milestone metadata", details: milestoneMetaError.message },
        { status: 500 }
      );
    }

    for (const row of milestoneMeta ?? []) {
      if (typeof row.id === "number") {
        milestoneMetaById.set(row.id, { code: String(row.code), order_index: Number(row.order_index) });
      }
    }
  }

  const milestones = rows
    .map((r) => {
      const milestone = milestoneMetaById.get(r.milestone_id) ?? null;
      return {
        milestone_id: r.milestone_id,
        code: milestone?.code ?? "",
        order_index: milestone?.order_index ?? 0,
        status: r.status,
      };
    })
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
