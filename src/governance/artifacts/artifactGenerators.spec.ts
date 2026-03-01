// src/governance/artifacts/artifactGenerators.spec.ts

import { describe, it, expect } from "vitest";
import {
  generateProfileArtifact,
  generateGuardrailsArtifact,
  generateReviewModelArtifact,
  generateRolloutPlanArtifact,
  generatePolicyArtifact,
  type ArtifactInputs,
  type UsageZoneSection,
} from "./artifactGenerators";
import type { DecisionInputs } from "@/decision-engine/options";
import type { DecisionOutput } from "@/decision-engine/engine";

// ------------------------------
// Test fixtures
// ------------------------------

function makeInputs(overrides: Partial<DecisionInputs> = {}): DecisionInputs {
  return {
    primary_goal:       "MARKETING_CONTENT",
    adoption_state:     "FEW_EXPERIMENTING",
    sensitivity_anchor: "INTERNAL_BUSINESS_INFO",
    leadership_posture: "BALANCED",
    ...overrides,
  };
}

function makeOutputs(overrides: Partial<DecisionOutput> = {}): DecisionOutput {
  return {
    rollout_mode:         "CONTROLLED",
    guardrail_strictness: "HIGH",
    review_depth:         "STRUCTURED",
    policy_tone:          "PROTECTIVE",
    maturity_state:       "STRUCTURED",
    primary_risk_driver:  "Brand Drift Risk",
    needs_stabilization:  false,
    sensitivity_tier:     "LOW",
    ...overrides,
  };
}

function makeCtx(
  inputOverrides: Partial<DecisionInputs> = {},
  outputOverrides: Partial<DecisionOutput> = {}
): ArtifactInputs {
  return { inputs: makeInputs(inputOverrides), outputs: makeOutputs(outputOverrides) };
}

// Helper: get sections array from a generated artifact
function getSections(result: Record<string, unknown>): Array<Record<string, unknown>> {
  return result.sections as Array<Record<string, unknown>>;
}

// Helper: find a section by id
function getSection(
  result: Record<string, unknown>,
  id: string
): Record<string, unknown> | undefined {
  return getSections(result).find((s) => s.id === id);
}

// Helper: get items from a section
type SectionItem = { label: string; value: string | string[]; conditional?: boolean };
function getItems(section: Record<string, unknown>): SectionItem[] {
  return section.items as SectionItem[];
}

// Helper: find an item by label within a section
function getItem(
  section: Record<string, unknown>,
  label: string
): SectionItem | undefined {
  return getItems(section).find((i) => i.label === label);
}

// ------------------------------
// PROFILE
// ------------------------------

describe("generateProfileArtifact", () => {
  it("returns artifact_type PROFILE", () => {
    expect(generateProfileArtifact(makeCtx()).artifact_type).toBe("PROFILE");
  });

  it("includes all input fields", () => {
    const result = generateProfileArtifact(makeCtx());
    expect(result.primary_goal).toBe("MARKETING_CONTENT");
    expect(result.adoption_state).toBe("FEW_EXPERIMENTING");
    expect(result.sensitivity_anchor).toBe("INTERNAL_BUSINESS_INFO");
    expect(result.leadership_posture).toBe("BALANCED");
  });

  it("includes all output fields", () => {
    const result = generateProfileArtifact(makeCtx());
    expect(result.maturity_state).toBe("STRUCTURED");
    expect(result.primary_risk_driver).toBe("Brand Drift Risk");
    expect(result.needs_stabilization).toBe(false);
  });

  it("reflects needs_stabilization=true when present", () => {
    const result = generateProfileArtifact(makeCtx({}, { needs_stabilization: true }));
    expect(result.needs_stabilization).toBe(true);
  });
});

// ------------------------------
// GUARDRAILS — schema_version 2
// Tests verify sections structure, not a flat rules array.
// ------------------------------

