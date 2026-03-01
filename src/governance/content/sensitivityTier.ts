// src/governance/content/sensitivityTier.ts
//
// Derives a collapsed sensitivity tier from the raw sensitivity_anchor enum.
// Used for clause selection throughout the content library.
//
// Tier mapping (canonical):
//   LOW       — PUBLIC_CONTENT, INTERNAL_BUSINESS_INFO
//   CLIENT    — CLIENT_MATERIALS
//   HIGH      — FINANCIAL_OPERATIONAL_RECORDS
//   REGULATED — REGULATED_CONFIDENTIAL
//
// Rule: use sensitivity_tier for clause selection.
// Use sensitivity_anchor only where the exact label matters
// (e.g. regulated-specific statutory language).

import type { SensitivityAnchor } from "@/decision-engine/options";

export type SensitivityTier = "LOW" | "CLIENT" | "HIGH" | "REGULATED";

export function deriveSensitivityTier(anchor: SensitivityAnchor): SensitivityTier {
  switch (anchor) {
    case "PUBLIC_CONTENT":
    case "INTERNAL_BUSINESS_INFO":
      return "LOW";
    case "CLIENT_MATERIALS":
      return "CLIENT";
    case "FINANCIAL_OPERATIONAL_RECORDS":
      return "HIGH";
    case "REGULATED_CONFIDENTIAL":
      return "REGULATED";
    default: {
      const _never: never = anchor;
      return _never;
    }
  }
}
