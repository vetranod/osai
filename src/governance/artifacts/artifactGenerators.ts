// src/governance/artifacts/artifactGenerators.ts
//
// Pure, deterministic functions for generating artifact content_json payloads.
// Each function takes the rollout's decision inputs + outputs and returns a
// structured JSON object. No DB calls. No side effects. Independently testable.
//
// Assembly pattern (REVIEW_MODEL, ROLLOUT_PLAN, POLICY):
//   1. Select tone block(s) from toneLibrary keyed by policy_tone
//   2. Select clause block(s) from clauseLibrary keyed by tier/depth/mode
//   3. Inject known noun-level placeholders where required
//   4. Return structured section objects
//
// No prose is written at runtime. The engine selects; it does not compose.

import type { DecisionInputs } from "@/decision-engine/options";
import type { DecisionOutput } from "@/decision-engine/engine";
import {
  getPurposeFraming,
  getRestrictionFraming,
  getEnforcementFraming,
  getPermissionLead,
  getExceptionLine,
  getChangeControlLine,
} from "@/governance/content/toneLibrary";
import {
  getDataHandlingRestrictions,
  getProhibitedDataCategories,
  getClientConfidentiality,
  getApprovedToolsConstraint,
  getReviewRequirementLanguage,
  getDelegationRule,
  getRoleAccountability,
  getEscalationTriggers,
  getStabilizationControls,
  getRollbackAdjustmentTrigger,
  getExpansionCriteria,
  getExternalFacingDisclosure,
  getExternalRepresentationRestrictions,
  getIpOwnershipAcknowledgment,
  getMediaAiControls,
  getIndustryVerticalSupplement,
} from "@/governance/content/clauseLibrary";

// ------------------------------
// Shared input type
// ------------------------------

export type IdentityFields = Readonly<{
  initiative_lead_name:      string | null;
  initiative_lead_title:     string | null;
  approving_authority_name:  string | null;
  approving_authority_title: string | null;
}>;

export type ArtifactInputs = Readonly<{
  inputs:   DecisionInputs;
  outputs:  DecisionOutput;
  identity?: IdentityFields;
}>;

// ------------------------------
// Identity helpers
// ------------------------------

/**
 * Format a person's name + title as a single display string.
 * Returns null if either field is absent.
 * Example: "Sarah Mitchell, Managing Partner"
 */
function formatPerson(name: string | null | undefined, title: string | null | undefined): string | null {
  if (!name || !title) return null;
  return `${name}, ${title}`;
}

/**
 * Returns the reviewer display string.
 * Falls back to "[Designated Reviewer]" when identity is absent.
 */
function resolveReviewer(identity: IdentityFields | undefined): string {
  return formatPerson(identity?.initiative_lead_name, identity?.initiative_lead_title)
    ?? "[Designated Reviewer]";
}

/**
 * Returns the approving authority display string, or null if not set.
 */
function resolveApprover(identity: IdentityFields | undefined): string | null {
  return formatPerson(identity?.approving_authority_name, identity?.approving_authority_title);
}

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
    industry_vertical: inputs.industry_vertical ?? null,
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
 * REVIEW_MODEL — Four sections per locked schema.
 *
 * S1: Review Authority   — role, accountability, delegation rule
 * S2: Review Scope       — approved tools constraint + review requirement language
 * S3: Review Frequency   — cadence per review_depth; bumped if needs_stabilization or CAUTIOUS
 * S4: Escalation Path    — escalation triggers + enforcement framing
 *
 * Drivers: review_depth, leadership_posture, sensitivity_tier, needs_stabilization
 */
export function generateReviewModelArtifact(ctx: ArtifactInputs): Record<string, unknown> {
  const { inputs, outputs, identity } = ctx;
  const tier = outputs.sensitivity_tier;

  return {
    artifact_type:  "REVIEW_MODEL",
    schema_version: 2,
    review_depth:   outputs.review_depth,
    sections: [
      buildReviewAuthority(outputs.review_depth, inputs.leadership_posture, tier, identity),
      buildReviewScope(outputs.review_depth, tier),
      buildReviewFrequency(outputs.review_depth, inputs.leadership_posture, outputs.needs_stabilization),
      buildEscalationPath(tier, outputs.policy_tone),
    ],
  };
}