describe("generateGuardrailsArtifact", () => {
  it("returns artifact_type GUARDRAILS", () => {
    expect(generateGuardrailsArtifact(makeCtx()).artifact_type).toBe("GUARDRAILS");
  });

  it("returns schema_version 2", () => {
    expect(generateGuardrailsArtifact(makeCtx()).schema_version).toBe(2);
  });

  it("includes guardrail_strictness", () => {
    const result = generateGuardrailsArtifact(makeCtx({}, { guardrail_strictness: "VERY_HIGH" }));
    expect(result.guardrail_strictness).toBe("VERY_HIGH");
  });

  it("returns sections array with at least one section", () => {
    const result = generateGuardrailsArtifact(makeCtx());
    const sections = result.sections as UsageZoneSection[];
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThan(0);
  });

  it("each section has a title and items array", () => {
    const result = generateGuardrailsArtifact(makeCtx());
    const sections = result.sections as UsageZoneSection[];
    for (const section of sections) {
      expect(typeof section.title).toBe("string");
      expect(Array.isArray(section.items)).toBe(true);
    }
  });

  it("each item has a label and a zone value", () => {
    const result = generateGuardrailsArtifact(makeCtx());
    const sections = result.sections as UsageZoneSection[];
    for (const section of sections) {
      for (const item of section.items) {
        expect(typeof item.label).toBe("string");
        expect(["SAFE", "RESTRICTED", "HUMAN_ONLY"]).toContain(item.zone);
      }
    }
  });

  it("CAUTIOUS posture elevates zones compared to BALANCED", () => {
    const balanced = generateGuardrailsArtifact(
      makeCtx({ leadership_posture: "BALANCED", primary_goal: "SALES_PROPOSALS" })
    );
    const cautious = generateGuardrailsArtifact(
      makeCtx({ leadership_posture: "CAUTIOUS", primary_goal: "SALES_PROPOSALS" })
    );
    const balancedSections = balanced.sections as UsageZoneSection[];
    const cautiousSections  = cautious.sections  as UsageZoneSection[];

    // Count HUMAN_ONLY items in each
    const countHumanOnly = (secs: UsageZoneSection[]) =>
      secs.flatMap((s) => s.items).filter((i) => i.zone === "HUMAN_ONLY").length;

    expect(countHumanOnly(cautiousSections)).toBeGreaterThanOrEqual(
      countHumanOnly(balancedSections)
    );
  });

  it("REGULATED_CONFIDENTIAL tier elevates zones compared to LOW", () => {
    const low = generateGuardrailsArtifact(
      makeCtx({ sensitivity_anchor: "PUBLIC_CONTENT", primary_goal: "SALES_PROPOSALS" })
    );
    const regulated = generateGuardrailsArtifact(
      makeCtx({ sensitivity_anchor: "REGULATED_CONFIDENTIAL", primary_goal: "SALES_PROPOSALS" })
    );
    const countRestricted = (secs: UsageZoneSection[]) =>
      secs.flatMap((s) => s.items).filter((i) => i.zone !== "SAFE").length;

    expect(countRestricted(regulated.sections as UsageZoneSection[])).toBeGreaterThan(
      countRestricted(low.sections as UsageZoneSection[])
    );
  });

  it("includes a context_note string", () => {
    const result = generateGuardrailsArtifact(makeCtx());
    expect(typeof result.context_note).toBe("string");
    expect((result.context_note as string).length).toBeGreaterThan(0);
  });

  it("REGULATED_CONFIDENTIAL context_note mentions regulated data", () => {
    const result = generateGuardrailsArtifact(
      makeCtx({ sensitivity_anchor: "REGULATED_CONFIDENTIAL" })
    );
    expect((result.context_note as string).toLowerCase()).toContain("regulated");
  });
});

// ------------------------------
// REVIEW_MODEL — schema_version 2
// ------------------------------

