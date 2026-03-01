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
 * Zone classification for a single task or use case.
 * SAFE        — AI may produce; no mandatory review before use.
 * RESTRICTED  — AI may assist; [Designated Reviewer] must review before use.
 * HUMAN_ONLY  — AI must not be used for this task in any form.
 */
export type UsageZone = "SAFE" | "RESTRICTED" | "HUMAN_ONLY";

export type UsageZoneItem = {
  label: string;
  zone: UsageZone;
};

export type UsageZoneSection = {
  title: string;
  items: UsageZoneItem[];
};

/**
 * GUARDRAILS — Three-zone usage classification for the rollout's primary goal.
 * Zones are modulated by sensitivity_anchor and leadership_posture.
 * [Designated Reviewer] is the visible placeholder for the reviewer role
 * to be assigned before the rollout goes live.
 */
export function generateGuardrailsArtifact(ctx: ArtifactInputs): Record<string, unknown> {
  const { inputs, outputs } = ctx;

  const sections = deriveUsageZones(
    inputs.primary_goal,
    inputs.sensitivity_anchor,
    inputs.leadership_posture
  );

  return {
    artifact_type:        "GUARDRAILS",
    schema_version:       2,
    guardrail_strictness: outputs.guardrail_strictness,
    primary_goal:         inputs.primary_goal,
    sensitivity_anchor:   inputs.sensitivity_anchor,
    leadership_posture:   inputs.leadership_posture,
    reviewer_placeholder: "[Designated Reviewer]",
    sections,
    context_note:         deriveContextNote(inputs.sensitivity_anchor),
  };
}

// ------------------------------
// Zone lookup helper
// ------------------------------

/**
 * Each item in the matrix has three explicit zone values, sourced directly
 * from the locked CSV (Matrix Breakdown.csv):
 *   base            — PUBLIC_CONTENT or INTERNAL_BUSINESS_INFO sensitivity, any non-CAUTIOUS posture
 *   financialOrReg  — CLIENT_MATERIALS, FINANCIAL_OPERATIONAL_RECORDS, or REGULATED_CONFIDENTIAL
 *   cautious        — CAUTIOUS leadership posture (applied on top of any sensitivity level)
 *
 * These are NOT calculated — they are the locked design decisions from the matrix.
 * HUMAN_ONLY items are always HUMAN_ONLY regardless of inputs.
 */
function pickZone(
  sensitivity: DecisionInputs["sensitivity_anchor"],
  posture: DecisionInputs["leadership_posture"],
  base: UsageZone,
  financialOrReg: UsageZone,
  cautious: UsageZone
): UsageZone {
  if (posture === "CAUTIOUS") return cautious;
  if (
    sensitivity === "CLIENT_MATERIALS" ||
    sensitivity === "FINANCIAL_OPERATIONAL_RECORDS" ||
    sensitivity === "REGULATED_CONFIDENTIAL"
  ) return financialOrReg;
  return base;
}

// ------------------------------
// Goal-specific zone matrices
// Columns: base | financial/regulated | cautious
// Source: Matrix Breakdown.csv (locked)
// ------------------------------

function zonesForClientCommunication(
  sensitivity: DecisionInputs["sensitivity_anchor"],
  posture: DecisionInputs["leadership_posture"]
): UsageZoneSection[] {
  const z = (b: UsageZone, f: UsageZone, c: UsageZone) => pickZone(sensitivity, posture, b, f, c);
  return [
    {
      title: "Drafting and correspondence",
      items: [
        { label: "Drafting internal responses",              zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Summarizing calls and meetings",           zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Tone refinement",                          zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "External emails",                          zone: z("RESTRICTED", "RESTRICTED", "RESTRICTED") },
        { label: "Status updates",                           zone: z("RESTRICTED", "RESTRICTED", "RESTRICTED") },
        { label: "Proposal drafts",                          zone: z("RESTRICTED", "HUMAN_ONLY", "HUMAN_ONLY") },
        { label: "Client-facing summaries",                  zone: z("RESTRICTED", "HUMAN_ONLY", "RESTRICTED") },
      ],
    },
    {
      title: "Commitments and agreements",
      items: [
        { label: "Scheduling and meeting invitations",       zone: "HUMAN_ONLY" },
        { label: "Pricing commitments",                      zone: "HUMAN_ONLY" },
        { label: "Scope changes",                            zone: "HUMAN_ONLY" },
        { label: "Contract language",                        zone: "HUMAN_ONLY" },
      ],
    },
  ];
}