function buildReviewAuthority(
  depth: DecisionOutput["review_depth"],
  posture: DecisionInputs["leadership_posture"],
  tier: DecisionOutput["sensitivity_tier"],
  identity: IdentityFields | undefined
): Record<string, unknown> {
  const items: Array<Record<string, unknown>> = [
    { label: "Reviewer role",   value: resolveReviewer(identity) },
    { label: "Accountability",  value: getRoleAccountability(depth).text },
    { label: "Delegation rule", value: getDelegationRule(depth, tier).text },
  ];

  // "Approved by" line: present when review_depth is FORMAL or tier is REGULATED
  if (depth === "FORMAL" || tier === "REGULATED") {
    const approver = resolveApprover(identity);
    items.push({
      label: "Approved by",
      value: approver ?? "[Approving Authority]",
    });
  }

  return { id: "review_authority", title: "Review Authority", items };
}

function buildReviewScope(
  depth: DecisionOutput["review_depth"],
  tier: DecisionOutput["sensitivity_tier"]
): Record<string, unknown> {
  return {
    id:    "review_scope",
    title: "Review Scope",
    items: [
      { label: "Tool constraint",        value: getApprovedToolsConstraint(tier).text },
      { label: "Review requirement",     value: getReviewRequirementLanguage(depth).text },
    ],
  };
}

function buildReviewFrequency(
  depth: DecisionOutput["review_depth"],
  posture: DecisionInputs["leadership_posture"],
  needsStabilization: boolean
): Record<string, unknown> {
  // Base cadence per review_depth
  const CADENCE: Readonly<Record<DecisionOutput["review_depth"], string>> = {
    LIGHT:      "Ad hoc — review when issues arise.",
    STANDARD:   "Monthly spot checks on AI output quality.",
    STRUCTURED: "Bi-weekly structured review with a designated reviewer.",
    FORMAL:     "Weekly formal review with documented sign-off.",
  };

  // Bump note if stabilization or cautious posture applies
  const bumpReasons: string[] = [];
  if (needsStabilization) bumpReasons.push("Cadence increased: stabilization period active.");
  if (posture === "CAUTIOUS") bumpReasons.push("Cadence increased: cautious leadership posture requires additional oversight.");

  const items: Array<Record<string, unknown>> = [
    { label: "Standard cadence", value: CADENCE[depth] },
  ];

  if (bumpReasons.length > 0) {
    items.push({ label: "Cadence adjustment", value: bumpReasons, conditional: true });
  }

  return {
    id:    "review_frequency",
    title: "Review Frequency",
    items,
  };
}

function buildEscalationPath(
  tier: DecisionOutput["sensitivity_tier"],
  tone: DecisionOutput["policy_tone"]
): Record<string, unknown> {
  return {
    id:    "escalation_path",
    title: "Escalation Path",
    items: [
      { label: "Escalation triggers", value: getEscalationTriggers(tier).text },
      { label: "Enforcement",         value: getEnforcementFraming(tone).text },
    ],
  };
}

// ------------------------------
// ROLLOUT_PLAN artifact
// ------------------------------

/**
 * ROLLOUT_PLAN — Four sections per locked schema.
 *
 * S1: Rollout Overview      — declared mode, pacing statement, duration estimate
 * S2: Phase Structure       — numbered phases with entry + exit criteria
 * S3: Stabilization Controls — monitoring checkpoints, adjustment triggers, rollback clause
 * S4: Expansion Criteria    — conditions for expanding usage
 *
 * Drivers: rollout_mode, needs_stabilization, sensitivity_tier, leadership_posture
 */
