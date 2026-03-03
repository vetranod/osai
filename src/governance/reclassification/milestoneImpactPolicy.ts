import type { DecisionOutput } from "@/decision-engine/engine";

export type MilestoneCode = "M1" | "M2" | "M3" | "M4";

export type MilestoneStateStatus =
  | "LOCKED"
  | "IN_PROGRESS"
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "ACTIVATED"
  | "PAUSED"
  | "INVALIDATED";

export type MilestoneImpactAction = "NONE" | "PAUSED" | "INVALIDATED";

export type MilestoneStateSummary = {
  code: MilestoneCode;
  order_index: number;
  status: MilestoneStateStatus;
};

export type MilestoneImpact = {
  milestone_code: MilestoneCode;
  current_status: MilestoneStateStatus;
  recommended_action: MilestoneImpactAction;
  reason: string;
  changed_fields: string[];
};

const MILESTONE_ORDER: MilestoneCode[] = ["M1", "M2", "M3", "M4"];

type Rule = {
  milestone: MilestoneCode;
  field: string;
  reason: string;
};

const INPUT_RULES: Rule[] = [
  { milestone: "M1", field: "primary_goal", reason: "Primary goal changes the governance profile and guardrails basis." },
  { milestone: "M1", field: "sensitivity_anchor", reason: "Sensitivity changes the risk floor and guardrail basis." },
];

const OUTPUT_RULES: Rule[] = [
  { milestone: "M1", field: "guardrail_strictness", reason: "Guardrail strictness changes the M1 usage-rules artifact." },
  { milestone: "M1", field: "primary_risk_driver", reason: "Primary risk driver changes the M1 governance profile." },
  { milestone: "M1", field: "sensitivity_tier", reason: "Sensitivity tier changes the M1 governance profile framing." },
  { milestone: "M2", field: "review_depth", reason: "Review depth changes the M2 review model." },
  { milestone: "M3", field: "rollout_mode", reason: "Rollout mode changes the M3 rollout plan pacing." },
  { milestone: "M3", field: "needs_stabilization", reason: "Stabilization requirement changes the M3 rollout plan structure." },
  { milestone: "M4", field: "policy_tone", reason: "Policy tone changes the M4 policy artifact." },
];

function statusAction(status: MilestoneStateStatus): MilestoneImpactAction {
  switch (status) {
    case "LOCKED":
      return "NONE";
    case "IN_PROGRESS":
    case "AWAITING_CONFIRMATION":
      return "PAUSED";
    case "CONFIRMED":
    case "ACTIVATED":
      return "INVALIDATED";
    case "PAUSED":
      return "PAUSED";
    case "INVALIDATED":
      return "INVALIDATED";
    default:
      return "NONE";
  }
}

function changedOutputFields(
  priorOutputs: Partial<Record<keyof DecisionOutput, unknown>>,
  proposedOutputs: Partial<Record<keyof DecisionOutput, unknown>>
): string[] {
  const keys = new Set<string>([
    ...Object.keys(priorOutputs ?? {}),
    ...Object.keys(proposedOutputs ?? {}),
  ]);

  return [...keys].filter((key) => priorOutputs[key as keyof DecisionOutput] !== proposedOutputs[key as keyof DecisionOutput]);
}