function zonesForSalesProposals(
  sensitivity: DecisionInputs["sensitivity_anchor"],
  posture: DecisionInputs["leadership_posture"]
): UsageZoneSection[] {
  const z = (b: UsageZone, f: UsageZone, c: UsageZone) => pickZone(sensitivity, posture, b, f, c);
  return [
    {
      title: "Proposal preparation",
      items: [
        { label: "Structuring proposals",                    zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Formatting and layout",                    zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Summarizing past work",                    zone: z("SAFE",       "RESTRICTED", "HUMAN_ONLY") },
        { label: "Deliverable descriptions",                 zone: z("RESTRICTED", "RESTRICTED", "HUMAN_ONLY") },
        { label: "Timeline drafts",                          zone: z("RESTRICTED", "RESTRICTED", "HUMAN_ONLY") },
        { label: "Pricing explanations",                     zone: z("RESTRICTED", "HUMAN_ONLY", "HUMAN_ONLY") },
        { label: "Differentiation claims",                   zone: z("RESTRICTED", "RESTRICTED", "HUMAN_ONLY") },
      ],
    },
    {
      title: "Commitments and decisions",
      items: [
        { label: "Scheduling follow-ups or next steps",      zone: "HUMAN_ONLY" },
        { label: "Pricing decisions",                        zone: "HUMAN_ONLY" },
        { label: "Custom scope creation",                    zone: "HUMAN_ONLY" },
        { label: "Negotiation concessions",                  zone: "HUMAN_ONLY" },
        { label: "Guarantees",                               zone: "HUMAN_ONLY" },
      ],
    },
  ];
}

function zonesForDataReporting(
  sensitivity: DecisionInputs["sensitivity_anchor"],
  posture: DecisionInputs["leadership_posture"]
): UsageZoneSection[] {
  const z = (b: UsageZone, f: UsageZone, c: UsageZone) => pickZone(sensitivity, posture, b, f, c);
  return [
    {
      title: "Data work and analysis",
      items: [
        { label: "Writing queries (SQL, DAX, etc.)",         zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Explaining methodology",                   zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Structuring analysis logic",               zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "KPI interpretation",                       zone: z("RESTRICTED", "RESTRICTED", "HUMAN_ONLY") },
        { label: "Performance narratives",                   zone: z("RESTRICTED", "RESTRICTED", "HUMAN_ONLY") },
        { label: "Recommendations",                          zone: z("RESTRICTED", "HUMAN_ONLY", "HUMAN_ONLY") },
      ],
    },
    {
      title: "High-stakes outputs",
      items: [
        { label: "Uploading raw client data to any AI tool", zone: "HUMAN_ONLY" },
        { label: "Publishing AI output as final analysis",   zone: "HUMAN_ONLY" },
        { label: "Reporting to clients or stakeholders",     zone: "HUMAN_ONLY" },
      ],
    },
  ];
}

function zonesForMarketingContent(
  sensitivity: DecisionInputs["sensitivity_anchor"],
  posture: DecisionInputs["leadership_posture"]
): UsageZoneSection[] {
  const z = (b: UsageZone, f: UsageZone, c: UsageZone) => pickZone(sensitivity, posture, b, f, c);
  return [
    {
      title: "Content creation",
      items: [
        { label: "Brainstorming and ideation",               zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "First drafts",                             zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Copy variations",                          zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Website copy",                             zone: z("RESTRICTED", "RESTRICTED", "HUMAN_ONLY") },
        { label: "Public posts and social content",          zone: z("RESTRICTED", "RESTRICTED", "HUMAN_ONLY") },
        { label: "Campaign messaging",                       zone: z("RESTRICTED", "RESTRICTED", "HUMAN_ONLY") },
      ],
    },
    {
      title: "Ownership and positioning",
      items: [
        { label: "Scheduling or publishing content directly", zone: "HUMAN_ONLY" },
        { label: "Brand positioning",                         zone: "HUMAN_ONLY" },
        { label: "Core value propositions",                   zone: "HUMAN_ONLY" },
        { label: "Messaging that makes competitive claims",   zone: "HUMAN_ONLY" },
      ],
    },
  ];
}

