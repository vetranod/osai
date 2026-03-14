export type RolloutMeta = {
  id: string;
  primary_goal: string;
  adoption_state: string;
  sensitivity_anchor: string;
  leadership_posture: string;
  rollout_mode: string;
  guardrail_strictness: string;
  review_depth: string;
  policy_tone: string;
  maturity_state: string;
  primary_risk_driver: string;
  needs_stabilization: boolean;
  sensitivity_tier: string;
  initiative_lead_name: string | null;
  initiative_lead_title: string | null;
  approving_authority_name: string | null;
  approving_authority_title: string | null;
  created_at: string;
};

export type ArtifactType = "PROFILE" | "GUARDRAILS" | "REVIEW_MODEL" | "ROLLOUT_PLAN" | "POLICY";

export type ArtifactRow = {
  id: string | null;
  artifact_type: ArtifactType;
  generated: boolean;
  version: number | null;
  content_json: Record<string, unknown> | null;
  created_at: string | null;
};

export const ARTIFACT_TITLES: Record<ArtifactType, string> = {
  PROFILE: "Governance Profile",
  GUARDRAILS: "Usage Guardrails",
  REVIEW_MODEL: "Review Standard",
  ROLLOUT_PLAN: "Adoption Plan",
  POLICY: "AI Usage Policy",
};

export const ARTIFACT_SUMMARIES: Record<ArtifactType, string> = {
  PROFILE: "Operational snapshot of the rollout, its intended use, and the governing risk posture.",
  GUARDRAILS: "Permitted, restricted, and human-only boundaries for AI-assisted work.",
  REVIEW_MODEL: "Review authority, cadence, escalation rules, and oversight model.",
  ROLLOUT_PLAN: "Pacing, phases, stabilization controls, and expansion criteria.",
  POLICY: "Consolidated internal policy language for use, review, and data handling.",
};

export function formatEnumDisplay(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  return raw
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function personLine(name: string | null, title: string | null, fallback: string): string {
  return name && title ? `${name}, ${title}` : fallback;
}
