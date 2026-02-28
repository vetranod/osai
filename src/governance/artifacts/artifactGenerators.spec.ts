// src/governance/artifacts/artifactGenerators.spec.ts

import { describe, it, expect } from "vitest";
import {
  generateProfileArtifact,
  generateGuardrailsArtifact,
  generateReviewModelArtifact,
  generateRolloutPlanArtifact,
  generatePolicyArtifact,
  type ArtifactInputs,
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
    ...overrides,
  };
}

function makeCtx(
  inputOverrides: Partial<DecisionInputs> = {},
  outputOverrides: Partial<DecisionOutput> = {}
): ArtifactInputs {
  return { inputs: makeInputs(inputOverrides), outputs: makeOutputs(outputOverrides) };
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
// GUARDRAILS
// ------------------------------

describe("generateGuardrailsArtifact", () => {
  it("returns artifact_type GUARDRAILS", () => {
    expect(generateGuardrailsArtifact(makeCtx()).artifact_type).toBe("GUARDRAILS");
  });

  it("includes guardrail_strictness", () => {
    const result = generateGuardrailsArtifact(makeCtx({}, { guardrail_strictness: "VERY_HIGH" }));
    expect(result.guardrail_strictness).toBe("VERY_HIGH");
  });

  it("includes rules array with at least one entry for HIGH strictness", () => {
    const result = generateGuardrailsArtifact(makeCtx({}, { guardrail_strictness: "HIGH" }));
    expect(Array.isArray(result.rules)).toBe(true);
    expect((result.rules as string[]).length).toBeGreaterThan(0);
  });

  it("VERY_HIGH strictness produces more rules than HIGH", () => {
    const high     = generateGuardrailsArtifact(makeCtx({}, { guardrail_strictness: "HIGH" }));
    const veryHigh = generateGuardrailsArtifact(makeCtx({}, { guardrail_strictness: "VERY_HIGH" }));
    expect((veryHigh.rules as string[]).length).toBeGreaterThan((high.rules as string[]).length);
  });

  it("REGULATED_CONFIDENTIAL adds compliance-specific rules", () => {
    const result = generateGuardrailsArtifact(
      makeCtx({ sensitivity_anchor: "REGULATED_CONFIDENTIAL" }, { guardrail_strictness: "VERY_HIGH" })
    );
    const rules = result.rules as string[];
    expect(rules.some((r) => r.toLowerCase().includes("regulated"))).toBe(true);
  });

  it("PUBLIC_CONTENT + LOW strictness has no sensitivity rules", () => {
    const result = generateGuardrailsArtifact(
      makeCtx({ sensitivity_anchor: "PUBLIC_CONTENT" }, { guardrail_strictness: "LOW" })
    );
    const rules = result.rules as string[];
    // No client/regulated/financial rules should appear for public content
    expect(rules.some((r) => r.toLowerCase().includes("regulated"))).toBe(false);
    expect(rules.some((r) => r.toLowerCase().includes("client"))).toBe(false);
  });
});

// ------------------------------
// REVIEW_MODEL
// ------------------------------

describe("generateReviewModelArtifact", () => {
  it("returns artifact_type REVIEW_MODEL", () => {
    expect(generateReviewModelArtifact(makeCtx()).artifact_type).toBe("REVIEW_MODEL");
  });

  it("includes review_depth", () => {
    const result = generateReviewModelArtifact(makeCtx({}, { review_depth: "FORMAL" }));
    expect(result.review_depth).toBe("FORMAL");
  });

  it("FORMAL depth produces more requirements than LIGHT", () => {
    const light  = generateReviewModelArtifact(makeCtx({}, { review_depth: "LIGHT" }));
    const formal = generateReviewModelArtifact(makeCtx({}, { review_depth: "FORMAL" }));
    expect((formal.review_requirements as string[]).length).toBeGreaterThan(
      (light.review_requirements as string[]).length
    );
  });

  it("CAUTIOUS posture adds leadership spot-check requirement", () => {
    const result = generateReviewModelArtifact(makeCtx({ leadership_posture: "CAUTIOUS" }, { review_depth: "STRUCTURED" }));
    const reqs = result.review_requirements as string[];
    expect(reqs.some((r) => r.toLowerCase().includes("spot-check") || r.toLowerCase().includes("spot check"))).toBe(true);
  });

  it("review_cadence is a non-empty string", () => {
    const result = generateReviewModelArtifact(makeCtx());
    expect(typeof result.review_cadence).toBe("string");
    expect((result.review_cadence as string).length).toBeGreaterThan(0);
  });
});

// ------------------------------
// ROLLOUT_PLAN
// ------------------------------

describe("generateRolloutPlanArtifact", () => {
  it("returns artifact_type ROLLOUT_PLAN", () => {
    expect(generateRolloutPlanArtifact(makeCtx()).artifact_type).toBe("ROLLOUT_PLAN");
  });

  it("includes rollout_mode", () => {
    const result = generateRolloutPlanArtifact(makeCtx({}, { rollout_mode: "PHASED" }));
    expect(result.rollout_mode).toBe("PHASED");
  });

  it("CONTROLLED mode produces 3 phases", () => {
    const result = generateRolloutPlanArtifact(makeCtx({}, { rollout_mode: "CONTROLLED", needs_stabilization: false }));
    expect((result.phases as unknown[]).length).toBe(3);
  });

  it("needs_stabilization=true adds a phase 0", () => {
    const without = generateRolloutPlanArtifact(makeCtx({}, { rollout_mode: "CONTROLLED", needs_stabilization: false }));
    const with_   = generateRolloutPlanArtifact(makeCtx({}, { rollout_mode: "CONTROLLED", needs_stabilization: true }));
    expect((with_.phases as unknown[]).length).toBe((without.phases as unknown[]).length + 1);
  });

  it("SPLIT_DEPLOYMENT mode produces 3 phases", () => {
    const result = generateRolloutPlanArtifact(makeCtx({}, { rollout_mode: "SPLIT_DEPLOYMENT", needs_stabilization: false }));
    expect((result.phases as unknown[]).length).toBe(3);
  });

  it("pacing_description is a non-empty string", () => {
    const result = generateRolloutPlanArtifact(makeCtx());
    expect(typeof result.pacing_description).toBe("string");
    expect((result.pacing_description as string).length).toBeGreaterThan(0);
  });
});

// ------------------------------
// POLICY
// ------------------------------

describe("generatePolicyArtifact", () => {
  it("returns artifact_type POLICY", () => {
    expect(generatePolicyArtifact(makeCtx()).artifact_type).toBe("POLICY");
  });

  it("includes policy_tone", () => {
    const result = generatePolicyArtifact(makeCtx({}, { policy_tone: "EMPOWERING" }));
    expect(result.policy_tone).toBe("EMPOWERING");
  });

  it("CONTROLLED_ENABLEMENT tone produces more expectations than EMPOWERING", () => {
    const empowering = generatePolicyArtifact(makeCtx({}, { policy_tone: "EMPOWERING" }));
    const controlled = generatePolicyArtifact(makeCtx({}, { policy_tone: "CONTROLLED_ENABLEMENT" }));
    expect((controlled.behavioral_expectations as string[]).length).toBeGreaterThan(
      (empowering.behavioral_expectations as string[]).length
    );
  });

  it("CLIENT_COMMUNICATION goal adds review expectation", () => {
    const result = generatePolicyArtifact(makeCtx({ primary_goal: "CLIENT_COMMUNICATION" }, { policy_tone: "STRUCTURED" }));
    const expectations = result.behavioral_expectations as string[];
    expect(expectations.some((e) => e.toLowerCase().includes("client"))).toBe(true);
  });

  it("DATA_REPORTING goal adds data verification expectation", () => {
    const result = generatePolicyArtifact(makeCtx({ primary_goal: "DATA_REPORTING" }, { policy_tone: "STRUCTURED" }));
    const expectations = result.behavioral_expectations as string[];
    expect(expectations.some((e) => e.toLowerCase().includes("data") || e.toLowerCase().includes("figure"))).toBe(true);
  });

  it("REGULATED_CONFIDENTIAL escalation path mentions compliance", () => {
    const result = generatePolicyArtifact(
      makeCtx({ sensitivity_anchor: "REGULATED_CONFIDENTIAL" }, { policy_tone: "CONTROLLED_ENABLEMENT" })
    );
    expect((result.escalation_path as string).toLowerCase()).toContain("compliance");
  });

  it("escalation_path is a non-empty string", () => {
    const result = generatePolicyArtifact(makeCtx());
    expect(typeof result.escalation_path).toBe("string");
    expect((result.escalation_path as string).length).toBeGreaterThan(0);
  });
});
