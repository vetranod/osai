// src/app/api/rollouts/[rolloutId]/milestones/[milestoneId]/transition/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/server/supabaseAdmin";
import { MilestoneStatus } from "@/governance/milestones/milestoneStatus";
import {
  canTransitionStatus,
  computeUnlockEffectOnActivation,
  type MilestoneStateRow,
} from "@/governance/milestones/transitionGuard";
import {
  generateArtifactsForMilestone,
  type ArtifactType,
} from "@/governance/artifacts/generateArtifactsForMilestone";

export const runtime = "nodejs";

// Milestone code → artifact type mapping documented in generateArtifactsForMilestone.ts

// ------------------------------
// Schemas
// ------------------------------

const BodySchema = z.object({
  to_status: z.enum([
    MilestoneStatus.LOCKED,
    MilestoneStatus.IN_PROGRESS,
    MilestoneStatus.AWAITING_CONFIRMATION,
    MilestoneStatus.CONFIRMED,
    MilestoneStatus.ACTIVATED,
    MilestoneStatus.PAUSED,
    MilestoneStatus.INVALIDATED,
  ]),
  intent: z.enum(["USER_ACTION", "GOVERNANCE_RECLASS_APPLY"]).optional(),
});

const ParamsSchema = z.object({
  rolloutId:   z.string().uuid(),
  milestoneId: z.coerce.number().int(),
});

type RolloutMilestoneStateRow = {
  rollout_id:   string;
  milestone_id: number;
  status: (typeof MilestoneStatus)[keyof typeof MilestoneStatus];
  milestones: { order_index: number } | null;
};

// ------------------------------
// Route handler
// ------------------------------

export async function POST(
  req: Request,
  ctx: { params: Promise<{ rolloutId: string; milestoneId: string }> }
) {
  const paramsRaw = await ctx.params;
  const paramsParsed = ParamsSchema.safeParse(paramsRaw);
  if (!paramsParsed.success) {
    return NextResponse.json(
      { error: "Invalid route params", details: paramsParsed.error.flatten() },
      { status: 400 }
    );
  }

  const { rolloutId, milestoneId } = paramsParsed.data;

  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bodyParsed = BodySchema.safeParse(bodyJson);
  if (!bodyParsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: bodyParsed.error.flatten() },
      { status: 400 }
    );
  }

  const toStatus = bodyParsed.data.to_status;
  const intent   = bodyParsed.data.intent ?? "USER_ACTION";

  // 1) Read current milestone state + milestone code
  const { data: currentRow, error: currentErr } = await supabaseAdmin
    .from("rollout_milestone_state")
    .select(`
      rollout_id,
      milestone_id,
      status,
      milestones!inner(code, order_index)
    `)
    .eq("rollout_id", rolloutId)
    .eq("milestone_id", milestoneId)
    .maybeSingle();

  if (currentErr) {
    return NextResponse.json(
      { error: "Failed reading current milestone state", details: currentErr.message },
      { status: 500 }
    );
  }
  if (!currentRow) {
    return NextResponse.json({ error: "Milestone state row not found" }, { status: 404 });
  }

  const fromStatus    = currentRow.status as RolloutMilestoneStateRow["status"];
  const milestoneCode = (currentRow.milestones as unknown as { code: string; order_index: number } | null)?.code ?? null;

  // 2) Guard the transition (pure deterministic rule)
  const decision = canTransitionStatus(fromStatus, toStatus, { intent });
  if (!decision.allowed) {
    return NextResponse.json(
      {
        error:       "Transition not allowed",
        reason:      decision.reason,
        from_status: fromStatus,
        to_status:   toStatus,
      },
      { status: 409 }
    );
  }

  // 3) If ACTIVATING — compute which milestone unlocks next
  let nextMilestoneIdToUnlock: number | null = null;

  if (toStatus === MilestoneStatus.ACTIVATED) {
    const { data: rows, error: rowsErr } = await supabaseAdmin
      .from("rollout_milestone_state")
      .select(`
        rollout_id,
        milestone_id,
        status,
        milestones!inner(order_index)
      `)
      .eq("rollout_id", rolloutId);

    if (rowsErr) {
      return NextResponse.json(
        { error: "Failed reading milestone list for unlock evaluation", details: rowsErr.message },
        { status: 500 }
      );
    }

    const normalized: MilestoneStateRow[] = (rows ?? []).map((r: any) => ({
      milestone_id: r.milestone_id,
      order_index:  r.milestones?.order_index,
      status:       r.status,
    }));

    // Simulate post-update state so computeUnlockEffectOnActivation sees ACTIVATED
    const simulated = normalized.map((m) =>
      m.milestone_id === milestoneId ? { ...m, status: MilestoneStatus.ACTIVATED } : m
    );

    const effect = computeUnlockEffectOnActivation(simulated, milestoneId);
    nextMilestoneIdToUnlock = effect?.next_milestone_id ?? null;
  }

  // 4) Apply transition atomically via RPC
  const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc("osai_apply_milestone_transition", {
    p_rollout_id:        rolloutId,
    p_milestone_id:      milestoneId,
    p_expected_from:     fromStatus,
    p_to:                toStatus,
    p_next_milestone_id: nextMilestoneIdToUnlock,
  });

  if (rpcErr) {
    return NextResponse.json(
      { error: "Transition apply failed", details: rpcErr.message },
      { status: 409 }
    );
  }

  const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  const unlockedNextMilestoneId: number | null = rpcRow?.unlocked_milestone_id ?? null;

  // 5) Generate artifacts — two cases, both non-fatal:
  //    a) Transition landed on CONFIRMED → generate artifacts for this milestone.
  //    b) Transition activated this milestone and unlocked the next one →
  //       generate artifacts for the next milestone so they are ready to view
  //       before the user has to mark that stage as reviewed.
  let artifacts_generated: ArtifactType[] = [];
  let artifact_errors: string[]           = [];

  if (toStatus === MilestoneStatus.CONFIRMED && milestoneCode !== null) {
    const result = await generateArtifactsForMilestone(rolloutId, milestoneId, milestoneCode);
    artifacts_generated = result.generated;
    artifact_errors     = result.errors;
  }

  if (toStatus === MilestoneStatus.ACTIVATED && unlockedNextMilestoneId !== null) {
    // Fetch the code for the newly-unlocked milestone so we know which artifacts to generate.
    const { data: nextMilestone } = await supabaseAdmin
      .from("milestones")
      .select("code")
      .eq("id", unlockedNextMilestoneId)
      .single();

    if (nextMilestone?.code) {
      const result = await generateArtifactsForMilestone(
        rolloutId,
        unlockedNextMilestoneId,
        nextMilestone.code
      );
      artifacts_generated = [...artifacts_generated, ...result.generated];
      artifact_errors     = [...artifact_errors, ...result.errors];
    }
  }

  return NextResponse.json(
    {
      ok:                         true,
      rollout_id:                 rolloutId,
      milestone_id:               milestoneId,
      milestone_code:             milestoneCode,
      from_status:                fromStatus,
      to_status:                  toStatus,
      unlocked_next_milestone_id: unlockedNextMilestoneId,
      artifacts_generated,
      ...(artifact_errors.length > 0 ? { artifact_errors } : {}),
    },
    { status: 200 }
  );
}