export function computeMilestoneImpacts(args: {
  changedInputFields: string[];
  priorOutputs: Partial<Record<keyof DecisionOutput, unknown>>;
  proposedOutputs: Partial<Record<keyof DecisionOutput, unknown>>;
  currentMilestones: MilestoneStateSummary[];
}): MilestoneImpact[] {
  const changedOutputs = changedOutputFields(args.priorOutputs, args.proposedOutputs);
  const matched = new Map<MilestoneCode, Set<string>>();
  const reasons = new Map<MilestoneCode, string[]>();

  for (const rule of INPUT_RULES) {
    if (!args.changedInputFields.includes(rule.field)) continue;
    const fields = matched.get(rule.milestone) ?? new Set<string>();
    fields.add(rule.field);
    matched.set(rule.milestone, fields);
    reasons.set(rule.milestone, [...(reasons.get(rule.milestone) ?? []), rule.reason]);
  }

  for (const rule of OUTPUT_RULES) {
    if (!changedOutputs.includes(rule.field)) continue;
    const fields = matched.get(rule.milestone) ?? new Set<string>();
    fields.add(rule.field);
    matched.set(rule.milestone, fields);
    reasons.set(rule.milestone, [...(reasons.get(rule.milestone) ?? []), rule.reason]);
  }

  const directlyAffected = MILESTONE_ORDER.filter((code) => matched.has(code));
  if (directlyAffected.length === 0) return [];

  const milestoneMap = new Map(args.currentMilestones.map((m) => [m.code, m]));
  const firstAffectedIndex = MILESTONE_ORDER.indexOf(directlyAffected[0]);
  const impacts: MilestoneImpact[] = [];

  for (let idx = firstAffectedIndex; idx < MILESTONE_ORDER.length; idx += 1) {
    const code = MILESTONE_ORDER[idx];
    const current = milestoneMap.get(code) ?? { code, order_index: idx + 1, status: "LOCKED" as MilestoneStateStatus };
    const directReasons = reasons.get(code) ?? [];
    const isDirect = matched.has(code);
    const recommended_action = statusAction(current.status);
    const changed_fields = [...(matched.get(code) ?? new Set<string>())];

    impacts.push({
      milestone_code: code,
      current_status: current.status,
      recommended_action,
      reason: isDirect
        ? directReasons.join(" ")
        : `Downstream of ${directlyAffected[0]} and should be re-reviewed if that earlier checkpoint changes.`,
      changed_fields,
    });
  }

  return impacts;
}

export function requiresMilestoneAdjustment(impacts: MilestoneImpact[]): boolean {
  return impacts.some((impact) => impact.recommended_action !== "NONE");
}

export function summarizeMilestoneImpact(impact: MilestoneImpact): string {
  if (impact.recommended_action === "NONE") {
    return `${impact.milestone_code}: no immediate state change while ${impact.current_status.replace(/_/g, " ").toLowerCase()}; updated configuration should be used when this stage is reached.`;
  }

  return `${impact.milestone_code}: ${impact.current_status.replace(/_/g, " ").toLowerCase()} -> ${impact.recommended_action.toLowerCase()} because ${impact.reason}`;
}

export function milestoneDecisionTable(): Array<{
  milestone_code: MilestoneCode;
  trigger_fields: string[];
  policy: string;
}> {
  return [
    {
      milestone_code: "M1",
      trigger_fields: ["primary_goal", "sensitivity_anchor", "guardrail_strictness", "primary_risk_driver", "sensitivity_tier"],
      policy: "Profile and guardrails basis changed; reached states pause or invalidate depending on current status.",
    },
    {
      milestone_code: "M2",
      trigger_fields: ["review_depth"],
      policy: "Review model changed; reached states pause or invalidate depending on current status.",
    },
    {
      milestone_code: "M3",
      trigger_fields: ["rollout_mode", "needs_stabilization"],
      policy: "Rollout plan changed; reached states pause or invalidate depending on current status.",
    },
    {
      milestone_code: "M4",
      trigger_fields: ["policy_tone"],
      policy: "Policy artifact changed; reached states pause or invalidate depending on current status.",
    },
  ];
}
export function normalizeMilestoneSummary(
  rows: Array<{ code?: string; order_index?: number; status?: string }>
): MilestoneStateSummary[] {
  return rows
    .map((row) => {
      if (
        (row.code !== "M1" && row.code !== "M2" && row.code !== "M3" && row.code !== "M4") ||
        typeof row.order_index !== "number" ||
        typeof row.status !== "string"
      ) {
        return null;
      }

      return {
        code: row.code,
        order_index: row.order_index,
        status: row.status as MilestoneStateStatus,
      };
    })
    .filter((row): row is MilestoneStateSummary => row !== null)
    .sort((a, b) => a.order_index - b.order_index);
}
