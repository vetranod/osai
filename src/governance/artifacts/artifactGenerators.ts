// src/governance/artifacts/artifactGenerators.ts
//
// Pure, deterministic functions for generating artifact content_json payloads.
// Each function takes the rollout's decision inputs + outputs and returns a
// structured JSON object. No DB calls. No side effects. Independently testable.

import type { DecisionInputs } from "@/decision-engine/options";
import type { DecisionOutput } from "@/decision-engine/engine";

// ------------------------------
// Shared input type
// ------------------------------

export type ArtifactInputs = Readonly<{
  inputs:  DecisionInputs;
  outputs: DecisionOutput;
}>;

// ------------------------------
// PROFILE artifact
// ------------------------------

/**
 * PROFILE — Captures what this rollout is, who it's for, and its current
 * maturity classification. Serves as the human-readable identity card for
 * the rollout.
 */
export function generateProfileArtifact(ctx: ArtifactInputs): Record<string, unknown> {
  const { inputs, outputs } = ctx;

  return {
    artifact_type: "PROFILE",
    schema_version: 1,
    primary_goal: inputs.primary_goal,
    adoption_state: inputs.adoption_state,
    sensitivity_anchor: inputs.sensitivity_anchor,
    leadership_posture: inputs.leadership_posture,
    maturity_state: outputs.maturity_state,
    primary_risk_driver: outputs.primary_risk_driver,
    needs_stabilization: outputs.needs_stabilization,
  };
}

// ------------------------------
// GUARDRAILS artifact
// ------------------------------

/**
 * GUARDRAILS — The specific guardrail configuration derived from the decision
 * engine. Defines what restrictions and controls are active for this rollout.
 */
export function generateGuardrailsArtifact(ctx: ArtifactInputs): Record<string, unknown> {
  const { inputs, outputs } = ctx;

  return {
    artifact_type: "GUARDRAILS",
    schema_version: 1,
    guardrail_strictness: outputs.guardrail_strictness,
    sensitivity_anchor: inputs.sensitivity_anchor,
    rules: deriveGuardrailRules(outputs.guardrail_strictness, inputs.sensitivity_anchor),
  };
}

function deriveGuardrailRules(
  strictness: DecisionOutput["guardrail_strictness"],
  sensitivity: DecisionInputs["sensitivity_anchor"]
): string[] {
  const rules: string[] = [];

  // Sensitivity-based rules (always present)
  if (
    sensitivity === "CLIENT_MATERIALS" ||
    sensitivity === "FINANCIAL_OPERATIONAL_RECORDS" ||
    sensitivity === "REGULATED_CONFIDENTIAL"
  ) {
    rules.push("No external sharing of AI-generated content without human review.");
    rules.push("All AI outputs touching client or regulated data must be logged.");
  }

  if (sensitivity === "REGULATED_CONFIDENTIAL") {
    rules.push("AI must not process or generate content containing regulated identifiers (PII, PHI, financial account data).");
    rules.push("Legal or compliance sign-off required before any new use case is added.");
  }

  if (sensitivity === "FINANCIAL_OPERATIONAL_RECORDS") {
    rules.push("AI-generated financial figures must be independently verified before use.");
  }

  // Strictness-based rules
  if (strictness === "MODERATE" || strictness === "HIGH" || strictness === "VERY_HIGH") {
    rules.push("Human review required before any AI output is used in an external-facing context.");
  }

  if (strictness === "HIGH" || strictness === "VERY_HIGH") {
    rules.push("Designated reviewers must be identified and confirmed before rollout proceeds.");
    rules.push("AI outputs must not be sent to clients or customers without explicit approval.");
  }

  if (strictness === "VERY_HIGH") {
    rules.push("All AI usage sessions must be logged with output samples retained for audit.");
    rules.push("Periodic guardrail review required (minimum quarterly).");
  }

  return rules;
}

// ------------------------------
// REVIEW_MODEL artifact
// ------------------------------

/**
 * REVIEW_MODEL — Defines how outputs are reviewed: depth, cadence, and
 * who is responsible. Derived from review_depth and leadership posture.
 */
export function generateReviewModelArtifact(ctx: ArtifactInputs): Record<string, unknown> {
  const { inputs, outputs } = ctx;

  return {
    artifact_type: "REVIEW_MODEL",
    schema_version: 1,
    review_depth: outputs.review_depth,
    leadership_posture: inputs.leadership_posture,
    review_cadence: deriveReviewCadence(outputs.review_depth),
    review_requirements: deriveReviewRequirements(outputs.review_depth, inputs.leadership_posture),
  };
}

