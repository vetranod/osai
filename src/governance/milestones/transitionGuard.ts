// src/governance/milestones/transitionGuard.ts

import { MilestoneStatus, MilestoneStatus as MilestoneStatusT, NORMAL_FLOW_ORDER, isNormalFlowStatus } from "./milestoneStatus";

export type TransitionIntent =
  | "USER_ACTION"
  | "GOVERNANCE_RECLASS_APPLY";

export type TransitionGuardContext = Readonly<{
  intent: TransitionIntent;
}>;

export type TransitionDecision = Readonly<{
  allowed: boolean;
  reason:
    | "OK"
    | "NOOP"
    | "UNKNOWN_STATUS"
    | "LOCKED_CANNOT_ADVANCE_WITHOUT_UNLOCK"
    | "SKIP_NOT_ALLOWED"
    | "REGRESSION_NOT_ALLOWED"
    | "GOVERNANCE_ONLY_STATUS"
    | "GOVERNANCE_ONLY_SOURCE"
    | "ACTIVATED_IS_TERMINAL_IN_NORMAL_FLOW";
}>;

/**
 * Pure transition guard.
 * - Enforces normal forward-only progression:
 *   LOCKED -> IN_PROGRESS -> AWAITING_CONFIRMATION -> CONFIRMED -> ACTIVATED
 * - Blocks skipping and regression in normal operation.
 * - PAUSED/INVALIDATED are only reachable under GOVERNANCE_RECLASS_APPLY.
 * - No DB, no time, deterministic.
 */
export function canTransitionStatus(
  from: MilestoneStatusT,
  to: MilestoneStatusT,
  ctx: TransitionGuardContext
): TransitionDecision {
  // No-op is always allowed (idempotent UI / repeated submits).
  if (from === to) {
    return { allowed: true, reason: "NOOP" };
  }

  // Sanity: ensure statuses are recognized.
  const allStatuses = new Set<string>(Object.values(MilestoneStatus));
  if (!allStatuses.has(from) || !allStatuses.has(to)) {
    return { allowed: false, reason: "UNKNOWN_STATUS" };
  }

  const isGovernance = ctx.intent === "GOVERNANCE_RECLASS_APPLY";

  // Governance-only target statuses.
  if (to === MilestoneStatus.PAUSED || to === MilestoneStatus.INVALIDATED) {
    if (!isGovernance) return { allowed: false, reason: "GOVERNANCE_ONLY_STATUS" };

    // Extra safety: only allow pausing/invalidating from states that exist.
    // (We still permit from any known status; adjust later only if spec forces tighter.)
    return { allowed: true, reason: "OK" };
  }

  // Governance-only source statuses: you can't “resume” from PAUSED/INVALIDATED
  // via normal user actions (must be a governance event or archive+restart).
  if ((from === MilestoneStatus.PAUSED || from === MilestoneStatus.INVALIDATED) && !isGovernance) {
    return { allowed: false, reason: "GOVERNANCE_ONLY_SOURCE" };
  }

  // Normal-flow transitions.
  // If we're in governance intent, we still enforce the normal flow for normal statuses
  // unless we are explicitly moving into PAUSED/INVALIDATED (handled above).
  if (!isNormalFlowStatus(from) || !isNormalFlowStatus(to)) {
    // If either is outside normal flow (but not PAUSED/INVALIDATED handled above),
    // block to keep surface bounded.
    return { allowed: false, reason: "UNKNOWN_STATUS" };
  }

  const fromIdx = NORMAL_FLOW_ORDER.indexOf(from);
  const toIdx = NORMAL_FLOW_ORDER.indexOf(to);

  // Terminal within normal flow: ACTIVATED should not move anywhere else via user actions.
  if (from === MilestoneStatus.ACTIVATED) {
    return { allowed: false, reason: "ACTIVATED_IS_TERMINAL_IN_NORMAL_FLOW" };
  }

  // In normal operation: only advance one step at a time.
  // This prevents silent skipping.
  if (toIdx === fromIdx + 1) {
    // Special case: LOCKED -> IN_PROGRESS is allowed only when the milestone has been unlocked.
    // We don't have milestone linkage here (pure function), so we allow the transition itself.
    // Unlocking enforcement happens via the separate pure unlock function below.
    return { allowed: true, reason: "OK" };
  }

  if (toIdx > fromIdx + 1) {
    return { allowed: false, reason: "SKIP_NOT_ALLOWED" };
  }

  // Regression (toIdx <= fromIdx) is not allowed in normal flow.
  // Governance can still set PAUSED/INVALIDATED, but not silently regress within normal statuses.
  return { allowed: false, reason: "REGRESSION_NOT_ALLOWED" };
}

/**
 * Pure helper to apply the unlock rule:
 * - Unlocking happens on ACTIVATED.
 * - When a milestone is ACTIVATED, the next milestone (by order_index) becomes IN_PROGRESS
 *   if it is currently LOCKED.
 *
 * This does not change the requested milestone's status; it only describes a side-effect
 * to apply to the next milestone in-memory (and later in a DB transaction).
 */
export type MilestoneStateRow = Readonly<{
  milestone_id: number;
  order_index: number;
  status: MilestoneStatusT;
}>;

export type UnlockEffect = Readonly<{
  next_milestone_id: number;
  from: MilestoneStatusT;
  to: MilestoneStatusT;
}>;

export function computeUnlockEffectOnActivation(
  allMilestones: ReadonlyArray<MilestoneStateRow>,
  activatedMilestoneId: number
): UnlockEffect | null {
  const current = allMilestones.find(m => m.milestone_id === activatedMilestoneId);
  if (!current) return null;

  if (current.status !== MilestoneStatus.ACTIVATED) {
    return null;
  }

  const next = allMilestones
    .filter(m => m.order_index > current.order_index)
    .sort((a, b) => a.order_index - b.order_index)[0];

  if (!next) return null;

  if (next.status !== MilestoneStatus.LOCKED) {
    return null;
  }

  return {
    next_milestone_id: next.milestone_id,
    from: MilestoneStatus.LOCKED,
    to: MilestoneStatus.IN_PROGRESS,
  };
}