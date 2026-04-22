// src/governance/content/clauseLibrary.ts
//
// Clause Library v1 — 11 families.
//
// Each clause is prewritten, grammatically complete, and tone-consistent.
// Parameterization is noun-level only (role names, cadence words, etc.).
// No sentence construction at runtime. No conditional grammar branching.
//
// Drivers per family:
//   sensitivity_tier   — LOW | CLIENT | HIGH | REGULATED
//   review_depth       — LIGHT | STANDARD | STRUCTURED | FORMAL
//   rollout_mode       — CONTROLLED | PHASED | FAST | SPLIT_DEPLOYMENT
//   needs_stabilization — boolean
//   leadership_posture — MOVE_QUICKLY | BALANCED | CAUTIOUS

import type { SensitivityTier } from "@/governance/content/sensitivityTier";
import type { ReviewDepth, RolloutMode } from "@/decision-engine/engine";
import type { LeadershipPosture, PrimaryGoal, IndustryVertical } from "@/decision-engine/options";

export type Clause = Readonly<{ text: string }>;

// ------------------------------
// 1. Data Handling Restrictions
// Driver: sensitivity_tier
// Surface: POLICY S5
// ------------------------------

const DATA_HANDLING_RESTRICTIONS: Readonly<Record<SensitivityTier, Clause>> = {
  LOW: {
    text: "AI tools may be used with publicly available or internal business information that does not contain client, financial, or regulated data. Personal identifiers and confidential records must not be entered into prompts. Employees are responsible for confirming that no restricted information is submitted.",
  },
  CLIENT: {
    text: "Client information may be used only in summarized or redacted form. Direct client identifiers, contract terms, proprietary deliverables, and non-public client materials must not be entered into public AI systems. When uncertainty exists, the information must be reviewed before submission.",
  },
  HIGH: {
    text: "Financial and operational records must not be entered into public AI systems. AI use involving this data may occur only within approved tools and must follow the firm's review requirements. Raw system exports, structured financial reports, performance datasets, and payroll records are excluded from direct submission.",
  },
  REGULATED: {
    text: "Regulated or confidential information may not be entered into AI tools unless the system has been formally approved for that use. Approved interactions must be subject to documented oversight and review. Protected health information, regulated financial filings, licensing data, and export-controlled materials are not permitted in unapproved systems. If permissibility is unclear, the submission must not proceed.",
  },
};

export function getDataHandlingRestrictions(tier: SensitivityTier): Clause {
  return DATA_HANDLING_RESTRICTIONS[tier];
}

// ------------------------------
// 2. Prohibited Data Categories
// Driver: sensitivity_tier
// Surface: POLICY S3
// ------------------------------

const PROHIBITED_DATA_CATEGORIES: Readonly<Record<SensitivityTier, Clause>> = {
  LOW: {
    text: "Personal identifiers, confidential client materials, financial records, and regulated data must not be entered into AI tools unless otherwise authorized under this policy.",
  },
  CLIENT: {
    text: "The following may not be entered into public AI systems: client financial statements, legal documentation, protected personal data, confidential contract terms, and proprietary deliverables.",
  },
  HIGH: {
    text: "The following are prohibited in unapproved systems: financial statements, payroll data, internal system exports, performance reports, regulatory filings, and personal identifiers. Submission of structured datasets is not permitted without documented authorization.",
  },
  REGULATED: {
    text: "Protected health information, regulated financial data, government-restricted records, export-controlled materials, and any data governed by statutory protection may not be entered into AI tools unless explicitly authorized under formal governance controls.",
  },
};

export function getProhibitedDataCategories(tier: SensitivityTier): Clause {
  return PROHIBITED_DATA_CATEGORIES[tier];
}

// ------------------------------
// 3. Client Confidentiality
// Driver: sensitivity_tier
// Variants: 3 (LOW uses base; CLIENT / HIGH / REGULATED escalate)
// Surface: POLICY S6
// ------------------------------

