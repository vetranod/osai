// src/governance/milestones/milestoneStatus.ts

export const MilestoneStatus = {
  LOCKED: "LOCKED",
  IN_PROGRESS: "IN_PROGRESS",
  AWAITING_CONFIRMATION: "AWAITING_CONFIRMATION",
  CONFIRMED: "CONFIRMED",
  ACTIVATED: "ACTIVATED",
  PAUSED: "PAUSED",
  INVALIDATED: "INVALIDATED",
} as const;

export type MilestoneStatus = (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

export const NORMAL_FLOW_ORDER: ReadonlyArray<MilestoneStatus> = [
  MilestoneStatus.LOCKED,
  MilestoneStatus.IN_PROGRESS,
  MilestoneStatus.AWAITING_CONFIRMATION,
  MilestoneStatus.CONFIRMED,
  MilestoneStatus.ACTIVATED,
] as const;

export function isNormalFlowStatus(s: MilestoneStatus): boolean {
  return (NORMAL_FLOW_ORDER as ReadonlyArray<string>).includes(s);
}