export function generateRolloutPlanArtifact(ctx: ArtifactInputs): Record<string, unknown> {
  const { inputs, outputs, identity } = ctx;
  const tier = outputs.sensitivity_tier;

  return {
    artifact_type:       "ROLLOUT_PLAN",
    schema_version:      2,
    rollout_mode:        outputs.rollout_mode,
    needs_stabilization: outputs.needs_stabilization,
    sections: [
      buildRolloutOverview(outputs.rollout_mode, outputs.needs_stabilization, tier, inputs.leadership_posture, identity),
      buildPhaseStructure(outputs.rollout_mode, outputs.needs_stabilization),
      buildStabilizationControls(outputs.rollout_mode, outputs.needs_stabilization),
      buildExpansionCriteria(outputs.rollout_mode, tier, inputs.leadership_posture),
    ],
  };
}

function buildRolloutOverview(
  mode: DecisionOutput["rollout_mode"],
  needsStabilization: boolean,
  tier: DecisionOutput["sensitivity_tier"],
  posture: DecisionInputs["leadership_posture"],
  identity: IdentityFields | undefined
): Record<string, unknown> {
  const PACING: Readonly<Record<DecisionOutput["rollout_mode"], string>> = {
    CONTROLLED:       "Controlled rollout — small cohort, gated progression, full review at each stage.",
    PHASED:           "Phased rollout — structured expansion across teams with checkpoints between phases.",
    FAST:             "Fast rollout — broad adoption enabled quickly; monitoring emphasis over gating.",
    SPLIT_DEPLOYMENT: "Split deployment — parallel tracks with independent governance for each population.",
  };

  const DURATION: Readonly<Record<DecisionOutput["rollout_mode"], string>> = {
    CONTROLLED:       "Estimated 8 to 12 weeks depending on pilot outcomes and leadership sign-off.",
    PHASED:           "Estimated 6 to 10 weeks across phase transitions.",
    FAST:             "Estimated 2 to 4 weeks to broad enablement; monitoring continues beyond.",
    SPLIT_DEPLOYMENT: "Tracks proceed in parallel; estimated 8 to 14 weeks to convergence review.",
  };

  const items: Array<Record<string, unknown>> = [
    { label: "Declared mode",  value: mode },
    { label: "Pacing",         value: PACING[mode] },
    { label: "Duration estimate", value: DURATION[mode] },
  ];

  if (needsStabilization) {
    items.push({
      label: "Stabilization note",
      value: "A stabilization phase precedes normal rollout pacing. Current AI usage must be documented and standardized before expansion begins.",
      conditional: true,
    });
  }

  // "Approved by" line: present when tier is REGULATED or posture is CAUTIOUS
  if (tier === "REGULATED" || posture === "CAUTIOUS") {
    const approver = resolveApprover(identity);
    items.push({
      label: "Approved by",
      value: approver ?? "[Approving Authority]",
    });
  }

  return {
    id:    "rollout_overview",
    title: "Rollout Overview",
    items,
  };
}