// LOW and CLIENT share distinct language; HIGH and REGULATED have their own.
const CLIENT_CONFIDENTIALITY: Readonly<Record<SensitivityTier, Clause>> = {
  LOW: {
    text: "The firm maintains professional confidentiality standards. AI use must not compromise internal business discretion or client trust.",
  },
  CLIENT: {
    text: "Client confidentiality obligations remain in effect when using AI tools. Information provided under contract or engagement may not be disclosed through AI systems beyond agreed boundaries.",
  },
  HIGH: {
    text: "The firm's professional duty of confidentiality applies to all AI-assisted work. Disclosure of financial, operational, or performance information through AI tools is prohibited unless expressly authorized within approved systems.",
  },
  REGULATED: {
    text: "Confidentiality obligations include regulatory and statutory requirements. AI use must not conflict with applicable data protection laws, licensing standards, or contractual data handling terms. Any use involving regulated information must align with documented compliance procedures.",
  },
};

export function getClientConfidentiality(tier: SensitivityTier): Clause {
  return CLIENT_CONFIDENTIALITY[tier];
}

// ------------------------------
// 4. Approved Tools Constraint
// Driver: sensitivity_tier (tone modifier for REGULATED)
// Variants: 3 collapsed (LOW / CLIENT / HIGH+REGULATED share HIGH text unless REGULATED)
// Surface: POLICY S2/S5, REVIEW_MODEL S1/S2
// ------------------------------

const APPROVED_TOOLS_CONSTRAINT: Readonly<Record<SensitivityTier, Clause>> = {
  LOW: {
    text: "Public AI tools may be used for low-risk activities. Users remain responsible for ensuring restricted data is not entered.",
  },
  CLIENT: {
    text: "Client-related work may only be conducted in tools approved by firm leadership. Public systems may not be used for direct client material unless explicitly authorized.",
  },
  HIGH: {
    text: "AI use involving financial or operational data must occur within tools formally approved by firm leadership. Unapproved platforms may not be used for structured records, system exports, or reporting datasets.",
  },
  REGULATED: {
    text: "AI systems must be formally evaluated and authorized prior to use with regulated or confidential information. Unauthorized tools may not be used under any circumstance for such data.",
  },
};

export function getApprovedToolsConstraint(tier: SensitivityTier): Clause {
  return APPROVED_TOOLS_CONSTRAINT[tier];
}

// ------------------------------
// 5. Review Requirement Language
// Driver: review_depth
// Surface: POLICY S4/S5, REVIEW_MODEL S1/S2
// ------------------------------

const REVIEW_REQUIREMENT_LANGUAGE: Readonly<Record<ReviewDepth, Clause>> = {
  LIGHT: {
    text: "The individual using the AI tool is responsible for reviewing output prior to release. Output must be checked for factual accuracy and appropriateness.",
  },
  STANDARD: {
    text: "AI-generated output must be reviewed by the initiative lead before external distribution. Review must confirm accuracy, appropriate tone, and compliance with this policy.",
  },
  STRUCTURED: {
    text: "AI-generated output must undergo documented review prior to release. Review must verify factual accuracy, data handling compliance, client representation standards, and operational impact.",
  },
  FORMAL: {
    text: "AI-generated output requires documented approval by designated leadership prior to release or implementation. Approval must be recorded in accordance with the firm's review procedures.",
  },
};

export function getReviewRequirementLanguage(depth: ReviewDepth): Clause {
  return REVIEW_REQUIREMENT_LANGUAGE[depth];
}

// ------------------------------
// 6. Delegation Rule
// Driver: review_depth + sensitivity_tier
// REGULATED override: delegation prohibited regardless of depth
// FORMAL: delegation prohibited
// Surface: REVIEW_MODEL S1
// ------------------------------

const DELEGATION_RULE_BY_DEPTH: Readonly<Record<ReviewDepth, Clause>> = {
  LIGHT: {
    text: "Review responsibility may be delegated at the discretion of the initiative lead. Delegation does not transfer accountability.",
  },
  STANDARD: {
    text: "Review responsibility may be delegated to a designated reviewer. The initiative lead remains accountable for policy compliance.",
  },
  STRUCTURED: {
    text: "Review responsibility may be delegated to a formally assigned reviewer with documented authority. Delegation must be recorded where required.",
  },
  FORMAL: {
    text: "Review responsibility may not be delegated. Approval must be issued directly by the designated authority.",
  },
};