function zonesForInternalDocumentation(
  sensitivity: DecisionInputs["sensitivity_anchor"],
  posture: DecisionInputs["leadership_posture"]
): UsageZoneSection[] {
  const z = (b: UsageZone, f: UsageZone, c: UsageZone) => pickZone(sensitivity, posture, b, f, c);
  return [
    {
      title: "Drafting and formatting",
      items: [
        { label: "Drafting SOPs and process docs",                    zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Meeting summaries",                                  zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Reorganizing or reformatting existing docs",         zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Policy drafts for internal review",                  zone: z("RESTRICTED", "RESTRICTED", "HUMAN_ONLY") },
        { label: "Role or responsibility definitions",                 zone: z("RESTRICTED", "RESTRICTED", "HUMAN_ONLY") },
        { label: "Compliance-adjacent documentation",                  zone: z("RESTRICTED", "HUMAN_ONLY", "HUMAN_ONLY") },
      ],
    },
    {
      title: "Official and authoritative content",
      items: [
        { label: "Publishing or distributing to staff as final",       zone: "HUMAN_ONLY" },
        { label: "HR procedures",                                       zone: "HUMAN_ONLY" },
        { label: "Any document with legal or regulatory bearing",       zone: "HUMAN_ONLY" },
      ],
    },
  ];
}

function zonesForOperationsAdmin(
  sensitivity: DecisionInputs["sensitivity_anchor"],
  posture: DecisionInputs["leadership_posture"]
): UsageZoneSection[] {
  const z = (b: UsageZone, f: UsageZone, c: UsageZone) => pickZone(sensitivity, posture, b, f, c);
  return [
    {
      title: "Routine operations",
      items: [
        { label: "Meeting summaries and action item lists",            zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Draft internal notes",                               zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Routine task organization",                          zone: z("SAFE",       "SAFE",       "SAFE")       },
        { label: "Vendor communications",                              zone: z("RESTRICTED", "RESTRICTED", "HUMAN_ONLY") },
        { label: "HR communications",                                  zone: z("RESTRICTED", "HUMAN_ONLY", "HUMAN_ONLY") },
        { label: "Process documentation",                              zone: z("RESTRICTED", "RESTRICTED", "HUMAN_ONLY") },
      ],
    },
    {
      title: "Decisions and approvals",
      items: [
        { label: "Scheduling meetings or sending calendar invites",    zone: "HUMAN_ONLY" },
        { label: "Personnel decisions",                                zone: "HUMAN_ONLY" },
        { label: "Payroll or financial instructions",                  zone: "HUMAN_ONLY" },
        { label: "Compliance procedures",                              zone: "HUMAN_ONLY" },
      ],
    },
  ];
}

function deriveUsageZones(
  goal: DecisionInputs["primary_goal"],
  sensitivity: DecisionInputs["sensitivity_anchor"],
  posture: DecisionInputs["leadership_posture"]
): UsageZoneSection[] {
  switch (goal) {
    case "CLIENT_COMMUNICATION":    return zonesForClientCommunication(sensitivity, posture);
    case "INTERNAL_DOCUMENTATION":  return zonesForInternalDocumentation(sensitivity, posture);
    case "MARKETING_CONTENT":       return zonesForMarketingContent(sensitivity, posture);
    case "SALES_PROPOSALS":         return zonesForSalesProposals(sensitivity, posture);
    case "DATA_REPORTING":          return zonesForDataReporting(sensitivity, posture);
    case "OPERATIONS_ADMIN":        return zonesForOperationsAdmin(sensitivity, posture);
    default: {
      const _never: never = goal;
      return _never;
    }
  }
}

function deriveContextNote(sensitivity: DecisionInputs["sensitivity_anchor"]): string {
  switch (sensitivity) {
    case "PUBLIC_CONTENT":
      return "This rollout involves publicly shareable content. Standard review practices apply.";
    case "INTERNAL_BUSINESS_INFO":
      return "This rollout involves internal business information. AI outputs must not be shared outside the organization without review.";
    case "CLIENT_MATERIALS":
      return "This rollout involves client data or materials. Nothing AI-assisted leaves the organization without [Designated Reviewer] sign-off.";
    case "FINANCIAL_OPERATIONAL_RECORDS":
      return "This rollout involves financial or operational records. All AI-generated figures must be independently verified before use. Log all AI-assisted outputs.";
    case "REGULATED_CONFIDENTIAL":
      return "This rollout involves regulated or confidential data. Do not input PII, PHI, or regulated identifiers into any AI tool. Compliance must be notified before any new use case is tested.";
  }
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