function buildPhaseStructure(
  mode: DecisionOutput["rollout_mode"],
  needsStabilization: boolean
): Record<string, unknown> {
  type Phase = {
    phase: number;
    name: string;
    entry_criteria: string;
    exit_criteria: string;
  };

  const phases: Phase[] = [];

  if (needsStabilization) {
    phases.push({
      phase: 0,
      name:  "Stabilization",
      entry_criteria: "Rollout authorized by leadership. Current AI usage has been identified and documented.",
      exit_criteria:  "Baseline usage standards defined. Existing gaps addressed. Leadership confirms readiness to proceed.",
    });
  }

  switch (mode) {
    case "CONTROLLED":
      phases.push(
        {
          phase: 1,
          name:  "Pilot",
          entry_criteria: "Guardrails confirmed. Pilot group identified. Reviewer assigned.",
          exit_criteria:  "Pilot feedback collected. No unresolved escalations. Leadership sign-off obtained.",
        },
        {
          phase: 2,
          name:  "Evaluation",
          entry_criteria: "Pilot phase complete. Outcomes documented.",
          exit_criteria:  "Review confirms guardrails functioning. Expansion scope approved by leadership.",
        },
        {
          phase: 3,
          name:  "Controlled Expansion",
          entry_criteria: "Evaluation complete. Expansion scope defined and approved.",
          exit_criteria:  "All approved teams onboarded. Review cadence maintained. No active escalations.",
        }
      );
      break;

    case "PHASED":
      phases.push(
        {
          phase: 1,
          name:  "Early Adopters",
          entry_criteria: "Guardrails confirmed. Early adopter group identified. Feedback mechanism established.",
          exit_criteria:  "Phase 1 checkpoint review complete. Findings documented. No blocking issues.",
        },
        {
          phase: 2,
          name:  "Structured Expansion",
          entry_criteria: "Phase 1 exit criteria met. Additional teams identified for expansion.",
          exit_criteria:  "Expanded teams onboarded. Review cadence confirmed across all teams.",
        }
      );
      break;

    case "FAST":
      phases.push(
        {
          phase: 1,
          name:  "Broad Enablement",
          entry_criteria: "Guardrails communicated to all users. Access provisioned.",
          exit_criteria:  "All users enabled. Monitoring active. No critical issues in first 14 days.",
        },
        {
          phase: 2,
          name:  "Active Monitoring",
          entry_criteria: "Broad enablement complete.",
          exit_criteria:  "30-day monitoring window closed. Usage patterns reviewed. Anomalies resolved or escalated.",
        }
      );
      break;

    case "SPLIT_DEPLOYMENT":
      phases.push(
        {
          phase: 1,
          name:  "Track A — Lower-Sensitivity Population",
          entry_criteria: "Track A population identified. Standard guardrails confirmed.",
          exit_criteria:  "Track A stable. Governance model functioning. No unresolved escalations.",
        },
        {
          phase: 2,
          name:  "Track B — Higher-Sensitivity Population",
          entry_criteria: "Elevated guardrails confirmed. Formal review process established for Track B.",
          exit_criteria:  "Track B stable. Formal review cadence maintained. No unresolved escalations.",
        },
        {
          phase: 3,
          name:  "Convergence Review",
          entry_criteria: "Both tracks stable. Outcomes documented across both populations.",
          exit_criteria:  "Governance model aligned. Leadership approves unified model. Convergence complete.",
        }
      );
      break;
  }

  return {
    id:     "phase_structure",
    title:  "Phase Structure",
    phases,
  };
}

function buildStabilizationControls(
  mode: DecisionOutput["rollout_mode"],
  needsStabilization: boolean
): Record<string, unknown> {
  const items: Array<Record<string, unknown>> = [
    { label: "Rollback trigger", value: getRollbackAdjustmentTrigger(mode).text },
  ];

  const stabilizationClause = getStabilizationControls(needsStabilization);
  if (stabilizationClause) {
    items.push({ label: "Stabilization controls", value: stabilizationClause.text, conditional: true });
  }

  if (mode === "FAST") {
    items.push({
      label: "Rollback clause",
      value: "Fast rollout may be paused or reversed at leadership discretion if monitoring identifies systemic issues within the first 30 days.",
      conditional: true,
    });
  }

  if (mode === "SPLIT_DEPLOYMENT") {
    items.push({
      label: "Dual-track rule",
      value: "Track A and Track B operate under independent governance. Issues on one track do not automatically pause the other unless shared root cause is identified.",
      conditional: true,
    });
  }

  return {
    id:    "stabilization_controls",
    title: "Stabilization Controls",
    items,
  };
}

function buildExpansionCriteria(
  mode: DecisionOutput["rollout_mode"],
  tier: DecisionOutput["sensitivity_tier"],
  posture: DecisionInputs["leadership_posture"]
): Record<string, unknown> {
  return {
    id:    "expansion_criteria",
    title: "Expansion Criteria",
    items: [
      { label: "Expansion conditions", value: getExpansionCriteria(mode, tier, posture).text },
    ],
  };
}