const DELEGATION_RULE_REGULATED: Clause = {
  text: "Review authority may not be delegated. Where regulated information is involved, approval must be issued directly by the designated authority regardless of review depth.",
};

export function getDelegationRule(depth: ReviewDepth, tier: SensitivityTier): Clause {
  if (tier === "REGULATED" || depth === "FORMAL") {
    return DELEGATION_RULE_REGULATED;
  }
  return DELEGATION_RULE_BY_DEPTH[depth];
}

// ------------------------------
// 7. Role Accountability
// Driver: review_depth
// Surface: POLICY S5, REVIEW_MODEL S1
// ------------------------------

const ROLE_ACCOUNTABILITY: Readonly<Record<ReviewDepth, Clause>> = {
  LIGHT: {
    text: "Each employee remains accountable for the accuracy and appropriateness of AI-assisted work.",
  },
  STANDARD: {
    text: "The initiative lead is accountable for ensuring compliance with review and policy requirements.",
  },
  STRUCTURED: {
    text: "The designated reviewer is accountable for documented verification prior to release.",
  },
  FORMAL: {
    text: "The approving authority is accountable for formal sign-off and confirmation of compliance with governance standards.",
  },
};

export function getRoleAccountability(depth: ReviewDepth): Clause {
  return ROLE_ACCOUNTABILITY[depth];
}

// ------------------------------
// 8. Escalation Triggers
// Driver: sensitivity_tier (tone = framing only, does not change triggers)
// Variants: 4 (LOW / CLIENT / HIGH / REGULATED)
// Surface: POLICY S4, REVIEW_MODEL S4
// ------------------------------

const ESCALATION_TRIGGERS: Readonly<Record<SensitivityTier, Clause>> = {
  LOW: {
    text: "Escalation is required in cases of repeated factual error, client concern, or identified misuse of AI tools.",
  },
  CLIENT: {
    text: "Escalation is required in cases of client complaint, repeated inaccuracy, or potential exposure of client information.",
  },
  HIGH: {
    text: "Escalation is required in cases of financial error, operational impact, repeated inaccuracies, or potential exposure of restricted data. Review procedures may be paused pending resolution.",
  },
  REGULATED: {
    text: "Escalation is required in cases of regulatory risk, potential exposure of protected information, financial impact, or client complaint involving regulated data. The matter must be referred to designated leadership and handled under documented compliance procedures.",
  },
};

export function getEscalationTriggers(tier: SensitivityTier): Clause {
  return ESCALATION_TRIGGERS[tier];
}

// ------------------------------
// 9. Stabilization Controls
// Driver: needs_stabilization + rollout_mode
// Single block — conditional on needs_stabilization=true
// Surface: ROLLOUT_PLAN S3
// ------------------------------

const STABILIZATION_CONTROLS: Clause = {
  text: "AI expansion is temporarily paused during the stabilization period. New use cases require review prior to approval. Review cadence is increased and sampling frequency is expanded during this window. Expansion may resume only after defined evaluation criteria are met.",
};

export function getStabilizationControls(needsStabilization: boolean): Clause | null {
  return needsStabilization ? STABILIZATION_CONTROLS : null;
}

// ------------------------------
// 10. Rollback / Adjustment Trigger
// Driver: rollout_mode
// Single block — applies to all modes
// Surface: ROLLOUT_PLAN S3
// ------------------------------

export function getRollbackAdjustmentTrigger(_mode: RolloutMode): Clause {
  return {
    text: "If performance thresholds, compliance rates, or error limits are not met, rollout pacing may be reduced and prior controls reinstated. Leadership may require additional review or restrict scope until corrective measures are verified.",
  };
}

// ------------------------------
// 11. Expansion Criteria
// Driver: rollout_mode + sensitivity_tier + leadership_posture
// Single block with conditional sentences per driver combination
// Surface: ROLLOUT_PLAN S4
// ------------------------------

