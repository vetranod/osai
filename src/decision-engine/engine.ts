import type { DecisionInputs, PrimaryGoal, SensitivityAnchor, AdoptionState, LeadershipPosture } from "@/decision-engine/options";

export type RolloutMode = "CONTROLLED" | "PHASED" | "FAST" | "SPLIT_DEPLOYMENT";

// 1–4 scale (LOW–VERY_HIGH)
export type GuardrailStrictness = "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";

// 1–4 scale (LIGHT–FORMAL)
export type ReviewDepth = "LIGHT" | "STANDARD" | "STRUCTURED" | "FORMAL";

export type PolicyTone =
  | "PROTECTIVE"
  | "STRUCTURED"
  | "EMPOWERING"
  | "CONTROLLED_ENABLEMENT";

export type MaturityState =
  | "EXPLORATORY"
  | "OPPORTUNISTIC"
  | "STRUCTURED"
  | "RISK_MANAGED"
  | "CONTROLLED_ENVIRONMENT";

export type DecisionOutput = Readonly<{
  rollout_mode: RolloutMode;
  guardrail_strictness: GuardrailStrictness;
  review_depth: ReviewDepth;
  policy_tone: PolicyTone;
  maturity_state: MaturityState;
  primary_risk_driver: string;
  needs_stabilization: boolean;
}>;

export type EngineTraceStep = Readonly<{
  step: string;
  notes: string[];
}>;

export type EngineResult = Readonly<{
  output: DecisionOutput;
  trace: EngineTraceStep[];
}>;

// ------------------------------
// Pipeline internal types
// ------------------------------

type RiskFloor = Readonly<{
  guardrail_strictness_floor: GuardrailStrictness;
  review_depth_floor: ReviewDepth;
}>;

type GoalModifier = Readonly<{
  strictness_modifier: number;
  review_modifier: number;
  leadership_modifier: number; // review-only
  notes: string[];
}>;

type SpeedBase = Readonly<{
  speed_level: number;
  notes: string[];
}>;

type SpeedAdjust = Readonly<{
  speed_delta: number;
  notes: string[];
}>;

type SpeedCeiling = Readonly<{
  capped_speed_level: number;
  notes: string[];
}>;

type SplitDeploymentDecision = Readonly<{
  triggered: boolean;
  notes: string[];
}>;

// ------------------------------
// Public engine entry point
// ------------------------------

export function evaluateDecision(inputs: DecisionInputs): EngineResult {
  const trace: EngineTraceStep[] = [];

  // 1) Risk floor (sensitivity)
  const riskFloor = computeRiskFloor(inputs);
  trace.push({
    step: "1_risk_floor",
    notes: [
      `sensitivity_anchor=${inputs.sensitivity_anchor}`,
      `guardrail_strictness_floor=${riskFloor.guardrail_strictness_floor}`,
      `review_depth_floor=${riskFloor.review_depth_floor}`,
    ],
  });

  // 2) Goal modifier (strictness/review only; never speed; never override floors)
  const goalModifier = computeGoalModifier(inputs);
  trace.push({
    step: "2_goal_modifier",
    notes: [
      `primary_goal=${inputs.primary_goal}`,
      `strictness_modifier=${goalModifier.strictness_modifier}`,
      `review_modifier=${goalModifier.review_modifier}`,
      `leadership_modifier(review_only)=${goalModifier.leadership_modifier}`,
      ...goalModifier.notes,
      "Scope: affects strictness/review only (never speed).",
      "Guarantees: never overrides sensitivity floors; never changes rollout_mode/speed/maturity directly.",
    ],
  });

  // 3) Base speed (from adoption_state)
  const speedBase = computeBaseSpeed(inputs);
  trace.push({
    step: "3_base_speed",
    notes: [`adoption_state=${inputs.adoption_state}`, ...speedBase.notes],
  });

  // 4) Speed adjust (from leadership_posture) — speed only
  const speedAdjust = computeSpeedAdjust(inputs);
  trace.push({
    step: "4_speed_adjust",
    notes: [`leadership_posture=${inputs.leadership_posture}`, ...speedAdjust.notes],
  });

  // 5) Apply sensitivity speed ceiling
  const speedCeiling = applySensitivitySpeedCeiling(inputs, speedBase, speedAdjust);
  trace.push({
    step: "5_sensitivity_speed_ceiling",
    notes: speedCeiling.notes,
  });

  // 6) Evaluate split deployment trigger
  const split = evaluateSplitDeploymentTrigger(inputs);
  trace.push({
    step: "6_split_deployment_trigger",
    notes: split.notes,
  });

  // 7) Finalize outputs
  const output = finalizeOutputs(inputs, riskFloor, goalModifier, split, speedCeiling);
  trace.push({
    step: "7_finalize_outputs",
    notes: [
      "Finalize outputs: strictness/review modifiers applied + policy tone mapping applied + maturity mapping + adoption-derived stabilization + primary risk driver mapping applied.",
      "Policy tone is posture-driven and risk-constrained; informational only (no effect on other outputs).",
    ],
  });

  return { output, trace };
}

