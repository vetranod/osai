// src/governance/artifacts/generateArtifactsForMilestone.ts
//
// Shared utility: fetches rollout data and generates + inserts artifact(s)
// for a given milestone code. Used by both the finalize route (M1 on creation)
// and the transition route (all milestones on CONFIRMED).
//
// Versioned: queries MAX(version) per artifact type and inserts at version + 1.
// Non-fatal: errors are logged and returned but do NOT roll back the caller.

import { supabaseAdmin } from "@/server/supabaseAdmin";
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

export type ArtifactType = "PROFILE" | "GUARDRAILS" | "REVIEW_MODEL" | "ROLLOUT_PLAN" | "POLICY";

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

export async function generateArtifactsForMilestone(
  rolloutId: string,
  milestoneId: number,
  milestoneCode: string
): Promise<{ generated: ArtifactType[]; errors: string[] }> {
  const artifactTypes = MILESTONE_ARTIFACT_MAP[milestoneCode];
  if (!artifactTypes || artifactTypes.length === 0) {
    return { generated: [], errors: [] };
  }

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
    return {
      generated: [],
      errors: [`Failed to fetch rollout for artifact generation: ${rolloutErr?.message ?? "not found"}`],
    };
  }

  const rollout = rolloutRaw as unknown as RolloutRow;

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
    const content_json = ARTIFACT_GENERATORS[artifactType](ctx);

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