function deriveReviewCadence(depth: DecisionOutput["review_depth"]): string {
  switch (depth) {
    case "LIGHT":      return "Ad hoc — review when issues arise.";
    case "STANDARD":   return "Monthly spot checks on AI output quality.";
    case "STRUCTURED": return "Bi-weekly structured review with a designated reviewer.";
    case "FORMAL":     return "Weekly formal review with documented sign-off.";
  }
}

function deriveReviewRequirements(
  depth: DecisionOutput["review_depth"],
  posture: DecisionInputs["leadership_posture"]
): string[] {
  const reqs: string[] = [];

  if (depth === "LIGHT") {
    reqs.push("No mandatory reviewer role required.");
    reqs.push("Team members self-assess output quality.");
  }

  if (depth === "STANDARD") {
    reqs.push("At least one designated reviewer per team.");
    reqs.push("Reviewer checks a sample of outputs monthly.");
  }

  if (depth === "STRUCTURED") {
    reqs.push("Named reviewer(s) confirmed before rollout proceeds.");
    reqs.push("Bi-weekly review sessions with documented outcomes.");
    reqs.push("Issues escalated to leadership within 48 hours.");
  }

  if (depth === "FORMAL") {
    reqs.push("Formal review committee established.");
    reqs.push("Weekly review with written sign-off retained.");
    reqs.push("All issues tracked in a dedicated register.");
    reqs.push("Leadership must be notified of all high-severity findings within 24 hours.");
  }

  if (posture === "CAUTIOUS") {
    reqs.push("Leadership spot-checks required at least monthly.");
  }

  return reqs;
}

// ------------------------------
// ROLLOUT_PLAN artifact
// ------------------------------

/**
 * ROLLOUT_PLAN — Defines the pacing, mode, and phasing approach for this
 * rollout. Derived from rollout_mode, adoption_state, and needs_stabilization.
 */
export function generateRolloutPlanArtifact(ctx: ArtifactInputs): Record<string, unknown> {
  const { inputs, outputs } = ctx;

  return {
    artifact_type: "ROLLOUT_PLAN",
    schema_version: 1,
    rollout_mode: outputs.rollout_mode,
    adoption_state: inputs.adoption_state,
    needs_stabilization: outputs.needs_stabilization,
    pacing_description: derivePacingDescription(outputs.rollout_mode),
    phases: deriveRolloutPhases(outputs.rollout_mode, outputs.needs_stabilization),
  };
}

function derivePacingDescription(mode: DecisionOutput["rollout_mode"]): string {
  switch (mode) {
    case "CONTROLLED":
      return "Controlled rollout — small cohort, gated progression, full review at each stage.";
    case "PHASED":
      return "Phased rollout — structured expansion across teams with checkpoints between phases.";
    case "FAST":
      return "Fast rollout — broad adoption enabled quickly; monitoring emphasis over gating.";
    case "SPLIT_DEPLOYMENT":
      return "Split deployment — parallel tracks with independent governance for each population.";
  }
}

function deriveRolloutPhases(
  mode: DecisionOutput["rollout_mode"],
  needsStabilization: boolean
): Array<{ phase: number; name: string; description: string }> {
  const phases: Array<{ phase: number; name: string; description: string }> = [];

  if (needsStabilization) {
    phases.push({
      phase: 0,
      name: "Stabilization",
      description: "Establish baseline usage standards before expanding. Document current patterns and identify gaps.",
    });
  }

  switch (mode) {
    case "CONTROLLED":
      phases.push(
        { phase: 1, name: "Pilot", description: "Deploy to a small pilot group (≤10% of target users). Collect structured feedback." },
        { phase: 2, name: "Evaluation", description: "Review pilot outcomes. Confirm guardrails are functioning. Obtain leadership sign-off." },
        { phase: 3, name: "Controlled Expansion", description: "Expand to approved teams only. Maintain review cadence throughout." }
      );
      break;

    case "PHASED":
      phases.push(
        { phase: 1, name: "Phase 1 — Early Adopters", description: "Roll out to motivated early adopters. Establish feedback loop." },
        { phase: 2, name: "Phase 2 — Structured Expansion", description: "Expand to additional teams after Phase 1 checkpoint review." },
        { phase: 3, name: "Phase 3 — Broad Rollout", description: "Full team rollout with ongoing monitoring." }
      );
      break;

    case "FAST":
      phases.push(
        { phase: 1, name: "Broad Enablement", description: "Enable access broadly. Communicate guardrails clearly to all users." },
        { phase: 2, name: "Monitoring", description: "Active monitoring of usage patterns for the first 30 days. Flag anomalies for review." }
      );
      break;

    case "SPLIT_DEPLOYMENT":
      phases.push(
        { phase: 1, name: "Track A Setup", description: "Deploy to lower-sensitivity population with standard guardrails." },
        { phase: 2, name: "Track B Setup", description: "Deploy to higher-sensitivity population with elevated guardrails and formal review." },
        { phase: 3, name: "Convergence Review", description: "Compare outcomes across tracks. Align governance model before full unification." }
      );
      break;
  }

  return phases;
}

