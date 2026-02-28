// src/governance/reclassification/proposalAnalysis.spec.ts

import { describe, it, expect } from "vitest";
import { computeIsLoosening, computeChangedFields } from "./proposalAnalysis";
import type { DecisionInputs } from "@/decision-engine/options";
import type { DecisionOutput } from "@/decision-engine/engine";

// Helpers to keep test cases concise
function makeInputs(overrides: Partial<DecisionInputs> = {}): DecisionInputs {
  return {
    primary_goal:       "MARKETING_CONTENT",
    adoption_state:     "FEW_EXPERIMENTING",
    sensitivity_anchor: "INTERNAL_BUSINESS_INFO",
    leadership_posture: "BALANCED",
    ...overrides,
  };
}

function makeOutputs(
  overrides: Partial<Pick<DecisionOutput, "guardrail_strictness" | "review_depth" | "rollout_mode" | "policy_tone">> = {}
) {
  return {
    guardrail_strictness: "HIGH"       as DecisionOutput["guardrail_strictness"],
    review_depth:         "STRUCTURED" as DecisionOutput["review_depth"],
    rollout_mode:         "CONTROLLED" as DecisionOutput["rollout_mode"],
    policy_tone:          "PROTECTIVE" as DecisionOutput["policy_tone"],
    ...overrides,
  };
}

// ------------------------------
// computeIsLoosening
// ------------------------------

describe("computeIsLoosening", () => {
  it("returns false when nothing changes", () => {
    const prior    = { inputs: makeInputs(), outputs: makeOutputs() };
    const proposed = { inputs: makeInputs(), outputs: makeOutputs() };
    expect(computeIsLoosening(prior, proposed)).toBe(false);
  });

  it("returns false when strictness increases", () => {
    const prior    = { inputs: makeInputs(), outputs: makeOutputs({ guardrail_strictness: "MODERATE" }) };
    const proposed = { inputs: makeInputs(), outputs: makeOutputs({ guardrail_strictness: "HIGH" }) };
    expect(computeIsLoosening(prior, proposed)).toBe(false);
  });

  it("returns true when strictness decreases", () => {
    const prior    = { inputs: makeInputs(), outputs: makeOutputs({ guardrail_strictness: "HIGH" }) };
    const proposed = { inputs: makeInputs(), outputs: makeOutputs({ guardrail_strictness: "MODERATE" }) };
    expect(computeIsLoosening(prior, proposed)).toBe(true);
  });

  it("returns false when review_depth increases", () => {
    const prior    = { inputs: makeInputs(), outputs: makeOutputs({ review_depth: "STANDARD" }) };
    const proposed = { inputs: makeInputs(), outputs: makeOutputs({ review_depth: "STRUCTURED" }) };
    expect(computeIsLoosening(prior, proposed)).toBe(false);
  });

  it("returns true when review_depth decreases", () => {
    const prior    = { inputs: makeInputs(), outputs: makeOutputs({ review_depth: "FORMAL" }) };
    const proposed = { inputs: makeInputs(), outputs: makeOutputs({ review_depth: "STANDARD" }) };
    expect(computeIsLoosening(prior, proposed)).toBe(true);
  });

  it("returns true when sensitivity_anchor decreases", () => {
    const prior    = { inputs: makeInputs({ sensitivity_anchor: "CLIENT_MATERIALS" }), outputs: makeOutputs() };
    const proposed = { inputs: makeInputs({ sensitivity_anchor: "INTERNAL_BUSINESS_INFO" }), outputs: makeOutputs() };
    expect(computeIsLoosening(prior, proposed)).toBe(true);
  });

  it("returns false when sensitivity_anchor increases", () => {
    const prior    = { inputs: makeInputs({ sensitivity_anchor: "INTERNAL_BUSINESS_INFO" }), outputs: makeOutputs() };
    const proposed = { inputs: makeInputs({ sensitivity_anchor: "CLIENT_MATERIALS" }), outputs: makeOutputs() };
    expect(computeIsLoosening(prior, proposed)).toBe(false);
  });

  // rollout_mode: faster rank = loosening
  it("returns true when rollout_mode gets faster (CONTROLLED → PHASED)", () => {
    const prior    = { inputs: makeInputs(), outputs: makeOutputs({ rollout_mode: "CONTROLLED" }) };
    const proposed = { inputs: makeInputs(), outputs: makeOutputs({ rollout_mode: "PHASED" }) };
    expect(computeIsLoosening(prior, proposed)).toBe(true);
  });

  it("returns true when rollout_mode gets faster (PHASED → FAST)", () => {
    const prior    = { inputs: makeInputs(), outputs: makeOutputs({ rollout_mode: "PHASED" }) };
    const proposed = { inputs: makeInputs(), outputs: makeOutputs({ rollout_mode: "FAST" }) };
    expect(computeIsLoosening(prior, proposed)).toBe(true);
  });

  it("returns false when rollout_mode gets slower (FAST → CONTROLLED)", () => {
    const prior    = { inputs: makeInputs(), outputs: makeOutputs({ rollout_mode: "FAST" }) };
    const proposed = { inputs: makeInputs(), outputs: makeOutputs({ rollout_mode: "CONTROLLED" }) };
    expect(computeIsLoosening(prior, proposed)).toBe(false);
  });

  // policy_tone: less protective rank = loosening
  it("returns true when policy_tone becomes less protective (PROTECTIVE → STRUCTURED)", () => {
    const prior    = { inputs: makeInputs(), outputs: makeOutputs({ policy_tone: "PROTECTIVE" }) };
    const proposed = { inputs: makeInputs(), outputs: makeOutputs({ policy_tone: "STRUCTURED" }) };
    expect(computeIsLoosening(prior, proposed)).toBe(true);
  });

  it("returns true when policy_tone becomes less protective (STRUCTURED → EMPOWERING)", () => {
    const prior    = { inputs: makeInputs(), outputs: makeOutputs({ policy_tone: "STRUCTURED" }) };
    const proposed = { inputs: makeInputs(), outputs: makeOutputs({ policy_tone: "EMPOWERING" }) };
    expect(computeIsLoosening(prior, proposed)).toBe(true);
  });

  it("returns false when policy_tone becomes more protective (EMPOWERING → PROTECTIVE)", () => {
    const prior    = { inputs: makeInputs(), outputs: makeOutputs({ policy_tone: "EMPOWERING" }) };
    const proposed = { inputs: makeInputs(), outputs: makeOutputs({ policy_tone: "PROTECTIVE" }) };
    expect(computeIsLoosening(prior, proposed)).toBe(false);
  });

  it("returns true when only one dimension loosens even if others tighten", () => {
    // strictness goes up, but review_depth goes down — still loosening
    const prior    = { inputs: makeInputs(), outputs: makeOutputs({ guardrail_strictness: "MODERATE", review_depth: "FORMAL" }) };
    const proposed = { inputs: makeInputs(), outputs: makeOutputs({ guardrail_strictness: "HIGH",     review_depth: "STANDARD" }) };
    expect(computeIsLoosening(prior, proposed)).toBe(true);
  });
});