describe("generateReviewModelArtifact", () => {
  it("returns artifact_type REVIEW_MODEL", () => {
    expect(generateReviewModelArtifact(makeCtx()).artifact_type).toBe("REVIEW_MODEL");
  });

  it("returns schema_version 2", () => {
    expect(generateReviewModelArtifact(makeCtx()).schema_version).toBe(2);
  });

  it("returns 4 sections", () => {
    expect(getSections(generateReviewModelArtifact(makeCtx())).length).toBe(4);
  });

  it("sections have expected ids", () => {
    const result = generateReviewModelArtifact(makeCtx());
    const ids = getSections(result).map((s) => s.id);
    expect(ids).toContain("review_authority");
    expect(ids).toContain("review_scope");
    expect(ids).toContain("review_frequency");
    expect(ids).toContain("escalation_path");
  });

  it("review_authority section contains reviewer role and delegation rule", () => {
    const result = generateReviewModelArtifact(makeCtx());
    const section = getSection(result, "review_authority")!;
    expect(getItem(section, "Reviewer role")?.value).toBe("[Designated Reviewer]");
    expect(getItem(section, "Delegation rule")).toBeDefined();
  });

  it("FORMAL depth sets delegation rule to prohibited", () => {
    const result = generateReviewModelArtifact(makeCtx({}, { review_depth: "FORMAL" }));
    const section = getSection(result, "review_authority")!;
    const delegation = getItem(section, "Delegation rule")?.value as string;
    expect(delegation.toLowerCase()).toContain("may not be delegated");
  });

  it("REGULATED tier sets delegation rule to prohibited regardless of depth", () => {
    const result = generateReviewModelArtifact(
      makeCtx({ sensitivity_anchor: "REGULATED_CONFIDENTIAL" }, { review_depth: "STANDARD", sensitivity_tier: "REGULATED" })
    );
    const section = getSection(result, "review_authority")!;
    const delegation = getItem(section, "Delegation rule")?.value as string;
    expect(delegation.toLowerCase()).toContain("may not be delegated");
  });

  it("needs_stabilization=true adds a cadence adjustment note", () => {
    const result = generateReviewModelArtifact(makeCtx({}, { needs_stabilization: true }));
    const section = getSection(result, "review_frequency")!;
    const items = getItems(section);
    const hasAdjustment = items.some((i) => i.label === "Cadence adjustment" && i.conditional === true);
    expect(hasAdjustment).toBe(true);
  });

  it("CAUTIOUS posture adds a cadence adjustment note", () => {
    const result = generateReviewModelArtifact(makeCtx({ leadership_posture: "CAUTIOUS" }));
    const section = getSection(result, "review_frequency")!;
    const items = getItems(section);
    const hasAdjustment = items.some((i) => i.label === "Cadence adjustment" && i.conditional === true);
    expect(hasAdjustment).toBe(true);
  });

  it("BALANCED posture with no stabilization has no cadence adjustment", () => {
    const result = generateReviewModelArtifact(
      makeCtx({ leadership_posture: "BALANCED" }, { needs_stabilization: false })
    );
    const section = getSection(result, "review_frequency")!;
    const items = getItems(section);
    const hasAdjustment = items.some((i) => i.label === "Cadence adjustment");
    expect(hasAdjustment).toBe(false);
  });

  it("escalation_path section contains escalation triggers and enforcement", () => {
    const result = generateReviewModelArtifact(makeCtx());
    const section = getSection(result, "escalation_path")!;
    expect(getItem(section, "Escalation triggers")).toBeDefined();
    expect(getItem(section, "Enforcement")).toBeDefined();
  });

  it("REGULATED tier escalation trigger mentions regulatory risk", () => {
    const result = generateReviewModelArtifact(
      makeCtx({ sensitivity_anchor: "REGULATED_CONFIDENTIAL" }, { sensitivity_tier: "REGULATED" })
    );
    const section = getSection(result, "escalation_path")!;
    const triggers = getItem(section, "Escalation triggers")?.value as string;
    expect(triggers.toLowerCase()).toContain("regulatory");
  });
});

// ------------------------------
// ROLLOUT_PLAN — schema_version 2
// ------------------------------

