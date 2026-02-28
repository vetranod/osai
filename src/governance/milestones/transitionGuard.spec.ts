// src/governance/milestones/transitionGuard.test.ts

import { describe, expect, it } from "vitest";
import { MilestoneStatus } from "./milestoneStatus";
import { canTransitionStatus, computeUnlockEffectOnActivation, MilestoneStateRow } from "./transitionGuard";

describe("canTransitionStatus (pure guard)", () => {
  const userCtx = { intent: "USER_ACTION" as const };
  const govCtx = { intent: "GOVERNANCE_RECLASS_APPLY" as const };

  it("allows NOOP transitions", () => {
    const res = canTransitionStatus(MilestoneStatus.IN_PROGRESS, MilestoneStatus.IN_PROGRESS, userCtx);
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("NOOP");
  });

  it("allows normal forward step-by-step transitions", () => {
    expect(canTransitionStatus(MilestoneStatus.LOCKED, MilestoneStatus.IN_PROGRESS, userCtx)).toMatchObject({ allowed: true, reason: "OK" });
    expect(canTransitionStatus(MilestoneStatus.IN_PROGRESS, MilestoneStatus.AWAITING_CONFIRMATION, userCtx)).toMatchObject({ allowed: true, reason: "OK" });
    expect(canTransitionStatus(MilestoneStatus.AWAITING_CONFIRMATION, MilestoneStatus.CONFIRMED, userCtx)).toMatchObject({ allowed: true, reason: "OK" });
    expect(canTransitionStatus(MilestoneStatus.CONFIRMED, MilestoneStatus.ACTIVATED, userCtx)).toMatchObject({ allowed: true, reason: "OK" });
  });

  it("blocks skipping steps", () => {
    const res = canTransitionStatus(MilestoneStatus.IN_PROGRESS, MilestoneStatus.CONFIRMED, userCtx);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("SKIP_NOT_ALLOWED");
  });

  it("blocks regression", () => {
    const res = canTransitionStatus(MilestoneStatus.CONFIRMED, MilestoneStatus.IN_PROGRESS, userCtx);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("REGRESSION_NOT_ALLOWED");
  });

  it("treats ACTIVATED as terminal in normal flow", () => {
    const res = canTransitionStatus(MilestoneStatus.ACTIVATED, MilestoneStatus.CONFIRMED, userCtx);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("ACTIVATED_IS_TERMINAL_IN_NORMAL_FLOW");
  });

  it("blocks PAUSED and INVALIDATED via normal user actions", () => {
    expect(canTransitionStatus(MilestoneStatus.IN_PROGRESS, MilestoneStatus.PAUSED, userCtx)).toMatchObject({
      allowed: false,
      reason: "GOVERNANCE_ONLY_STATUS",
    });

    expect(canTransitionStatus(MilestoneStatus.CONFIRMED, MilestoneStatus.INVALIDATED, userCtx)).toMatchObject({
      allowed: false,
      reason: "GOVERNANCE_ONLY_STATUS",
    });
  });

  it("allows PAUSED and INVALIDATED via governance reclass apply", () => {
    expect(canTransitionStatus(MilestoneStatus.IN_PROGRESS, MilestoneStatus.PAUSED, govCtx)).toMatchObject({
      allowed: true,
      reason: "OK",
    });

    expect(canTransitionStatus(MilestoneStatus.CONFIRMED, MilestoneStatus.INVALIDATED, govCtx)).toMatchObject({
      allowed: true,
      reason: "OK",
    });
  });

  it("blocks exiting PAUSED/INVALIDATED via user actions (must be governance or archive+restart)", () => {
    expect(canTransitionStatus(MilestoneStatus.PAUSED, MilestoneStatus.IN_PROGRESS, userCtx)).toMatchObject({
      allowed: false,
      reason: "GOVERNANCE_ONLY_SOURCE",
    });

    expect(canTransitionStatus(MilestoneStatus.INVALIDATED, MilestoneStatus.LOCKED, userCtx)).toMatchObject({
      allowed: false,
      reason: "GOVERNANCE_ONLY_SOURCE",
    });
  });
});

describe("computeUnlockEffectOnActivation (pure unlock rule)", () => {
  it("returns null if activated milestone not found", () => {
    const rows: MilestoneStateRow[] = [
      { milestone_id: 1, order_index: 1, status: MilestoneStatus.ACTIVATED },
    ];
    expect(computeUnlockEffectOnActivation(rows, 9)).toBeNull();
  });

  it("returns null unless the milestone is already ACTIVATED", () => {
    const rows: MilestoneStateRow[] = [
      { milestone_id: 1, order_index: 1, status: MilestoneStatus.CONFIRMED },
      { milestone_id: 2, order_index: 2, status: MilestoneStatus.LOCKED },
    ];
    expect(computeUnlockEffectOnActivation(rows, 1)).toBeNull();
  });

  it("unlocks the next LOCKED milestone to IN_PROGRESS when current is ACTIVATED", () => {
    const rows: MilestoneStateRow[] = [
      { milestone_id: 1, order_index: 1, status: MilestoneStatus.ACTIVATED },
      { milestone_id: 2, order_index: 2, status: MilestoneStatus.LOCKED },
      { milestone_id: 3, order_index: 3, status: MilestoneStatus.LOCKED },
    ];
    expect(computeUnlockEffectOnActivation(rows, 1)).toEqual({
      next_milestone_id: 2,
      from: MilestoneStatus.LOCKED,
      to: MilestoneStatus.IN_PROGRESS,
    });
  });

  it("does not unlock if next milestone is not LOCKED", () => {
    const rows: MilestoneStateRow[] = [
      { milestone_id: 1, order_index: 1, status: MilestoneStatus.ACTIVATED },
      { milestone_id: 2, order_index: 2, status: MilestoneStatus.IN_PROGRESS },
    ];
    expect(computeUnlockEffectOnActivation(rows, 1)).toBeNull();
  });

  it("returns null if there is no next milestone", () => {
    const rows: MilestoneStateRow[] = [
      { milestone_id: 4, order_index: 4, status: MilestoneStatus.ACTIVATED },
    ];
    expect(computeUnlockEffectOnActivation(rows, 4)).toBeNull();
  });
});