export function getExpansionCriteria(
  _mode: RolloutMode,
  _tier: SensitivityTier,
  _posture: LeadershipPosture
): Clause {
  // Single prewritten block covers all driver combinations per locked content.
  // Conditional language for REGULATED and CAUTIOUS is embedded in the clause text.
  return {
    text: "Expansion may proceed when review compliance meets defined thresholds, error rates remain within acceptable limits, and no active escalation events remain unresolved. Where regulated information is involved, leadership approval is required prior to expansion regardless of posture. Where leadership posture is cautious, expansion requires formal review prior to authorization.",
  };
}

// ------------------------------
// 12. External Facing Disclosure
// Driver: primary_goal (external-facing goals only)
// Returns null for internal goals — caller skips section.
// Surface: POLICY S7
// ------------------------------

const EXTERNAL_FACING_DISCLOSURE: Readonly<Partial<Record<PrimaryGoal, Clause>>> = {
  MARKETING_CONTENT: {
    text: "AI-assisted content in marketing materials must be reviewed and approved before external release. Employees are responsible for ensuring that AI-generated text, images, or media does not misrepresent firm capabilities, project history, or published claims. Substantive AI contributions to public-facing materials must be confirmed accurate before distribution.",
  },
  SALES_PROPOSALS: {
    text: "AI-assisted language in proposals and sales materials must be reviewed for accuracy before submission. Claims regarding firm experience, project outcomes, technical qualifications, and pricing must be independently verified. AI-generated proposal content may not be submitted as final without documented review and sign-off by a qualified reviewer.",
  },
  CLIENT_COMMUNICATION: {
    text: "AI-assisted drafts in client-facing correspondence must be reviewed before transmission. The sender is accountable for confirming that the content is accurate, appropriately attributed, and consistent with firm communication standards. AI may not be used to represent positions, commitments, or deliverable terms not yet reviewed by qualified firm personnel.",
  },
};

export function getExternalFacingDisclosure(goal: PrimaryGoal): Clause | null {
  return EXTERNAL_FACING_DISCLOSURE[goal] ?? null;
}

// ------------------------------
// 13. External Representation Restrictions
// Driver: primary_goal (external-facing goals only)
// Returns null for internal goals — caller skips section.
// Surface: POLICY S7
// ------------------------------

const EXTERNAL_REPRESENTATION_RESTRICTIONS: Readonly<Partial<Record<PrimaryGoal, Clause>>> = {
  MARKETING_CONTENT: {
    text: "AI tools may not be used to fabricate project experience, generate synthetic imagery presented as actual firm work, or produce content implying conditions, capabilities, or outcomes that do not exist. AI-generated visuals must not be presented as representative of firm projects, client environments, or real-world conditions unless explicitly disclosed.",
  },
  SALES_PROPOSALS: {
    text: "AI tools may not be used to fabricate project references, misrepresent scope or technical qualifications, or imply experience with project types the firm has not performed. Proposal language must accurately represent the firm's capabilities and prior work. AI may not generate guarantees, warranty language, or commitment terms.",
  },
  CLIENT_COMMUNICATION: {
    text: "AI tools may not be used to misrepresent firm positions, generate false commitments, or imply technical conclusions not confirmed by qualified personnel. AI-assisted correspondence must not contain claims of expertise, deliverable scope, or timeline commitments that have not been reviewed and approved.",
  },
};

export function getExternalRepresentationRestrictions(goal: PrimaryGoal): Clause | null {
  return EXTERNAL_REPRESENTATION_RESTRICTIONS[goal] ?? null;
}

// ------------------------------
// 14. IP Ownership Acknowledgment
// Driver: sensitivity_tier
// Surface: POLICY S8
// ------------------------------