// ------------------------------
// POLICY artifact
// ------------------------------

/**
 * POLICY — Six sections per locked schema.
 *
 * S1: Purpose and Scope          — why AI is used, who it applies to, authority statement
 * S2: Permitted Uses             — permission lead + approved tools constraint
 * S3: Prohibited Uses            — restriction framing + prohibited data categories
 * S4: Review and Oversight       — review requirement language + escalation triggers
 * S5: Data Handling Standards    — data handling restrictions + role accountability
 * S6: Policy Modification Clause — change control line + client confidentiality
 *
 * Drivers: policy_tone, sensitivity_tier, review_depth, primary_goal, primary_risk_driver
 */
export function generatePolicyArtifact(ctx: ArtifactInputs): Record<string, unknown> {
  const { inputs, outputs, identity } = ctx;
  const tier = outputs.sensitivity_tier;

  const isExternalFacing =
    inputs.primary_goal === "MARKETING_CONTENT" ||
    inputs.primary_goal === "SALES_PROPOSALS" ||
    inputs.primary_goal === "CLIENT_COMMUNICATION";

  const sections: Record<string, unknown>[] = [
    buildPurposeAndScope(outputs.policy_tone, inputs.primary_goal),
    buildPermittedUses(outputs.policy_tone, tier),
    buildProhibitedUses(outputs.policy_tone, tier),
    buildReviewAndOversight(outputs.review_depth, tier, outputs.policy_tone, identity),
    buildDataHandlingStandards(outputs.review_depth, tier, identity),
    buildPolicyModificationClause(outputs.policy_tone, tier),
  ];

  if (isExternalFacing) {
    sections.push(buildExternalContentStandards(inputs.primary_goal, inputs.industry_vertical));
  }

  if (isExternalFacing || tier === "CLIENT" || tier === "HIGH" || tier === "REGULATED") {
    sections.push(buildIpAndMediaStandards(tier, inputs.primary_goal));
  }

  return {
    artifact_type:  "POLICY",
    schema_version: 2,
    policy_tone:    outputs.policy_tone,
    sections,
  };
}

function buildPurposeAndScope(
  tone: DecisionOutput["policy_tone"],
  goal: DecisionInputs["primary_goal"]
): Record<string, unknown> {
  const GOAL_LABEL: Readonly<Record<DecisionInputs["primary_goal"], string>> = {
    CLIENT_COMMUNICATION:   "client communication",
    INTERNAL_DOCUMENTATION: "internal documentation",
    MARKETING_CONTENT:      "marketing and content production",
    SALES_PROPOSALS:        "sales proposals",
    DATA_REPORTING:         "data analysis and reporting",
    OPERATIONS_ADMIN:       "operations and administration",
  };

  return {
    id:    "purpose_and_scope",
    title: "Purpose and Scope",
    items: [
      { label: "Policy purpose",    value: getPurposeFraming(tone).text },
      { label: "Primary use area",  value: GOAL_LABEL[goal] },
      { label: "Applies to",        value: "All firm employees and contractors using AI tools in connection with firm work." },
    ],
  };
}

function buildPermittedUses(
  tone: DecisionOutput["policy_tone"],
  tier: DecisionOutput["sensitivity_tier"]
): Record<string, unknown> {
  return {
    id:    "permitted_uses",
    title: "Permitted Uses",
    items: [
      { label: "Permission statement", value: getPermissionLead(tone).text },
      { label: "Tool constraint",      value: getApprovedToolsConstraint(tier).text },
      { label: "Exception rule",       value: getExceptionLine(tone).text },
    ],
  };
}

function buildProhibitedUses(
  tone: DecisionOutput["policy_tone"],
  tier: DecisionOutput["sensitivity_tier"]
): Record<string, unknown> {
  return {
    id:    "prohibited_uses",
    title: "Prohibited Uses",
    items: [
      { label: "Prohibition statement",   value: getRestrictionFraming(tone).text },
      { label: "Prohibited data categories", value: getProhibitedDataCategories(tier).text },
    ],
  };
}

