// src/governance/content/toneLibrary.ts
//
// Tone Library v1 — 24 slots.
//
// Two tiers:
//   Full blocks (3 categories × 4 tones = 12) — complete paragraphs.
//   Short lines  (3 categories × 4 tones = 12) — single framing sentences.
//
// All content is static. The engine selects; it does not write.
// No runtime composition. No string concatenation. No conditional grammar.

import type { PolicyTone } from "@/decision-engine/engine";

// ------------------------------
// Full paragraph blocks
// ------------------------------

export type ToneBlock = Readonly<{ text: string }>;

const PURPOSE_FRAMING: Readonly<Record<PolicyTone, ToneBlock>> = {
  EMPOWERING: {
    text: "This policy supports responsible use of artificial intelligence tools within the firm. AI may be used to improve efficiency and quality of work within defined boundaries. Professional judgment remains required in all cases.",
  },
  STRUCTURED: {
    text: "This policy defines how artificial intelligence tools may be used within the firm for defined business activities. AI use is permitted within established boundaries and does not replace professional judgment.",
  },
  PROTECTIVE: {
    text: "This policy establishes safeguards for the use of artificial intelligence tools within the firm. AI use is permitted only within defined limits designed to protect client interests and firm obligations.",
  },
  CONTROLLED_ENABLEMENT: {
    text: "This policy authorizes use of artificial intelligence tools under specific controls. AI may be used only in accordance with defined oversight, data protection, and review requirements.",
  },
};

const RESTRICTION_FRAMING: Readonly<Record<PolicyTone, ToneBlock>> = {
  EMPOWERING: {
    text: "Certain uses of AI are prohibited. AI tools must not be used to create binding commitments, disclose non-public information, or misrepresent firm capabilities.",
  },
  STRUCTURED: {
    text: "The following uses are not permitted. AI tools must not be used to create binding commitments, disclose non-public information, or misrepresent firm capabilities.",
  },
  PROTECTIVE: {
    text: "The following uses are strictly prohibited. AI tools must not be used in any manner that exposes client information, alters contractual obligations, or misrepresents firm commitments.",
  },
  CONTROLLED_ENABLEMENT: {
    text: "The following uses are prohibited unless explicitly approved under defined controls. AI tools must not be used to disclose regulated information, create binding commitments, or alter contractual obligations without documented authorization.",
  },
};

const ENFORCEMENT_FRAMING: Readonly<Record<PolicyTone, ToneBlock>> = {
  EMPOWERING: {
    text: "Failure to comply with this policy may result in corrective action, including restriction of AI tool access. Concerns regarding misuse must be reported to the designated AI oversight lead.",
  },
  STRUCTURED: {
    text: "Failure to comply with this policy may result in restriction of AI tool access or disciplinary action. Oversight concerns must be reported to the designated AI lead.",
  },
  PROTECTIVE: {
    text: "Failure to comply with this policy may result in immediate restriction of AI tool access and disciplinary action. Suspected misuse must be escalated to leadership without delay.",
  },
  CONTROLLED_ENABLEMENT: {
    text: "Failure to comply with this policy will result in suspension of AI tool access pending review. Non-compliant use may require formal corrective action under firm governance procedures.",
  },
};

// ------------------------------
// Short framing lines
// ------------------------------

export type ToneLine = Readonly<{ text: string }>;

const PERMISSION_LEAD: Readonly<Record<PolicyTone, ToneLine>> = {
  EMPOWERING: {
    text: "AI tools may be used to support efficiency and quality within the firm, provided they remain within defined boundaries.",
  },
  STRUCTURED: {
    text: "AI tools may be used for defined business activities subject to the controls described below.",
  },
  PROTECTIVE: {
    text: "AI tools may be used only within clearly defined and monitored use categories.",
  },
  CONTROLLED_ENABLEMENT: {
    text: "AI tools may be used only under approved conditions and in accordance with established oversight requirements.",
  },
};

const EXCEPTION_LINE: Readonly<Record<PolicyTone, ToneLine>> = {
  EMPOWERING: {
    text: "Uses that fall outside the permitted categories require review prior to implementation.",
  },
  STRUCTURED: {
    text: "Use cases not expressly permitted under this policy require review and approval before proceeding.",
  },
  PROTECTIVE: {
    text: "Any use not explicitly authorized under this policy must be reviewed and approved before implementation.",
  },
  CONTROLLED_ENABLEMENT: {
    text: "Any use not expressly authorized under this policy requires documented approval under established governance procedures.",
  },
};

const CHANGE_CONTROL_LINE: Readonly<Record<PolicyTone, ToneLine>> = {
  EMPOWERING: {
    text: "Updates to this policy will be reviewed periodically and approved by firm leadership.",
  },
  STRUCTURED: {
    text: "Modifications to this policy require leadership review and formal approval.",
  },
  PROTECTIVE: {
    text: "Changes to this policy require documented leadership approval prior to adoption.",
  },
  CONTROLLED_ENABLEMENT: {
    text: "Policy modifications require formal authorization and may not take effect without documented approval under firm governance procedures.",
  },
};

// ------------------------------
// Public accessors
// ------------------------------

export function getPurposeFraming(tone: PolicyTone): ToneBlock {
  return PURPOSE_FRAMING[tone];
}

export function getRestrictionFraming(tone: PolicyTone): ToneBlock {
  return RESTRICTION_FRAMING[tone];
}

export function getEnforcementFraming(tone: PolicyTone): ToneBlock {
  return ENFORCEMENT_FRAMING[tone];
}

export function getPermissionLead(tone: PolicyTone): ToneLine {
  return PERMISSION_LEAD[tone];
}

export function getExceptionLine(tone: PolicyTone): ToneLine {
  return EXCEPTION_LINE[tone];
}

export function getChangeControlLine(tone: PolicyTone): ToneLine {
  return CHANGE_CONTROL_LINE[tone];
}