describe("generateRolloutPlanArtifact", () => {
  it("returns artifact_type ROLLOUT_PLAN", () => {
    expect(generateRolloutPlanArtifact(makeCtx()).artifact_type).toBe("ROLLOUT_PLAN");
  });

  it("returns schema_version 2", () => {
    expect(generateRolloutPlanArtifact(makeCtx()).schema_version).toBe(2);
  });

  it("returns 4 sections", () => {
    expect(getSections(generateRolloutPlanArtifact(makeCtx())).length).toBe(4);
  });

  it("sections have expected ids", () => {
    const result = generateRolloutPlanArtifact(makeCtx());
    const ids = getSections(result).map((s) => s.id);
    expect(ids).toContain("rollout_overview");
    expect(ids).toContain("phase_structure");
    expect(ids).toContain("stabilization_controls");
    expect(ids).toContain("expansion_criteria");
  });

  it("rollout_overview includes declared mode", () => {
    const result = generateRolloutPlanArtifact(makeCtx({}, { rollout_mode: "PHASED" }));
    const section = getSection(result, "rollout_overview")!;
    expect(getItem(section, "Declared mode")?.value).toBe("PHASED");
  });

  it("needs_stabilization=true adds stabilization note to overview", () => {
    const result = generateRolloutPlanArtifact(makeCtx({}, { needs_stabilization: true }));
    const section = getSection(result, "rollout_overview")!;
    const hasNote = getItems(section).some(
      (i) => i.label === "Stabilization note" && i.conditional === true
    );
    expect(hasNote).toBe(true);
  });

  it("needs_stabilization=false has no stabilization note in overview", () => {
    const result = generateRolloutPlanArtifact(makeCtx({}, { needs_stabilization: false }));
    const section = getSection(result, "rollout_overview")!;
    const hasNote = getItems(section).some((i) => i.label === "Stabilization note");
    expect(hasNote).toBe(false);
  });

  it("CONTROLLED mode produces 3 phases", () => {
    const result = generateRolloutPlanArtifact(makeCtx({}, { rollout_mode: "CONTROLLED", needs_stabilization: false }));
    const section = getSection(result, "phase_structure")!;
    expect((section.phases as unknown[]).length).toBe(3);
  });

  it("needs_stabilization=true adds phase 0 to phase structure", () => {
    const without = generateRolloutPlanArtifact(makeCtx({}, { rollout_mode: "CONTROLLED", needs_stabilization: false }));
    const withStab = generateRolloutPlanArtifact(makeCtx({}, { rollout_mode: "CONTROLLED", needs_stabilization: true }));
    const phasesWithout = (getSection(without, "phase_structure")!.phases as unknown[]).length;
    const phasesWith    = (getSection(withStab, "phase_structure")!.phases as unknown[]).length;
    expect(phasesWith).toBe(phasesWithout + 1);
  });

  it("PHASED mode produces 2 phases (min 2)", () => {
    const result = generateRolloutPlanArtifact(makeCtx({}, { rollout_mode: "PHASED", needs_stabilization: false }));
    const section = getSection(result, "phase_structure")!;
    expect((section.phases as unknown[]).length).toBeGreaterThanOrEqual(2);
  });

  it("FAST mode includes rollback clause in stabilization controls", () => {
    const result = generateRolloutPlanArtifact(makeCtx({}, { rollout_mode: "FAST" }));
    const section = getSection(result, "stabilization_controls")!;
    const hasRollback = getItems(section).some(
      (i) => i.label === "Rollback clause" && i.conditional === true
    );
    expect(hasRollback).toBe(true);
  });

  it("SPLIT_DEPLOYMENT mode includes dual-track rule in stabilization controls", () => {
    const result = generateRolloutPlanArtifact(makeCtx({}, { rollout_mode: "SPLIT_DEPLOYMENT" }));
    const section = getSection(result, "stabilization_controls")!;
    const hasDualTrack = getItems(section).some(
      (i) => i.label === "Dual-track rule" && i.conditional === true
    );
    expect(hasDualTrack).toBe(true);
  });

  it("needs_stabilization=true adds stabilization controls clause", () => {
    const result = generateRolloutPlanArtifact(makeCtx({}, { needs_stabilization: true }));
    const section = getSection(result, "stabilization_controls")!;
    const hasClause = getItems(section).some(
      (i) => i.label === "Stabilization controls" && i.conditional === true
    );
    expect(hasClause).toBe(true);
  });

  it("expansion_criteria section is present and non-empty", () => {
    const result = generateRolloutPlanArtifact(makeCtx());
    const section = getSection(result, "expansion_criteria")!;
    expect(getItems(section).length).toBeGreaterThan(0);
  });
});

// ------------------------------
// POLICY — schema_version 2
// ------------------------------