// ------------------------------
// Stage implementations
// ------------------------------

function computeRiskFloor(inputs: DecisionInputs): RiskFloor {
  switch (inputs.sensitivity_anchor) {
    case "PUBLIC_CONTENT":
    case "INTERNAL_BUSINESS_INFO":
      return {
        guardrail_strictness_floor: "MODERATE", // score 2
        review_depth_floor: "STANDARD",         // score 2
      };

    case "CLIENT_MATERIALS":
    case "FINANCIAL_OPERATIONAL_RECORDS":
    case "REGULATED_CONFIDENTIAL":
      return {
        guardrail_strictness_floor: "HIGH",     // score 3
        review_depth_floor: "STRUCTURED",       // score 3
      };

    default: {
      const _never: never = inputs.sensitivity_anchor;
      return _never;
    }
}

}

function computeGoalModifier(inputs: DecisionInputs): GoalModifier {
  const strictness_modifier = strictnessModifierByGoal(inputs.primary_goal);
  const review_modifier = reviewModifierByGoal(inputs.primary_goal);
  const leadership_modifier = leadershipReviewModifier(inputs.leadership_posture);

  return {
    strictness_modifier,
    review_modifier,
    leadership_modifier,
    notes: [
      "Applied deterministic goal-based modifiers (additive).",
      "Leadership modifier applies to review only (MOVE_QUICKLY=-1, BALANCED=0, CAUTIOUS=+1) and cannot reduce below floor.",
    ],
  };
}

function strictnessModifierByGoal(goal: PrimaryGoal): number {
  switch (goal) {
    case "MARKETING_CONTENT":
      return 0;
    case "INTERNAL_DOCUMENTATION":
      return 1;
    case "OPERATIONS_ADMIN":
      return 1;
    case "CLIENT_COMMUNICATION":
      return 2;
    case "SALES_PROPOSALS":
      return 2;
    case "DATA_REPORTING":
      return 3;
    default: {
      const _never: never = goal;
      return _never;
    }
  }
}

function reviewModifierByGoal(goal: PrimaryGoal): number {
  switch (goal) {
    case "MARKETING_CONTENT":
      return 0;
    case "INTERNAL_DOCUMENTATION":
      return 1;
    case "OPERATIONS_ADMIN":
      return 1;
    case "CLIENT_COMMUNICATION":
      return 1;
    case "SALES_PROPOSALS":
      return 1;
    case "DATA_REPORTING":
      return 2;
    default: {
      const _never: never = goal;
      return _never;
    }
  }
}

function leadershipReviewModifier(posture: LeadershipPosture): number {
  switch (posture) {
    case "MOVE_QUICKLY":
      return -1;
    case "BALANCED":
      return 0;
    case "CAUTIOUS":
      return 1;
    default: {
      const _never: never = posture;
      return _never;
    }
  }
}

function computeBaseSpeed(inputs: DecisionInputs): SpeedBase {
  let speed_level: number;

  switch (inputs.adoption_state) {
    case "NONE":
      speed_level = 1;
      break;
    case "FEW_EXPERIMENTING":
      speed_level = 2;
      break;
    case "MULTIPLE_REGULAR":
      speed_level = 3;
      break;
    case "ENCOURAGED_UNSTRUCTURED":
      speed_level = 4;
      break;
    case "WIDELY_USED_UNSTANDARDIZED":
      speed_level = 5;
      break;
    default: {
      const _never: never = inputs.adoption_state;
      return _never;
    }
  }

  return { speed_level, notes: [`base_speed_level=${speed_level}`] };
}

function computeSpeedAdjust(inputs: DecisionInputs): SpeedAdjust {
  let speed_delta: number;

  switch (inputs.leadership_posture) {
    case "CAUTIOUS":
      speed_delta = -1;
      break;
    case "BALANCED":
      speed_delta = 0;
      break;
    case "MOVE_QUICKLY":
      speed_delta = 1;
      break;
    default: {
      const _never: never = inputs.leadership_posture;
      return _never;
    }
  }

  return { speed_delta, notes: [`speed_delta=${speed_delta}`] };
}

