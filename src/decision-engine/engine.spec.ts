import { describe, expect, it } from "vitest";
import { evaluateDecision } from "@/decision-engine/engine";
import type { DecisionInputs } from "@/decision-engine/options";

describe("OSAI Decision Engine V1 — Step 2.4 pinned behaviors", () => {
  it("is deterministic for identical inputs", () => {
    const inputs: DecisionInputs = {
      primary_goal: "DATA_REPORTING",
      adoption_state: "MULTIPLE_REGULAR",
      sensitivity_anchor: "INTERNAL_BUSINESS_INFO",
      leadership_posture: "BALANCED",
    };

    const a = evaluateDecision(inputs);
    const b = evaluateDecision(inputs);

    expect(a).toEqual(b);
  });

  it("WIDELY_USED_UNSTANDARDIZED => needs_stabilization=true", () => {
    const inputs: DecisionInputs = {
      primary_goal: "INTERNAL_DOCUMENTATION",
      adoption_state: "WIDELY_USED_UNSTANDARDIZED",
      sensitivity_anchor: "PUBLIC_CONTENT",
      leadership_posture: "BALANCED",
    };

    const result = evaluateDecision(inputs);
    expect(result.output.needs_stabilization).toBe(true);
  });

  it("Split deployment trigger forces rollout_mode=SPLIT_DEPLOYMENT", () => {
    const inputs: DecisionInputs = {
      primary_goal: "SALES_PROPOSALS",
      adoption_state: "WIDELY_USED_UNSTANDARDIZED",
      sensitivity_anchor: "REGULATED_CONFIDENTIAL",
      leadership_posture: "MOVE_QUICKLY",
    };

    const result = evaluateDecision(inputs);
    expect(result.output.rollout_mode).toBe("SPLIT_DEPLOYMENT");
  });

  it("Split deployment does not change strictness/review floors (REGULATED baseline floors remain at least HIGH/STRUCTURED)", () => {
    const inputs: DecisionInputs = {
      primary_goal: "MARKETING_CONTENT",
      adoption_state: "WIDELY_USED_UNSTANDARDIZED",
      sensitivity_anchor: "REGULATED_CONFIDENTIAL",
      leadership_posture: "MOVE_QUICKLY",
    };

    const result = evaluateDecision(inputs);

    expect(["HIGH", "VERY_HIGH"]).toContain(result.output.guardrail_strictness);
    expect(["STRUCTURED", "FORMAL"]).toContain(result.output.review_depth);
  });

  it("Strictness: PUBLIC floor MODERATE(2) + DATA_REPORTING(+3) => clamp to VERY_HIGH(4)", () => {
    const inputs: DecisionInputs = {
      primary_goal: "DATA_REPORTING",
      adoption_state: "FEW_EXPERIMENTING",
      sensitivity_anchor: "PUBLIC_CONTENT",
      leadership_posture: "BALANCED",
    };

    const result = evaluateDecision(inputs);
    expect(result.output.guardrail_strictness).toBe("VERY_HIGH");
  });

  it("Strictness: CLIENT_MATERIALS floor HIGH(3) + MARKETING_CONTENT(+0) => HIGH(3)", () => {
    const inputs: DecisionInputs = {
      primary_goal: "MARKETING_CONTENT",
      adoption_state: "FEW_EXPERIMENTING",
      sensitivity_anchor: "CLIENT_MATERIALS",
      leadership_posture: "BALANCED",
    };

    const result = evaluateDecision(inputs);
    expect(result.output.guardrail_strictness).toBe("HIGH");
  });

  it("Review: PUBLIC floor STANDARD(2) + MOVE_QUICKLY(-1 but not below floor) + MARKETING_CONTENT(+0) => STANDARD(2)", () => {
    const inputs: DecisionInputs = {
      primary_goal: "MARKETING_CONTENT",
      adoption_state: "FEW_EXPERIMENTING",
      sensitivity_anchor: "PUBLIC_CONTENT",
      leadership_posture: "MOVE_QUICKLY",
    };

    const result = evaluateDecision(inputs);
    expect(result.output.review_depth).toBe("STANDARD");
  });

  it("Review: PUBLIC floor STANDARD(2) + CAUTIOUS(+1) + DATA_REPORTING(+2) => clamp to FORMAL(4)", () => {
    const inputs: DecisionInputs = {
      primary_goal: "DATA_REPORTING",
      adoption_state: "FEW_EXPERIMENTING",
      sensitivity_anchor: "PUBLIC_CONTENT",
      leadership_posture: "CAUTIOUS",
    };

    const result = evaluateDecision(inputs);
    expect(result.output.review_depth).toBe("FORMAL");
  });

  it("Maturity baseline: NONE => EXPLORATORY (when no overrides apply)", () => {
    const inputs: DecisionInputs = {
      primary_goal: "DATA_REPORTING",
      adoption_state: "NONE",
      sensitivity_anchor: "PUBLIC_CONTENT",
      leadership_posture: "BALANCED",
    };

    const result = evaluateDecision(inputs);
    expect(result.output.maturity_state).toBe("EXPLORATORY");
  });

  it("Risk override: FINANCIAL_OPERATIONAL_RECORDS => RISK_MANAGED (regardless of adoption)", () => {
    const inputs: DecisionInputs = {
      primary_goal: "DATA_REPORTING",
      adoption_state: "NONE",
      sensitivity_anchor: "FINANCIAL_OPERATIONAL_RECORDS",
      leadership_posture: "BALANCED",
    };

    const result = evaluateDecision(inputs);
    expect(result.output.maturity_state).toBe("RISK_MANAGED");
  });

  it("Risk override: REGULATED_CONFIDENTIAL => CONTROLLED_ENVIRONMENT (regardless of adoption)", () => {
    const inputs: DecisionInputs = {
      primary_goal: "DATA_REPORTING",
      adoption_state: "ENCOURAGED_UNSTRUCTURED",
      sensitivity_anchor: "REGULATED_CONFIDENTIAL",
      leadership_posture: "BALANCED",
    };

    const result = evaluateDecision(inputs);
    expect(result.output.maturity_state).toBe("CONTROLLED_ENVIRONMENT");
  });

  it("Structured middle state: INTERNAL + CONTROLLED + adoption != NONE => STRUCTURED", () => {
    const inputs: DecisionInputs = {
      primary_goal: "INTERNAL_DOCUMENTATION",
      adoption_state: "FEW_EXPERIMENTING",
      sensitivity_anchor: "INTERNAL_BUSINESS_INFO",
      leadership_posture: "BALANCED",
    };

    const result = evaluateDecision(inputs);
    expect(result.output.rollout_mode).toBe("CONTROLLED");
    expect(result.output.maturity_state).toBe("STRUCTURED");
  });

  it("Primary risk driver derived solely from primary_goal (stable under posture/sensitivity/adoption changes)", () => {
    const base: Omit<DecisionInputs, "adoption_state" | "sensitivity_anchor" | "leadership_posture"> = {
      primary_goal: "CLIENT_COMMUNICATION",
    };

    const a = evaluateDecision({
      ...base,
      adoption_state: "NONE",
      sensitivity_anchor: "PUBLIC_CONTENT",
      leadership_posture: "CAUTIOUS",
    });

    const b = evaluateDecision({
      ...base,
      adoption_state: "WIDELY_USED_UNSTANDARDIZED",
      sensitivity_anchor: "REGULATED_CONFIDENTIAL",
      leadership_posture: "MOVE_QUICKLY",
    });

    expect(a.output.primary_risk_driver).toBe("Reputational & Commitment Exposure");
    expect(b.output.primary_risk_driver).toBe("Reputational & Commitment Exposure");
    expect(a.output.primary_risk_driver).toBe(b.output.primary_risk_driver);
  });

  // -----------------------
  // Policy tone mapping pins (NEW)
  // -----------------------

  it("Policy tone: MOVE_QUICKLY => EMPOWERING (base)", () => {
    const inputs: DecisionInputs = {
      primary_goal: "MARKETING_CONTENT",
      adoption_state: "FEW_EXPERIMENTING",
      sensitivity_anchor: "PUBLIC_CONTENT",
      leadership_posture: "MOVE_QUICKLY",
    };

    const result = evaluateDecision(inputs);
    expect(result.output.policy_tone).toBe("EMPOWERING");
  });

  it("Policy tone: CAUTIOUS => PROTECTIVE (base)", () => {
    const inputs: DecisionInputs = {
      primary_goal: "MARKETING_CONTENT",
      adoption_state: "FEW_EXPERIMENTING",
      sensitivity_anchor: "PUBLIC_CONTENT",
      leadership_posture: "CAUTIOUS",
    };

    const result = evaluateDecision(inputs);
    expect(result.output.policy_tone).toBe("PROTECTIVE");
  });

  it("Policy tone constraint: FINANCIAL_OPERATIONAL_RECORDS clamps EMPOWERING => STRUCTURED", () => {
    const inputs: DecisionInputs = {
      primary_goal: "MARKETING_CONTENT",
      adoption_state: "FEW_EXPERIMENTING",
      sensitivity_anchor: "FINANCIAL_OPERATIONAL_RECORDS",
      leadership_posture: "MOVE_QUICKLY", // base EMPOWERING
    };

    const result = evaluateDecision(inputs);
    expect(result.output.policy_tone).toBe("STRUCTURED");
  });

  it("Policy tone override: REGULATED_CONFIDENTIAL => CONTROLLED_ENABLEMENT (always)", () => {
    const inputs: DecisionInputs = {
      primary_goal: "MARKETING_CONTENT",
      adoption_state: "FEW_EXPERIMENTING",
      sensitivity_anchor: "REGULATED_CONFIDENTIAL",
      leadership_posture: "MOVE_QUICKLY",
    };

    const result = evaluateDecision(inputs);
    expect(result.output.policy_tone).toBe("CONTROLLED_ENABLEMENT");
  });
});