describe("generatePolicyArtifact", () => {
  it("returns artifact_type POLICY", () => {
    expect(generatePolicyArtifact(makeCtx()).artifact_type).toBe("POLICY");
  });

  it("returns schema_version 2", () => {
    expect(generatePolicyArtifact(makeCtx()).schema_version).toBe(2);
  });

  it("returns 6 sections", () => {
    expect(getSections(generatePolicyArtifact(makeCtx())).length).toBe(6);
  });

  it("sections have expected ids", () => {
    const result = generatePolicyArtifact(makeCtx());
    const ids = getSections(result).map((s) => s.id);
    expect(ids).toContain("purpose_and_scope");
    expect(ids).toContain("permitted_uses");
    expect(ids).toContain("prohibited_uses");
    expect(ids).toContain("review_and_oversight");
    expect(ids).toContain("data_handling_standards");
    expect(ids).toContain("policy_modification_clause");
  });

  it("purpose_and_scope contains policy purpose and applies-to", () => {
    const result = generatePolicyArtifact(makeCtx());
    const section = getSection(result, "purpose_and_scope")!;
    expect(getItem(section, "Policy purpose")).toBeDefined();
    expect(getItem(section, "Applies to")).toBeDefined();
  });

  it("EMPOWERING tone uses empowering purpose framing", () => {
    const result = generatePolicyArtifact(makeCtx({}, { policy_tone: "EMPOWERING" }));
    const section = getSection(result, "purpose_and_scope")!;
    const purpose = getItem(section, "Policy purpose")?.value as string;
    expect(purpose.toLowerCase()).toContain("efficiency");
  });

  it("CONTROLLED_ENABLEMENT tone uses controlled purpose framing", () => {
    const result = generatePolicyArtifact(makeCtx({}, { policy_tone: "CONTROLLED_ENABLEMENT" }));
    const section = getSection(result, "purpose_and_scope")!;
    const purpose = getItem(section, "Policy purpose")?.value as string;
    expect(purpose.toLowerCase()).toContain("controls");
  });

  it("permitted_uses section contains permission statement and tool constraint", () => {
    const result = generatePolicyArtifact(makeCtx());
    const section = getSection(result, "permitted_uses")!;
    expect(getItem(section, "Permission statement")).toBeDefined();
    expect(getItem(section, "Tool constraint")).toBeDefined();
    expect(getItem(section, "Exception rule")).toBeDefined();
  });

  it("prohibited_uses section contains prohibition statement and data categories", () => {
    const result = generatePolicyArtifact(makeCtx());
    const section = getSection(result, "prohibited_uses")!;
    expect(getItem(section, "Prohibition statement")).toBeDefined();
    expect(getItem(section, "Prohibited data categories")).toBeDefined();
  });

  it("PROTECTIVE tone has stricter prohibition language than EMPOWERING", () => {
    const empowering = generatePolicyArtifact(makeCtx({}, { policy_tone: "EMPOWERING" }));
    const protective = generatePolicyArtifact(makeCtx({}, { policy_tone: "PROTECTIVE" }));
    const eText = getItem(getSection(empowering, "prohibited_uses")!, "Prohibition statement")?.value as string;
    const pText = getItem(getSection(protective, "prohibited_uses")!, "Prohibition statement")?.value as string;
    expect(pText.toLowerCase()).toContain("strictly prohibited");
    expect(eText.toLowerCase()).not.toContain("strictly");
  });

  it("REGULATED tier data handling mentions approved systems", () => {
    const result = generatePolicyArtifact(
      makeCtx({ sensitivity_anchor: "REGULATED_CONFIDENTIAL" }, { sensitivity_tier: "REGULATED" })
    );
    const section = getSection(result, "data_handling_standards")!;
    const handling = getItem(section, "Data handling")?.value as string;
    expect(handling.toLowerCase()).toContain("formally approved");
  });

  it("review_and_oversight section has three items", () => {
    const result = generatePolicyArtifact(makeCtx());
    const section = getSection(result, "review_and_oversight")!;
    expect(getItems(section).length).toBe(3);
  });

  it("CLIENT tier policy_modification_clause includes formal review requirement", () => {
    const result = generatePolicyArtifact(
      makeCtx({ sensitivity_anchor: "CLIENT_MATERIALS" }, { sensitivity_tier: "CLIENT" })
    );
    const section = getSection(result, "policy_modification_clause")!;
    const hasFormal = getItems(section).some(
      (i) => i.label === "Formal review requirement" && i.conditional === true
    );
    expect(hasFormal).toBe(true);
  });

  it("LOW tier policy_modification_clause does not include formal review requirement", () => {
    const result = generatePolicyArtifact(
      makeCtx({ sensitivity_anchor: "PUBLIC_CONTENT" }, { sensitivity_tier: "LOW" })
    );
    const section = getSection(result, "policy_modification_clause")!;
    const hasFormal = getItems(section).some(
      (i) => i.label === "Formal review requirement"
    );
    expect(hasFormal).toBe(false);
  });
});