// ------------------------------
// computeChangedFields
// ------------------------------

describe("computeChangedFields", () => {
  it("returns empty array when nothing changed", () => {
    expect(computeChangedFields(makeInputs(), makeInputs())).toEqual([]);
  });

  it("detects a single changed field", () => {
    const prior    = makeInputs({ leadership_posture: "BALANCED" });
    const proposed = makeInputs({ leadership_posture: "CAUTIOUS" });
    expect(computeChangedFields(prior, proposed)).toEqual(["leadership_posture"]);
  });

  it("detects multiple changed fields", () => {
    const prior    = makeInputs({ leadership_posture: "BALANCED", sensitivity_anchor: "PUBLIC_CONTENT" });
    const proposed = makeInputs({ leadership_posture: "CAUTIOUS", sensitivity_anchor: "CLIENT_MATERIALS" });
    const result = computeChangedFields(prior, proposed);
    expect(result).toContain("leadership_posture");
    expect(result).toContain("sensitivity_anchor");
    expect(result).toHaveLength(2);
  });

  it("detects all four fields changed", () => {
    const prior    = makeInputs();
    const proposed = makeInputs({
      primary_goal:       "DATA_REPORTING",
      adoption_state:     "WIDELY_USED_UNSTANDARDIZED",
      sensitivity_anchor: "REGULATED_CONFIDENTIAL",
      leadership_posture: "CAUTIOUS",
    });
    expect(computeChangedFields(prior, proposed)).toHaveLength(4);
  });
});