function buildReviewAndOversight(
  depth: DecisionOutput["review_depth"],
  tier: DecisionOutput["sensitivity_tier"],
  tone: DecisionOutput["policy_tone"],
  identity: IdentityFields | undefined
): Record<string, unknown> {
  const approver = resolveApprover(identity);
  return {
    id:    "review_and_oversight",
    title: "Review and Oversight",
    items: [
      { label: "Review requirement",   value: getReviewRequirementLanguage(depth).text },
      { label: "Escalation triggers",  value: getEscalationTriggers(tier).text },
      { label: "Non-compliance",       value: getEnforcementFraming(tone).text },
      { label: "Approved by",          value: approver ?? "[Approving Authority]" },
    ],
  };
}

function buildDataHandlingStandards(
  depth: DecisionOutput["review_depth"],
  tier: DecisionOutput["sensitivity_tier"],
  identity: IdentityFields | undefined
): Record<string, unknown> {
  const approver = resolveApprover(identity);
  return {
    id:    "data_handling_standards",
    title: "Data Handling Standards",
    items: [
      { label: "Data handling",       value: getDataHandlingRestrictions(tier).text },
      { label: "Role accountability", value: getRoleAccountability(depth).text },
      { label: "Approved by",         value: approver ?? "[Approving Authority]" },
    ],
  };
}

function buildPolicyModificationClause(
  tone: DecisionOutput["policy_tone"],
  tier: DecisionOutput["sensitivity_tier"]
): Record<string, unknown> {
  const items: Array<Record<string, unknown>> = [
    { label: "Modification requirement", value: getChangeControlLine(tone).text },
    { label: "Confidentiality obligations", value: getClientConfidentiality(tier).text },
  ];

  if (tier === "CLIENT" || tier === "HIGH" || tier === "REGULATED") {
    items.push({
      label: "Formal review requirement",
      value: "Modifications affecting permitted uses or data handling standards require formal review before adoption.",
      conditional: true,
    });
  }

  return {
    id:    "policy_modification_clause",
    title: "Policy Modification Clause",
    items,
  };
}

// ------------------------------
// POLICY S7: External Content Standards
// Appears only when primary_goal is external-facing.
// ------------------------------

function buildExternalContentStandards(
  goal: DecisionInputs["primary_goal"],
  vertical: DecisionInputs["industry_vertical"]
): Record<string, unknown> {
  const items: Array<Record<string, unknown>> = [];

  const disclosure = getExternalFacingDisclosure(goal);
  if (disclosure) {
    items.push({ label: "Disclosure standard", value: disclosure.text });
  }

  const restrictions = getExternalRepresentationRestrictions(goal);
  if (restrictions) {
    items.push({ label: "Representation restrictions", value: restrictions.text });
  }

  const supplement = getIndustryVerticalSupplement(vertical, goal);
  if (supplement) {
    items.push({ label: "Professional standards", value: supplement.text, conditional: true });
  }

  return {
    id:    "external_content_standards",
    title: "External Content Standards",
    items,
  };
}

// ------------------------------
// POLICY S8: IP and Media Standards
// Appears for external-facing goals and CLIENT/HIGH/REGULATED tiers.
// ------------------------------

function buildIpAndMediaStandards(
  tier: DecisionOutput["sensitivity_tier"],
  goal: DecisionInputs["primary_goal"]
): Record<string, unknown> {
  const items: Array<Record<string, unknown>> = [
    { label: "IP and ownership", value: getIpOwnershipAcknowledgment(tier).text },
  ];

  if (goal === "MARKETING_CONTENT") {
    items.push({ label: "AI media controls", value: getMediaAiControls().text, conditional: true });
  }

  return {
    id:    "ip_and_media_standards",
    title: "IP and Media Standards",
    items,
  };
}
