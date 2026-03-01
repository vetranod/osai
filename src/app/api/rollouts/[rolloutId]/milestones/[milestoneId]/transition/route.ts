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
  generateProfileArtifact,
  generateGuardrailsArtifact,
  generateReviewModelArtifact,
  generateRolloutPlanArtifact,
  generatePolicyArtifact,
  type ArtifactInputs,
  type IdentityFields,
} from "@/governance/artifacts/artifactGenerators";
import type { DecisionInputs } from "@/decision-engine/options";
import type { DecisionOutput } from "@/decision-engine/engine";

export const runtime = "nodejs";

// ------------------------------
// Milestone code → artifact type mapping
// M1 unlocks PROFILE + GUARDRAILS (two artifacts for one milestone)
// M2 unlocks REVIEW_MODEL
// M3 unlocks ROLLOUT_PLAN
// M4 unlocks POLICY
// ------------------------------

type ArtifactType = "PROFILE" | "GUARDRAILS" | "REVIEW_MODEL" | "ROLLOUT_PLAN" | "POLICY";

const MILESTONE_ARTIFACT_MAP: Readonly<Record<string, ArtifactType[]>> = {
  M1: ["PROFILE", "GUARDRAILS"],
  M2: ["REVIEW_MODEL"],
  M3: ["ROLLOUT_PLAN"],
  M4: ["POLICY"],
};

type ArtifactGenerator = (ctx: ArtifactInputs) => Record<string, unknown>;

const ARTIFACT_GENERATORS: Readonly<Record<ArtifactType, ArtifactGenerator>> = {
  PROFILE:      generateProfileArtifact,
  GUARDRAILS:   generateGuardrailsArtifact,
  REVIEW_MODEL: generateReviewModelArtifact,
  ROLLOUT_PLAN: generateRolloutPlanArtifact,
  POLICY:       generatePolicyArtifact,
};

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
// Artifact generation helper
// ------------------------------

/**
 * Fetches the rollout row and generates + inserts artifact(s) for the given
 * milestone code. Versioned: queries MAX(version) per artifact type and inserts
 * at version + 1 (first generation = version 1).
 *
 * Non-fatal: errors are logged and returned but do NOT roll back the transition.
 */
async function generateArtifactsForMilestone(
  rolloutId: string,
  milestoneId: number,
  milestoneCode: string
): Promise<{ generated: ArtifactType[]; errors: string[] }> {
  const artifactTypes = MILESTONE_ARTIFACT_MAP[milestoneCode];
  if (!artifactTypes || artifactTypes.length === 0) {
    return { generated: [], errors: [] };
  }

  // Fetch rollout inputs + outputs
  type RolloutRow = {
    primary_goal:              string;
    adoption_state:            string;
    sensitivity_anchor:        string;
    leadership_posture:        string;
    rollout_mode:              string;
    guardrail_strictness:      string;
    review_depth:              string;
    policy_tone:               string;
    maturity_state:            string;
    primary_risk_driver:       string;
    needs_stabilization:       boolean;
    sensitivity_tier:          string;
    initiative_lead_name:      string | null;
    initiative_lead_title:     string | null;
    approving_authority_name:  string | null;
    approving_authority_title: string | null;
  };

  const { data: rolloutRaw, error: rolloutErr } = await supabaseAdmin
    .from("rollouts")
    .select(
      "primary_goal, adoption_state, sensitivity_anchor, leadership_posture, " +
      "rollout_mode, guardrail_strictness, review_depth, policy_tone, " +
      "maturity_state, primary_risk_driver, needs_stabilization, sensitivity_tier, " +
      "initiative_lead_name, initiative_lead_title, " +
      "approving_authority_name, approving_authority_title"
    )
    .eq("id", rolloutId)
    .single();

  if (rolloutErr || !rolloutRaw) {
    return { generated: [], errors: [`Failed to fetch rollout for artifact generation: ${rolloutErr?.message ?? "not found"}`] };
  }

  const rollout = rolloutRaw as unknown as RolloutRow;

  // Cast DB strings to engine types (DB constraints guarantee valid values)
  const identity: IdentityFields = {
    initiative_lead_name:      rollout.initiative_lead_name      ?? null,
    initiative_lead_title:     rollout.initiative_lead_title     ?? null,
    approving_authority_name:  rollout.approving_authority_name  ?? null,
    approving_authority_title: rollout.approving_authority_title ?? null,
  };

  const ctx: ArtifactInputs = {
    inputs: {
      primary_goal:       rollout.primary_goal       as DecisionInputs["primary_goal"],
      adoption_state:     rollout.adoption_state     as DecisionInputs["adoption_state"],
      sensitivity_anchor: rollout.sensitivity_anchor as DecisionInputs["sensitivity_anchor"],
      leadership_posture: rollout.leadership_posture as DecisionInputs["leadership_posture"],
    },
    outputs: {
      rollout_mode:         rollout.rollout_mode         as DecisionOutput["rollout_mode"],
      guardrail_strictness: rollout.guardrail_strictness as DecisionOutput["guardrail_strictness"],
      review_depth:         rollout.review_depth         as DecisionOutput["review_depth"],
      policy_tone:          rollout.policy_tone          as DecisionOutput["policy_tone"],
      maturity_state:       rollout.maturity_state       as DecisionOutput["maturity_state"],
      primary_risk_driver:  rollout.primary_risk_driver,
      needs_stabilization:  rollout.needs_stabilization,
      sensitivity_tier:     rollout.sensitivity_tier     as DecisionOutput["sensitivity_tier"],
    },
    identity,
  };

  const generated: ArtifactType[] = [];
  const errors: string[] = [];

  for (const artifactType of artifactTypes) {
    // Query current max version for this (rollout, artifact_type) pair
    const { data: existing, error: versionErr } = await supabaseAdmin
      .from("artifacts")
      .select("version")
      .eq("rollout_id", rolloutId)
      .eq("artifact_type", artifactType)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionErr) {
      errors.push(`Failed to query version for ${artifactType}: ${versionErr.message}`);
      continue;
    }

    const nextVersion = (existing?.version ?? 0) + 1;

    // Generate content_json
    const generator = ARTIFACT_GENERATORS[artifactType];
    const content_json = generator(ctx);

    // Insert artifact row
    const { error: insertErr } = await supabaseAdmin
      .from("artifacts")
      .insert({
        rollout_id:               rolloutId,
        artifact_type:            artifactType,
        version:                  nextVersion,
        content_json,
        unlocked_by_milestone_id: milestoneId,
      });

    if (insertErr) {
      errors.push(`Failed to insert ${artifactType} v${nextVersion}: ${insertErr.message}`);
      continue;
    }

    generated.push(artifactType);
  }

  return { generated, errors };
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

  // 5) If the transition landed on CONFIRMED — generate artifacts for this milestone
  let artifacts_generated: ArtifactType[] = [];
  let artifact_errors: string[]           = [];

  if (toStatus === MilestoneStatus.CONFIRMED && milestoneCode !== null) {
    const result = await generateArtifactsForMilestone(rolloutId, milestoneId, milestoneCode);
    artifacts_generated = result.generated;
    artifact_errors     = result.errors;
  }

  return NextResponse.json(
    {
      ok:                         true,
      rollout_id:                 rolloutId,
      milestone_id:               milestoneId,
      milestone_code:             milestoneCode,
      from_status:                fromStatus,
      to_status:                  toStatus,
      unlocked_next_milestone_id: rpcRow?.unlocked_milestone_id ?? null,
      artifacts_generated,
      ...(artifact_errors.length > 0 ? { artifact_errors } : {}),
    },
    { status: 200 }
  );
}