function applySensitivitySpeedCeiling(
  inputs: DecisionInputs,
  base: SpeedBase,
  adj: SpeedAdjust
): SpeedCeiling {
  const combined = base.speed_level + adj.speed_delta;

  let ceiling: number;

  switch (inputs.sensitivity_anchor) {
    case "PUBLIC_CONTENT":
      ceiling = 5;
      break;
    case "INTERNAL_BUSINESS_INFO":
      ceiling = 4;
      break;
    case "CLIENT_MATERIALS":
      ceiling = 3;
      break;
    case "FINANCIAL_OPERATIONAL_RECORDS":
    case "REGULATED_CONFIDENTIAL":
      ceiling = 2;
      break;
    default: {
      const _never: never = inputs.sensitivity_anchor;
      return _never;
    }
  }

  const capped = Math.min(combined, ceiling);
  const bounded = Math.max(1, Math.min(capped, 5));

  return {
    capped_speed_level: bounded,
    notes: [
      `combined_speed_level=${combined}`,
      `sensitivity_ceiling=${ceiling}`,
      `capped_speed_level=${bounded}`,
    ],
  };
}

function evaluateSplitDeploymentTrigger(inputs: DecisionInputs): SplitDeploymentDecision {
  const highSensitivity =
    inputs.sensitivity_anchor === "FINANCIAL_OPERATIONAL_RECORDS" ||
    inputs.sensitivity_anchor === "REGULATED_CONFIDENTIAL";

  const highAdoption = inputs.adoption_state === "WIDELY_USED_UNSTANDARDIZED";
  const movingQuickly = inputs.leadership_posture === "MOVE_QUICKLY";

  const triggered = highSensitivity && highAdoption && movingQuickly;

  const notes: string[] = [
    `highSensitivity=${highSensitivity}`,
    `highAdoption=${highAdoption}`,
    `movingQuickly=${movingQuickly}`,
    `triggered=${triggered}`,
    "Scope: affects rollout_mode pacing only (no effect on strictness/review floors).",
  ];

  return { triggered, notes };
}

// ------------------------------
// Finalize outputs
// ------------------------------

function finalizeOutputs(
  inputs: DecisionInputs,
  rf: RiskFloor,
  gm: GoalModifier,
  split: SplitDeploymentDecision,
  speed: SpeedCeiling
): DecisionOutput {
  const rollout_mode: RolloutMode = split.triggered
    ? "SPLIT_DEPLOYMENT"
    : speedToRolloutMode(speed.capped_speed_level);

  const guardrail_strictness = computeStrictness(rf.guardrail_strictness_floor, gm.strictness_modifier);

  const review_depth = computeReviewDepth(
    rf.review_depth_floor,
    gm.leadership_modifier,
    gm.review_modifier
  );

  const policy_tone = computePolicyTone(inputs.leadership_posture, inputs.sensitivity_anchor);

  const needs_stabilization = computeNeedsStabilization(inputs.adoption_state);

  const maturity_state = computeMaturityState(
    inputs.adoption_state,
    inputs.sensitivity_anchor,
    rollout_mode
  );

  const primary_risk_driver = computePrimaryRiskDriver(inputs.primary_goal);

  return {
    rollout_mode,
    guardrail_strictness,
    review_depth,
    policy_tone,
    maturity_state,
    primary_risk_driver,
    needs_stabilization,
  };
}

function speedToRolloutMode(speed_level: number): RolloutMode {
  if (speed_level <= 2) return "CONTROLLED";
  if (speed_level === 3) return "PHASED";
  return "FAST";
}

function strictnessToScore(s: GuardrailStrictness): number {
  switch (s) {
    case "LOW":
      return 1;
    case "MODERATE":
      return 2;
    case "HIGH":
      return 3;
    case "VERY_HIGH":
      return 4;
    default: {
      const _never: never = s;
      return _never;
    }
  }
}

function scoreToStrictness(score: number): GuardrailStrictness {
  if (score <= 1) return "LOW";
  if (score === 2) return "MODERATE";
  if (score === 3) return "HIGH";
  return "VERY_HIGH";
}

function reviewToScore(r: ReviewDepth): number {
  switch (r) {
    case "LIGHT":
      return 1;
    case "STANDARD":
      return 2;
    case "STRUCTURED":
      return 3;
    case "FORMAL":
      return 4;
    default: {
      const _never: never = r;
      return _never;
    }
  }
}

function scoreToReview(score: number): ReviewDepth {
  if (score <= 1) return "LIGHT";
  if (score === 2) return "STANDARD";
  if (score === 3) return "STRUCTURED";
  return "FORMAL";
}