// ------------------------------
// POLICY artifact
// ------------------------------

/**
 * POLICY — The governance policy document for this rollout. Captures the
 * policy_tone, key behavioral expectations, and escalation path.
 */
export function generatePolicyArtifact(ctx: ArtifactInputs): Record<string, unknown> {
  const { inputs, outputs } = ctx;

  return {
    artifact_type: "POLICY",
    schema_version: 1,
    policy_tone: outputs.policy_tone,
    primary_goal: inputs.primary_goal,
    sensitivity_anchor: inputs.sensitivity_anchor,
    leadership_posture: inputs.leadership_posture,
    behavioral_expectations: deriveBehavioralExpectations(outputs.policy_tone, inputs.primary_goal),
    escalation_path: deriveEscalationPath(outputs.policy_tone, inputs.sensitivity_anchor),
  };
}

function deriveBehavioralExpectations(
  tone: DecisionOutput["policy_tone"],
  goal: DecisionInputs["primary_goal"]
): string[] {
  const expectations: string[] = [];

  // Tone-based expectations
  switch (tone) {
    case "EMPOWERING":
      expectations.push("Team members are trusted to use AI judgment within guardrails.");
      expectations.push("Experimentation is encouraged; document and share learnings.");
      break;
    case "STRUCTURED":
      expectations.push("AI usage follows documented workflows and approved use cases.");
      expectations.push("Deviations from approved workflows must be flagged to a reviewer.");
      break;
    case "PROTECTIVE":
      expectations.push("All AI outputs must be reviewed before any downstream use.");
      expectations.push("Team members may not expand AI use cases without prior approval.");
      expectations.push("Any unexpected AI behavior must be reported immediately.");
      break;
    case "CONTROLLED_ENABLEMENT":
      expectations.push("AI use is restricted to explicitly pre-approved use cases only.");
      expectations.push("All outputs must be reviewed and logged before use.");
      expectations.push("Compliance team must be notified of any new proposed use case before testing begins.");
      expectations.push("All AI interactions involving regulated data must be documented.");
      break;
  }

  // Goal-specific additions
  if (goal === "CLIENT_COMMUNICATION") {
    expectations.push("AI-drafted client communications must be reviewed by a human before sending.");
  }
  if (goal === "DATA_REPORTING") {
    expectations.push("AI-generated data or figures must be cross-checked against source data before publication.");
  }
  if (goal === "SALES_PROPOSALS") {
    expectations.push("AI-drafted proposals must be reviewed for accuracy of commitments and pricing before submission.");
  }

  return expectations;
}

function deriveEscalationPath(
  tone: DecisionOutput["policy_tone"],
  sensitivity: DecisionInputs["sensitivity_anchor"]
): string {
  if (sensitivity === "REGULATED_CONFIDENTIAL") {
    return "Compliance lead → Legal → Executive sponsor. Any breach or near-miss must be escalated within 1 hour.";
  }
  if (sensitivity === "FINANCIAL_OPERATIONAL_RECORDS") {
    return "Finance lead → Department head → Executive sponsor. Escalate material discrepancies within 24 hours.";
  }
  if (tone === "PROTECTIVE" || tone === "CONTROLLED_ENABLEMENT") {
    return "Reviewer → Team lead → Department head. Escalate within 48 hours.";
  }
  return "Team lead → Department head. Escalate significant issues within one week.";
}
