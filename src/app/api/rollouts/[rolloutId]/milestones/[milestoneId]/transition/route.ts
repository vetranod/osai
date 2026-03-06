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
import { requireRolloutAccess } from "@/server/requestAuth";

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

async function retryActivationWithoutUnlock(
  rolloutId: string,
  milestoneId: number,
  fromStatus: RolloutMilestoneStateRow["status"],
  nextMilestoneIdToUnlock: number | null
): Promise<boolean> {
  if (nextMilestoneIdToUnlock === null) return false;

  const { data: nextRow, error: nextRowErr } = await supabaseAdmin
    .from("rollout_milestone_state")
    .select("status")
    .eq("rollout_id", rolloutId)
    .eq("milestone_id", nextMilestoneIdToUnlock)
    .single();

  if (nextRowErr || !nextRow || nextRow.status === MilestoneStatus.LOCKED) {
    return false;
  }

  const { error: retryErr } = await supabaseAdmin.rpc("osai_apply_milestone_transition", {
    p_rollout_id: rolloutId,
    p_milestone_id: milestoneId,
    p_expected_from: fromStatus,
    p_to: MilestoneStatus.ACTIVATED,
    p_next_milestone_id: null,
  });

  if (!retryErr) return true;

  const { data: recheck } = await supabaseAdmin
    .from("rollout_milestone_state")
    .select("status")
    .eq("rollout_id", rolloutId)
    .eq("milestone_id", milestoneId)
    .single();

  return recheck?.status === MilestoneStatus.ACTIVATED;
}

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
  const access = await requireRolloutAccess(req, rolloutId);
  if (!access.ok) return access.response;

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

  const { data: rolloutMeta, error: rolloutMetaErr } = await supabaseAdmin
    .from("rollouts")
    .select("status")
    .eq("id", rolloutId)
    .maybeSingle();

  if (rolloutMetaErr) {
    return NextResponse.json(
      { error: "Failed reading rollout state", details: rolloutMetaErr.message },
      { status: 500 }
    );
  }

  if (rolloutMeta?.status === "ARCHIVED") {
    return NextResponse.json(
      { error: "Archived rollouts are read-only" },
      { status: 409 }
    );
  }

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

  const fromStatus = currentRow.status as RolloutMilestoneStateRow["status"];

  // milestones join can be an object (many-to-one FK) or an array depending on
  // PostgREST version / client version. Handle both forms defensively.
  const milestoneMeta = ((): { code: string; order_index: number } | null => {
    const raw = (currentRow as any).milestones;
    if (!raw) return null;
    return Array.isArray(raw) ? (raw[0] ?? null) : raw;
  })();

  const milestoneCode       = milestoneMeta?.code       ?? null;
  const currentOrderIndex   = milestoneMeta?.order_index ?? null;

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

  // Short-circuit NOOPs — DB is already at the target state (e.g. a previous
  // attempt succeeded but the client never saw the response). Return success
  // immediately; calling the RPC with p_expected_from === p_to would fail.
  if (decision.reason === "NOOP") {
    return NextResponse.json(
      {
        ok:                         true,
        rollout_id:                 rolloutId,
        milestone_id:               milestoneId,
        milestone_code:             milestoneCode,
        from_status:                fromStatus,
        to_status:                  toStatus,
        unlocked_next_milestone_id: null,
        artifacts_generated:        [],
        noop:                       true,
      },
      { status: 200 }
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

    const normalized: MilestoneStateRow[] = (rows ?? []).map((r: any) => {
      const ms = Array.isArray(r.milestones) ? (r.milestones[0] ?? null) : (r.milestones ?? null);
      return {
        milestone_id: r.milestone_id,
        order_index:  ms?.order_index ?? 0,
        status:       r.status,
      };
    });

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

  // If the RPC returned an error, re-read the DB before giving up.
  // The Postgres function may have committed the update but returned an
  // unexpected shape that the Supabase client treats as an error. If the
  // milestone is already at toStatus the transition effectively succeeded.
  if (rpcErr) {
    const { data: recheck, error: recheckErr } = await supabaseAdmin
      .from("rollout_milestone_state")
      .select("status")
      .eq("rollout_id", rolloutId)
      .eq("milestone_id", milestoneId)
      .single();

    if (recheckErr || recheck?.status !== toStatus) {
      const recoveredByRetry =
        toStatus === MilestoneStatus.ACTIVATED &&
        await retryActivationWithoutUnlock(
          rolloutId,
          milestoneId,
          fromStatus,
          nextMilestoneIdToUnlock
        );

      if (!recoveredByRetry) {
        return NextResponse.json(
          { error: "Transition apply failed", details: rpcErr.message },
          { status: 409 }
        );
      }
    }
    // Transition did land — fall through and continue with artifact generation.
  }

  const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;

  // Derive the unlocked next milestone ID from the RPC result when available.
  let unlockedNextMilestoneId: number | null = rpcRow?.unlocked_milestone_id ?? null;

  // When ACTIVATED but no unlock was recorded — either because:
  //   a) rpcErr was set (rpcRow is null), or
  //   b) the RPC succeeded but the next milestone was already IN_PROGRESS from
  //      a prior attempt (the unlock UPDATE matched no LOCKED rows → v_unlocked=null)
  // In both cases find the first IN_PROGRESS milestone after the current one so
  // its artifacts can be generated below.
  if (toStatus === MilestoneStatus.ACTIVATED && unlockedNextMilestoneId === null) {
    const { data: allRowsRaw } = await supabaseAdmin
      .from("rollout_milestone_state")
      .select("milestone_id, status, milestones!inner(order_index)")
      .eq("rollout_id", rolloutId);

    const allRows = (allRowsRaw ?? []) as any[];

    // Use currentOrderIndex derived from the initial milestone read (step 1).
    if (currentOrderIndex !== null) {
      const nextRow = allRows
        .filter((r: any) => {
          const ms = Array.isArray(r.milestones) ? (r.milestones[0] ?? null) : (r.milestones ?? null);
          return (
            r.status === MilestoneStatus.IN_PROGRESS &&
            typeof ms?.order_index === "number" &&
            ms.order_index > currentOrderIndex
          );
        })
        .sort((a: any, b: any) => {
          const aMs = Array.isArray(a.milestones) ? (a.milestones[0] ?? null) : (a.milestones ?? null);
          const bMs = Array.isArray(b.milestones) ? (b.milestones[0] ?? null) : (b.milestones ?? null);
          return (aMs?.order_index ?? 0) - (bMs?.order_index ?? 0);
        })[0] as any;

      unlockedNextMilestoneId = nextRow?.milestone_id ?? null;
    }
  }

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