const IP_OWNERSHIP_ACKNOWLEDGMENT: Readonly<Record<SensitivityTier, Clause>> = {
  LOW: {
    text: "Employees should be aware that AI-generated content may not receive the same intellectual property protections as original firm work. AI outputs used in firm deliverables must comply with applicable platform terms of service.",
  },
  CLIENT: {
    text: "AI-generated content incorporated into client deliverables must comply with the applicable platform's terms of service and any client-specific IP requirements. Employees must not submit client-owned content to public AI systems without documented authorization.",
  },
  HIGH: {
    text: "AI tools may not produce output that incorporates proprietary firm data in a way that could constitute unauthorized disclosure. AI-generated outputs derived from financial or operational records may not be treated as firm intellectual property without review of the applicable platform terms.",
  },
  REGULATED: {
    text: "AI-generated content involving regulated or protected information must comply with all applicable data protection, licensing, and ownership requirements. Outputs derived from regulated inputs are subject to the same handling requirements as the underlying information and may not be treated as unencumbered firm property.",
  },
};

export function getIpOwnershipAcknowledgment(tier: SensitivityTier): Clause {
  return IP_OWNERSHIP_ACKNOWLEDGMENT[tier];
}

// ------------------------------
// 15. Media AI Controls
// Driver: primary_goal (MARKETING_CONTENT only)
// Single block — callers check goal before invoking.
// Surface: POLICY S8
// ------------------------------

const MEDIA_AI_CONTROLS: Clause = {
  text: "AI-generated images, video, audio, and content sourced from AI-integrated stock platforms require additional review before external use. AI-generated visuals must not imply real project conditions, site environments, or client assets unless clearly and explicitly disclosed. Third-party platforms incorporating AI-generated media must be used in compliance with platform licensing terms and firm brand standards. AI-generated media that creates confusion, misrepresentation, or reputational risk is not permitted for external publication.",
};

export function getMediaAiControls(): Clause {
  return MEDIA_AI_CONTROLS;
}

// ------------------------------
// 16. Industry Vertical Supplement
// Driver: industry_vertical + primary_goal
// Returns null when no supplement exists for the combination.
// Surface: POLICY S7 (appended to external content section)
// ------------------------------

export function getIndustryVerticalSupplement(
  vertical: IndustryVertical | undefined,
  goal: PrimaryGoal
): Clause | null {
  if (!vertical || vertical === "GENERAL") return null;

  const isExternalFacing =
    goal === "MARKETING_CONTENT" ||
    goal === "SALES_PROPOSALS" ||
    goal === "CLIENT_COMMUNICATION";

  if (!isExternalFacing) return null;

  switch (vertical) {
    case "ENGINEERING_CONSULTING":
      return {
        text: "AI tools may not be used to represent professional engineering credentials, certifications, project experience, or technical outcomes that have not been independently validated. Content representing firm project work must accurately reflect actual scope, conditions, and results. Professional standards of care and obligations under applicable engineering ethics codes apply to all AI-assisted external communications.",
      };
    case "LEGAL_SERVICES":
      return {
        text: "AI tools may not be used in a manner that constitutes the unauthorized practice of law, creates implied attorney-client relationships, or misrepresents the nature or scope of legal services provided. Confidentiality obligations under applicable rules of professional conduct apply to all AI-assisted work involving client or matter information.",
      };
    case "FINANCIAL_SERVICES":
      return {
        text: "AI tools may not be used to generate investment recommendations, financial projections, or regulatory representations that have not been reviewed by a qualified professional. AI-assisted external communications must comply with applicable disclosure requirements and may not imply regulatory endorsement or guaranteed outcomes.",
      };
    case "HEALTHCARE":
      return {
        text: "AI tools may not be used to generate clinical recommendations, diagnostic claims, or representations of patient outcomes for external communications. AI-assisted content must not imply medical endorsement, regulatory approval, or clinical evidence not supported by documented sources.",
      };
    case "MARKETING_AGENCY":
      return {
        text: "AI tools may not be used to fabricate performance claims, attribution data, or case study results in materials representing firm work to clients or prospects. AI-generated creative assets presented as original firm work must be disclosed to the client when required by engagement terms.",
      };
    case "REAL_ESTATE":
      return {
        text: "AI tools may not be used to generate property descriptions, market valuations, or condition representations that have not been verified by a licensed professional. AI-assisted content must not imply regulatory endorsement, licensure, or property conditions that have not been independently confirmed.",
      };
    default: {
      const _never: never = vertical;
      return _never;
    }
  }
}
