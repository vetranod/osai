// src/governance/reclassification/proposalAnalysis.ts
//
// Pure, deterministic functions for analysing a reclassification proposal.
// No DB calls. No side effects. Independently testable.

import {
  SENSITIVITY_ANCHOR_RANK,
  type SensitivityAnchor,
  type DecisionInputs,
} from "@/decision-engine/options";
import type { DecisionOutput } from "@/decision-engine/engine";

// ------------------------------
// Ordinal ranks for output enums
// ------------------------------

const GUARDRAIL_STRICTNESS_RANK: Readonly<Record<string, number>> = {
  LOW:       1,
  MODERATE:  2,
  HIGH:      3,
  VERY_HIGH: 4,
};

const REVIEW_DEPTH_RANK: Readonly<Record<string, number>> = {
  LIGHT:      1,
  STANDARD:   2,
  STRUCTURED: 3,
  FORMAL:     4,
};

// Higher rank = faster / less controlled
const ROLLOUT_MODE_RANK: Readonly<Record<string, number>> = {
  CONTROLLED:       1,
  PHASED:           2,
  FAST:             3,
  SPLIT_DEPLOYMENT: 4, // treated as fastest for loosening purposes
};

// Higher rank = less protective
const POLICY_TONE_RANK: Readonly<Record<string, number>> = {
  CONTROLLED_ENABLEMENT: 1,
  PROTECTIVE:            2,
  STRUCTURED:            3,
  EMPOWERING:            4,
};

// ------------------------------
// Loosening check
// ------------------------------

/**
 * A reclassification is "loosening" if ANY of the following occur (per spec):
 *   1. guardrail_strictness rank decreases
 *   2. review_depth rank decreases
 *   3. rollout_mode becomes faster (rank increases)
 *   4. policy_tone becomes less protective (rank increases)
 *   5. sensitivity_anchor rank decreases (input, drives risk floor)
 *
 * "Loosening" means reducing the governance burden on an active rollout,
 * which the spec prohibits — archive + restart is required instead.
 */
export function computeIsLoosening(
  prior: {
    inputs:  Pick<DecisionInputs, "sensitivity_anchor">;
    outputs: Pick<DecisionOutput, "guardrail_strictness" | "review_depth" | "rollout_mode" | "policy_tone">;
  },
  proposed: {
    inputs:  Pick<DecisionInputs, "sensitivity_anchor">;
    outputs: Pick<DecisionOutput, "guardrail_strictness" | "review_depth" | "rollout_mode" | "policy_tone">;
  }
): boolean {
  // 1. Strictness decrease = loosening
  const priorStrictness    = GUARDRAIL_STRICTNESS_RANK[prior.outputs.guardrail_strictness]    ?? 0;
  const proposedStrictness = GUARDRAIL_STRICTNESS_RANK[proposed.outputs.guardrail_strictness] ?? 0;
  if (proposedStrictness < priorStrictness) return true;

  // 2. Review depth decrease = loosening
  const priorReview    = REVIEW_DEPTH_RANK[prior.outputs.review_depth]    ?? 0;
  const proposedReview = REVIEW_DEPTH_RANK[proposed.outputs.review_depth] ?? 0;
  if (proposedReview < priorReview) return true;

  // 3. Rollout mode getting faster = loosening
  const priorMode    = ROLLOUT_MODE_RANK[prior.outputs.rollout_mode]    ?? 0;
  const proposedMode = ROLLOUT_MODE_RANK[proposed.outputs.rollout_mode] ?? 0;
  if (proposedMode > priorMode) return true;

  // 4. Policy tone becoming less protective = loosening
  const priorTone    = POLICY_TONE_RANK[prior.outputs.policy_tone]    ?? 0;
  const proposedTone = POLICY_TONE_RANK[proposed.outputs.policy_tone] ?? 0;
  if (proposedTone > priorTone) return true;

  // 5. Sensitivity anchor decrease = loosening
  const priorSensitivity    = SENSITIVITY_ANCHOR_RANK[prior.inputs.sensitivity_anchor as SensitivityAnchor]    ?? 0;
  const proposedSensitivity = SENSITIVITY_ANCHOR_RANK[proposed.inputs.sensitivity_anchor as SensitivityAnchor] ?? 0;
  if (proposedSensitivity < priorSensitivity) return true;

  return false;
}

// ------------------------------
// Changed fields
// ------------------------------

/**
 * Returns the list of input field names that differ between prior and proposed.
 * Used for the impact summary shown to leadership before acknowledging.
 */
export function computeChangedFields(
  prior:    DecisionInputs,
  proposed: DecisionInputs
): string[] {
  const fields: Array<keyof DecisionInputs> = [
    "primary_goal",
    "adoption_state",
    "sensitivity_anchor",
    "leadership_posture",
  ];

  return fields.filter((f) => prior[f] !== proposed[f]);
}