function clampScore(n: number): number {
  return Math.max(1, Math.min(n, 4));
}

function computeStrictness(floor: GuardrailStrictness, strictnessModifier: number): GuardrailStrictness {
  const floorScore = strictnessToScore(floor);
  const strictnessScore = clampScore(floorScore + strictnessModifier);
  return scoreToStrictness(strictnessScore);
}

function computeReviewDepth(
  floor: ReviewDepth,
  leadershipModifier: number,
  reviewModifier: number
): ReviewDepth {
  const floorScore = reviewToScore(floor);

  // Leadership modifier cannot reduce below floor
  const afterLeadership = Math.max(floorScore, floorScore + leadershipModifier);

  const reviewScore = clampScore(afterLeadership + reviewModifier);
  return scoreToReview(reviewScore);
}

function computeNeedsStabilization(adoption: AdoptionState): boolean {
  return adoption === "WIDELY_USED_UNSTANDARDIZED";
}

/**
 * Policy Tone Mapping (V1 — Posture-Driven, Risk-Constrained)
 *
 * Step 1 — Base Tone From Leadership Posture:
 * MOVE_QUICKLY -> EMPOWERING
 * BALANCED -> STRUCTURED
 * CAUTIOUS -> PROTECTIVE
 *
 * Step 2 — Sensitivity Constraints:
 * FINANCIAL_OPERATIONAL_RECORDS + base EMPOWERING -> STRUCTURED
 * REGULATED_CONFIDENTIAL -> CONTROLLED_ENABLEMENT (always)
 *
 * Informational only: must not influence other outputs.
 */
function computePolicyTone(posture: LeadershipPosture, sensitivity: SensitivityAnchor): PolicyTone {
  let base: PolicyTone;

  switch (posture) {
    case "MOVE_QUICKLY":
      base = "EMPOWERING";
      break;
    case "BALANCED":
      base = "STRUCTURED";
      break;
    case "CAUTIOUS":
      base = "PROTECTIVE";
      break;
    default: {
      const _never: never = posture;
      return _never;
    }
  }

  // Sensitivity constraints (override rules)
  if (sensitivity === "REGULATED_CONFIDENTIAL") return "CONTROLLED_ENABLEMENT";

  if (sensitivity === "FINANCIAL_OPERATIONAL_RECORDS" && base === "EMPOWERING") {
    return "STRUCTURED";
  }

  return base;
}

function computeMaturityState(
  adoption: AdoptionState,
  sensitivity: SensitivityAnchor,
  rolloutMode: RolloutMode
): MaturityState {
  let baseline: MaturityState;

  switch (adoption) {
    case "NONE":
    case "FEW_EXPERIMENTING":
      baseline = "EXPLORATORY";
      break;
    case "MULTIPLE_REGULAR":
    case "ENCOURAGED_UNSTRUCTURED":
    case "WIDELY_USED_UNSTANDARDIZED":
      baseline = "OPPORTUNISTIC";
      break;
    default: {
      const _never: never = adoption;
      return _never;
    }
  }

  if (sensitivity === "FINANCIAL_OPERATIONAL_RECORDS") return "RISK_MANAGED";
  if (sensitivity === "REGULATED_CONFIDENTIAL") return "CONTROLLED_ENVIRONMENT";

  const inModerateRiskBand =
    sensitivity === "INTERNAL_BUSINESS_INFO" || sensitivity === "CLIENT_MATERIALS";

  const inStructuredPacingBand = rolloutMode === "CONTROLLED" || rolloutMode === "PHASED";
  const adoptionNotNone = adoption !== "NONE";

  if (inModerateRiskBand && inStructuredPacingBand && adoptionNotNone) {
    return "STRUCTURED";
  }

  return baseline;
}

function computePrimaryRiskDriver(primaryGoal: PrimaryGoal): string {
  switch (primaryGoal) {
    case "CLIENT_COMMUNICATION":
      return "Reputational & Commitment Exposure";
    case "INTERNAL_DOCUMENTATION":
      return "Accuracy & Operational Integrity Risk";
    case "MARKETING_CONTENT":
      return "Brand Drift Risk";
    case "SALES_PROPOSALS":
      return "Financial & Commitment Exposure";
    case "DATA_REPORTING":
      return "Data Exposure & Analytical Correctness Risk";
    case "OPERATIONS_ADMIN":
      return "Process Criticality Risk";
    default: {
      const _never: never = primaryGoal;
      return _never;
    }
  }
}