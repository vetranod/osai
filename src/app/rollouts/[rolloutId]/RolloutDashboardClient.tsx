"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  buildClientAuthHeaders,
  ensureServerSession,
  refreshBrowserSessionAndBridge,
} from "@/lib/browser-auth-client";
import styles from "./dashboard.module.css";

// ---- Types ----

type MilestoneStatus =
  | "LOCKED"
  | "IN_PROGRESS"
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "ACTIVATED"
  | "PAUSED"
  | "INVALIDATED";

type MilestoneCode = "M1" | "M2" | "M3" | "M4";

type Milestone = {
  milestone_id: number;
  code: MilestoneCode;
  order_index: number;
  status: MilestoneStatus;
};

type ArtifactType = "PROFILE" | "GUARDRAILS" | "REVIEW_MODEL" | "ROLLOUT_PLAN" | "POLICY";

type Artifact = {
  artifact_type: ArtifactType;
  generated: boolean;
  id: string | null;
  version: number | null;
  content_json: Record<string, unknown> | null;
  content_markdown: string | null;
  unlocked_by_milestone_id: number | null;
  created_at: string | null;
};

type Reclassification = {
  id: string;
  event_type: "POSTURE" | "SENSITIVITY" | "GOAL";
  status: "PROPOSED" | "APPLIED" | "CANCELLED";
  created_at: string;
  changed_fields: string[];
  is_loosening: boolean;
  apply_allowed: boolean;
  requires_milestone_adjustment?: boolean;
  milestone_impact_summary?: string[];
  milestone_impacts: Array<{
    milestone_code: "M1" | "M2" | "M3" | "M4";
    current_status: MilestoneStatus;
    recommended_action: "NONE" | "PAUSED" | "INVALIDATED";
    reason: string;
    changed_fields: string[];
  }>;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  applied_at: string | null;
  prior_snapshot: { inputs: Record<string, string>; outputs: Record<string, string> } | null;
  proposed_inputs: Record<string, string> | null;
  proposed_outputs: Record<string, string> | null;
};

// ---- Constants ----

const MILESTONE_LABELS: Record<MilestoneCode, string> = {
  M1: "Establish usage rules",
  M2: "Define your review process",
  M3: "Confirm your rollout plan",
  M4: "Adopt the governance policy",
};

// What this milestone stage produces — shown below the title
const MILESTONE_DESCRIPTIONS: Record<MilestoneCode, string> = {
  M1: "Your governance profile and usage guardrails have been generated. Review them with your team. When you are done, mark this stage as reviewed to move forward.",
  M2: "Your review standard has been generated. It defines who is responsible for reviewing AI outputs, how often, and what triggers escalation. Review it with your team, then mark as reviewed.",
  M3: "Your rollout plan has been generated. It defines the phases for introducing AI across your team, with entry and exit criteria for each phase. Review it, then mark as reviewed.",
  M4: "Your governance policy has been generated. This is the formal policy document for your firm — what is permitted, what is not, and what happens if something goes wrong. Review it, then mark as active.",
};

// Status-level description shown beneath the milestone title
const MILESTONE_STATUS_DESCRIPTIONS: Partial<Record<MilestoneStatus, { title: string; description: string }>> = {
  CONFIRMED: {
    title: "Reviewed",
    description: "Your team has reviewed the documents for this stage. Mark as active when you are ready to adopt this as your current governance position.",
  },
  ACTIVATED: {
    title: "Active",
    description: "This is your current governance position. Future work should follow the controls and pacing defined here.",
  },
  PAUSED: {
    title: "Paused — governance change applied",
    description: "A reclassification has updated your governance posture. Review the updated configuration above, then resume this milestone when your team is ready to proceed under the new terms.",
  },
  INVALIDATED: {
    title: "Invalidated — must be redone",
    description: "The updated configuration means this milestone's prior review is no longer valid. Restart this milestone to complete it again under the new governance posture.",
  },
};

const MILESTONE_ARTIFACTS: Record<MilestoneCode, ArtifactType[]> = {
  M1: ["PROFILE", "GUARDRAILS"],
  M2: ["REVIEW_MODEL"],
  M3: ["ROLLOUT_PLAN"],
  M4: ["POLICY"],
};

// UI-visible transitions only. AWAITING_CONFIRMATION is a server-side transient
// state — the client skips it by firing two sequential API calls when the user
// clicks "Mark as reviewed" from IN_PROGRESS.
const STATUS_TRANSITIONS: Record<MilestoneStatus, MilestoneStatus | null> = {
  LOCKED: null,
  IN_PROGRESS: "CONFIRMED",   // client fires IN_PROGRESS→AWAITING then AWAITING→CONFIRMED
  AWAITING_CONFIRMATION: "CONFIRMED",
  CONFIRMED: "ACTIVATED",
  ACTIVATED: null,
  PAUSED: "IN_PROGRESS",
  INVALIDATED: "IN_PROGRESS",
};

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  LOCKED: "Not started",
  IN_PROGRESS: "In Progress",
  AWAITING_CONFIRMATION: "In Progress",
  CONFIRMED: "Reviewed",
  ACTIVATED: "Active",
  PAUSED: "Paused",
  INVALIDATED: "Invalidated",
};

// One button per user-visible state
const TRANSITION_BUTTON_LABEL: Partial<Record<MilestoneStatus, string>> = {
  IN_PROGRESS: "Mark as reviewed",
  AWAITING_CONFIRMATION: "Mark as reviewed",
  CONFIRMED: "Mark as active",
  PAUSED: "Resume milestone",
  INVALIDATED: "Restart milestone",
};

// Helper text shown below each button
const TRANSITION_HELPER_TEXT: Partial<Record<MilestoneStatus, string>> = {
  IN_PROGRESS: "Records that your team has reviewed the documents for this stage.",
  AWAITING_CONFIRMATION: "Records that your team has reviewed the documents for this stage.",
  CONFIRMED: "Records that this is now your active governance position.",
  PAUSED: "Resumes progress under the updated governance posture.",
  INVALIDATED: "Restarts this milestone so it can be re-reviewed under the updated configuration.",
};

// No modals — both buttons are single-click.
const TRANSITION_MODAL: Partial<Record<MilestoneStatus, {
  title: string;
  body: string;
  confirm: string;
}>> = {};

const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  PROFILE:      "Governance Profile",
  GUARDRAILS:   "Usage Guardrails",
  REVIEW_MODEL: "Review Standard",
  ROLLOUT_PLAN: "Adoption Plan",
  POLICY:       "AI Usage Policy",
};

const ARTIFACT_DESCRIPTIONS: Record<ArtifactType, string> = {
  PROFILE:      "Snapshot of posture and risk context for this rollout.",
  GUARDRAILS:   "Allowed use boundaries and restricted areas for AI use.",
  REVIEW_MODEL: "Who reviews AI output, how review occurs, and escalation triggers.",
  ROLLOUT_PLAN: "Pacing, phases, stabilization controls, and expansion criteria.",
  POLICY:       "The consolidated internal policy statement for the firm.",
};

const BADGE_COLORS: Record<string, string> = {
  LOCKED: "subtle",
  IN_PROGRESS: "info",
  AWAITING_CONFIRMATION: "warning",
  CONFIRMED: "success",
  ACTIVATED: "accent",
  PAUSED: "warning",
  INVALIDATED: "danger",
  CONTROLLED: "info",
  PHASED: "warning",
  FAST: "success",
  SPLIT_DEPLOYMENT: "accent",
  LOW: "success",
  MODERATE: "info",
  HIGH: "warning",
  VERY_HIGH: "danger",
  LIGHT: "success",
  STANDARD: "info",
  STRUCTURED: "warning",
  FORMAL: "danger",
  EMPOWERING: "success",
  PROTECTIVE: "warning",
  CONTROLLED_ENABLEMENT: "danger",
  PROPOSED: "warning",
  APPLIED: "success",
  CANCELLED: "subtle",
  ACKNOWLEDGED: "info",
};

function toTitleCase(input: string): string {
  return input
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatEnumDisplay(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const hasUnderscore = raw.includes("_");
  const isUpperToken = /^[A-Z0-9 _-]+$/.test(raw);
  const normalized = raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (hasUnderscore || isUpperToken) return toTitleCase(normalized);
  return raw;
}

function formatFieldLabel(field: string): string {
  return toTitleCase(field.replace(/_/g, " "));
}

function Badge({ value, label }: { value: string; label?: string }) {
  const color = BADGE_COLORS[value] ?? "info";
  return (
    <span className={`${styles.badge} ${styles[`badge_${color}`]}`}>
      {label ?? formatEnumDisplay(value)}
    </span>
  );
}

// Dashboard API calls carry both SSR cookies and bearer/proof fallback headers.
// On 401, force a browser refresh + bridge and retry once with rebuilt headers.
async function fetchDashboardApi(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = await buildClientAuthHeaders(init.headers, {
    preferServerToken: true,
    bridgeMode: "background",
  });
  let res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers,
  });
  if (res.status === 401) {
    const serverToken = await ensureServerSession({ attempts: 3, pauseMs: 200 });
    if (serverToken) {
      const retryHeaders = await buildClientAuthHeaders(init.headers, {
        preferServerToken: true,
      });
      res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
        ...init,
        headers: retryHeaders,
      });
      if (res.status !== 401) {
        return res;
      }
    }

    const refreshedToken = await refreshBrowserSessionAndBridge();
    if (refreshedToken) {
      const retryHeaders = await buildClientAuthHeaders(init.headers);
      return fetch(url, {
        credentials: "include",
        cache: "no-store",
        ...init,
        headers: retryHeaders,
      });
    }
  }
  return res;
}

// ---- Artifact Viewer ----

function renderArtifactContent(artifact: Artifact) {
  if (!artifact.content_json) return null;
  const json = artifact.content_json;

  switch (artifact.artifact_type) {
    case "PROFILE":
      return (
        <div className={styles.artifactBody}>
          <div className={styles.artifactGrid}>
            {[
              ["Primary Goal", json.primary_goal],
              ["Adoption State", json.adoption_state],
              ["Sensitivity", json.sensitivity_anchor],
              ["Leadership Posture", json.leadership_posture],
              ["Maturity State", json.maturity_state],
              ["Needs Stabilization", json.needs_stabilization ? "Yes" : "No"],
            ].map(([label, val]) => (
              <div key={String(label)} className={styles.artifactField}>
                <span className={styles.fieldLabel}>{String(label)}</span>
                <span className={styles.fieldValue}>{formatEnumDisplay(val)}</span>
              </div>
            ))}
          </div>
          <div className={styles.artifactField} style={{ marginTop: 12 }}>
            <span className={styles.fieldLabel}>Primary Risk Driver</span>
            <span className={styles.fieldValue}>{String(json.primary_risk_driver ?? "—")}</span>
          </div>
        </div>
      );

    case "GUARDRAILS": {
      type ZoneItem = { label: string; zone: "SAFE" | "RESTRICTED" | "HUMAN_ONLY" };
      type ZoneSection = { title: string; items: ZoneItem[] };
      const sections = Array.isArray(json.sections) ? (json.sections as ZoneSection[]) : [];
      const contextNote = json.context_note ? String(json.context_note) : null;

      const ZONE_LABEL: Record<string, string> = {
        SAFE:       "Safe",
        RESTRICTED: "Restricted",
        HUMAN_ONLY: "Human Only",
      };

      return (
        <div className={styles.artifactBody}>
          <div className={styles.artifactMeta}>
            <div className={styles.artifactField}>
              <span className={styles.fieldLabel}>Strictness</span>
              <Badge value={String(json.guardrail_strictness ?? "")} />
            </div>
          </div>

          {contextNote && (
            <div className={styles.contextNote}>{contextNote}</div>
          )}

          {sections.map((section, si) => (
            <div key={si} className={styles.zoneSection}>
              <h4 className={styles.zoneSectionTitle}>{section.title}</h4>
              <ul className={styles.zoneList}>
                {section.items.map((item, ii) => (
                  <li key={ii} className={`${styles.zoneItem} ${styles[`zone_${item.zone}`]}`}>
                    <span className={styles.zoneTag}>{ZONE_LABEL[item.zone] ?? item.zone}</span>
                    <span className={styles.zoneLabel}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    case "REVIEW_MODEL": {
      type SectionItem = { label: string; value: string | string[]; conditional?: boolean };
      type Section = { id: string; title: string; items: SectionItem[] };
      const sections = Array.isArray(json.sections) ? (json.sections as Section[]) : [];

      return (
        <div className={styles.artifactBody}>
          <div className={styles.artifactMeta}>
            <div className={styles.artifactField}>
              <span className={styles.fieldLabel}>Review Depth</span>
              <Badge value={String(json.review_depth ?? "")} />
            </div>
          </div>
          {sections.map((section) => (
            <div key={section.id} className={styles.zoneSection}>
              <h4 className={styles.zoneSectionTitle}>{section.title}</h4>
              <ul className={styles.ruleList}>
                {section.items.map((item, i) => {
                  const values = Array.isArray(item.value) ? item.value : [item.value];
                  return values.map((v, j) => (
                    <li key={`${i}-${j}`} className={styles.ruleItem}>
                      <span className={styles.ruleDot}>•</span>
                      <span>
                        <span className={styles.fieldLabel} style={{ display: "inline", marginRight: 6 }}>{item.label}:</span>
                        {String(v)}
                      </span>
                    </li>
                  ));
                })}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    case "ROLLOUT_PLAN": {
      type PhaseItem = { phase: number; name: string; entry_criteria: string; exit_criteria: string };
      type OverviewItem = { label: string; value: string; conditional?: boolean };
      type Section = {
        id: string;
        title: string;
        items?: OverviewItem[];
        phases?: PhaseItem[];
      };
      const sections = Array.isArray(json.sections) ? (json.sections as Section[]) : [];

      return (
        <div className={styles.artifactBody}>
          <div className={styles.artifactMeta}>
            <div className={styles.artifactField}>
              <span className={styles.fieldLabel}>Mode</span>
              <Badge value={String(json.rollout_mode ?? "")} />
            </div>
          </div>
          {sections.map((section) => (
            <div key={section.id} className={styles.zoneSection}>
              <h4 className={styles.zoneSectionTitle}>{section.title}</h4>
              {section.id === "phase_structure" ? (
                <div className={styles.phaseList}>
                  {(Array.isArray(section.phases) ? section.phases : []).map((p) => (
                    <div key={p.phase} className={styles.phaseItem}>
                      <div className={styles.phaseNum}>
                        {p.phase === 0 ? "S" : String(p.phase)}
                      </div>
                      <div>
                        <div className={styles.phaseName}>{p.name}</div>
                        <div className={styles.phaseDesc}>
                          <strong>Enter:</strong> {p.entry_criteria}
                        </div>
                        <div className={styles.phaseDesc}>
                          <strong>Exit:</strong> {p.exit_criteria}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className={styles.ruleList}>
                  {(Array.isArray(section.items) ? section.items : []).map((item, i) => (
                    <li key={i} className={styles.ruleItem}>
                      <span className={styles.ruleDot}>•</span>
                      <span>
                        <span className={styles.fieldLabel} style={{ display: "inline", marginRight: 6 }}>{item.label}:</span>
                        {String(item.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      );
    }

    case "POLICY": {
      type SectionItem = { label: string; value: string };
      type Section = { id: string; title: string; items: SectionItem[] };
      const sections = Array.isArray(json.sections) ? (json.sections as Section[]) : [];

      return (
        <div className={styles.artifactBody}>
          <div className={styles.artifactMeta}>
            <div className={styles.artifactField}>
              <span className={styles.fieldLabel}>Policy Tone</span>
              <Badge value={String(json.policy_tone ?? "")} />
            </div>
          </div>
          {sections.map((section) => (
            <div key={section.id} className={styles.zoneSection}>
              <h4 className={styles.zoneSectionTitle}>{section.title}</h4>
              <ul className={styles.ruleList}>
                {section.items.map((item, i) => (
                  <li key={i} className={styles.ruleItem}>
                    <span className={styles.ruleDot}>•</span>
                    <span>
                      <span className={styles.fieldLabel} style={{ display: "inline", marginRight: 6 }}>{item.label}:</span>
                      {String(item.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    }
  }
}

// ---- Reclassification Form ----

type ReclassFormState = {
  primary_goal: string;
  adoption_state: string;
  sensitivity_anchor: string;
  leadership_posture: string;
};

const FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  primary_goal: [
    { value: "CLIENT_COMMUNICATION", label: "Client Communication" },
    { value: "INTERNAL_DOCUMENTATION", label: "Internal Documentation" },
    { value: "MARKETING_CONTENT", label: "Marketing Content" },
    { value: "SALES_PROPOSALS", label: "Sales Proposals" },
    { value: "DATA_REPORTING", label: "Data Reporting" },
    { value: "OPERATIONS_ADMIN", label: "Operations & Admin" },
  ],
  adoption_state: [
    { value: "NONE", label: "None" },
    { value: "FEW_EXPERIMENTING", label: "A few experimenting" },
    { value: "MULTIPLE_REGULAR", label: "Multiple using regularly" },
    { value: "ENCOURAGED_UNSTRUCTURED", label: "Encouraged but unstructured" },
    { value: "WIDELY_USED_UNSTANDARDIZED", label: "Widely used, unstandardized" },
  ],
  sensitivity_anchor: [
    { value: "PUBLIC_CONTENT", label: "Public Content" },
    { value: "INTERNAL_BUSINESS_INFO", label: "Internal Business Info" },
    { value: "CLIENT_MATERIALS", label: "Client Materials" },
    { value: "FINANCIAL_OPERATIONAL_RECORDS", label: "Financial & Operational Records" },
    { value: "REGULATED_CONFIDENTIAL", label: "Regulated / Confidential" },
  ],
  leadership_posture: [
    { value: "MOVE_QUICKLY", label: "Move quickly" },
    { value: "BALANCED", label: "Balanced" },
    { value: "CAUTIOUS", label: "Cautious" },
  ],
};

// Human-readable labels for output diff fields
const OUTPUT_DIFF_LABELS: Record<string, string> = {
  rollout_mode:         "Rollout Mode",
  guardrail_strictness: "Guardrail Strictness",
  review_depth:         "Review Depth",
  policy_tone:          "Policy Tone",
  maturity_state:       "Maturity State",
};

function ReclassificationPanel({
  reclassifications,
  rolloutMeta,
  rolloutId,
  isArchived,
  canArchive,
  archiving,
  onArchive,
  restartHref,
  onDone,
}: {
  reclassifications: Reclassification[];
  rolloutMeta: RolloutMeta | null;
  rolloutId: string;
  isArchived: boolean;
  canArchive: boolean;
  archiving: boolean;
  onArchive: () => void;
  restartHref: string;
  onDone: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ReclassFormState>({
    primary_goal: "",
    adoption_state: "",
    sensitivity_anchor: "",
    leadership_posture: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Per-item action errors keyed by reclassification id
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  const hasAnyChange = !!(
    form.primary_goal ||
    form.adoption_state ||
    form.sensitivity_anchor ||
    form.leadership_posture
  );

  // Derive event_type from which fields were changed.
  // Precedence: SENSITIVITY > POSTURE > GOAL
  function deriveEventType(): "POSTURE" | "SENSITIVITY" | "GOAL" {
    if (form.sensitivity_anchor) return "SENSITIVITY";
    if (form.leadership_posture || form.adoption_state) return "POSTURE";
    return "GOAL";
  }

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const patch: Record<string, string> = {};
      if (form.primary_goal)       patch.primary_goal       = form.primary_goal;
      if (form.adoption_state)     patch.adoption_state     = form.adoption_state;
      if (form.sensitivity_anchor) patch.sensitivity_anchor = form.sensitivity_anchor;
      if (form.leadership_posture) patch.leadership_posture = form.leadership_posture;

      const res = await fetchDashboardApi(`/api/rollouts/${rolloutId}/reclassifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: deriveEventType(), patch }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFormError(data.message ?? data.error ?? "Failed to propose reclassification.");
        return;
      }
      setShowForm(false);
      setForm({ primary_goal: "", adoption_state: "", sensitivity_anchor: "", leadership_posture: "" });
      onDone();
    } catch {
      setFormError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAction(rid: string, action: "acknowledge" | "apply" | "cancel") {
    // Clear previous error for this item
    setActionErrors((prev) => ({ ...prev, [rid]: "" }));
    try {
      const body: Record<string, string> =
        action === "acknowledge"
          ? {
              acknowledged_by:
                rolloutMeta?.approving_authority_name ??
                rolloutMeta?.initiative_lead_name ??
                "Leadership",
            }
          : {};

      const res = await fetchDashboardApi(
        `/api/rollouts/${rolloutId}/reclassifications/${rid}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        const msg = data.error ?? data.message ?? `${action} failed.`;
        setActionErrors((prev) => ({ ...prev, [rid]: msg }));
        return;
      }
      onDone();
    } catch {
      setActionErrors((prev) => ({ ...prev, [rid]: "Network error." }));
    }
  }

  // Build a list of output fields that differ between prior and proposed
  function buildOutputDiff(r: Reclassification): { field: string; label: string; from: string; to: string }[] {
    const prior = r.prior_snapshot?.outputs;
    const proposed = r.proposed_outputs;
    if (!prior || !proposed) return [];
    return (Object.keys(OUTPUT_DIFF_LABELS) as (keyof typeof OUTPUT_DIFF_LABELS)[])
      .filter((key) => prior[key] !== undefined && proposed[key] !== undefined && prior[key] !== proposed[key])
      .map((key) => ({
        field: key,
        label: OUTPUT_DIFF_LABELS[key],
        from: formatEnumDisplay(prior[key]),
        to:   formatEnumDisplay(proposed[key]),
      }));
  }

  const proposed  = reclassifications.filter((r) => r.status === "PROPOSED");
  const history   = reclassifications.filter((r) => r.status !== "PROPOSED");

  return (
    <div className={styles.reclassPanel}>
      <div className={styles.reclassPanelHeader}>
        <h3 className={styles.sectionTitle}>Reclassifications</h3>
        {!showForm && proposed.length === 0 && !isArchived && (
          <button className={styles.btnSmall} onClick={() => setShowForm(true)}>
            + Propose
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handlePropose} className={styles.reclassForm}>
          <p className={styles.reclassFormNote}>
            Change only the fields you want to update. Leave others blank to keep current values.
          </p>
          {(["primary_goal", "adoption_state", "sensitivity_anchor", "leadership_posture"] as const).map((field) => (
            <div key={field} className={styles.reclassField}>
              <label className={styles.reclassLabel}>{formatFieldLabel(field)}</label>
              <select
                className={styles.select}
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              >
                <option value="">(no change)</option>
                {FIELD_OPTIONS[field].map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {formError && <div className={styles.errorBox}>{formError}</div>}
          <div className={styles.reclassActions}>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={!hasAnyChange || submitting}
            >
              {submitting ? "Proposing…" : "Submit Proposal"}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => { setShowForm(false); setFormError(null); }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {proposed.length > 0 && (
        <div className={styles.reclassList}>
          <p className={styles.reclassGroupLabel}>Pending</p>
          {proposed.map((r) => {
            const diff = buildOutputDiff(r);
            const impactSummary =
              r.milestone_impact_summary && r.milestone_impact_summary.length > 0
                ? r.milestone_impact_summary
                : r.milestone_impacts.map((impact) => {
                    if (impact.recommended_action === "NONE") {
                      return `${impact.milestone_code}: no immediate state change; updated configuration will be used when this stage is reached.`;
                    }

                    return `${impact.milestone_code}: ${formatEnumDisplay(impact.current_status)} -> ${formatEnumDisplay(impact.recommended_action)}. ${impact.reason}`;
                  });
            return (
              <div key={r.id} className={styles.reclassItem}>
                <div className={styles.reclassItemHeader}>
                  <Badge value={r.status} />
                  {r.is_loosening && (
                    <span className={styles.loosenBadge}>Loosening</span>
                  )}
                  {r.acknowledged_at && (
                    <Badge value="ACKNOWLEDGED" label="Acknowledged" />
                  )}
                  <span className={styles.reclassDate}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>

                {r.changed_fields.length > 0 && (
                  <p className={styles.reclassFields}>
                    Fields changed: {r.changed_fields.map((f) => formatFieldLabel(f)).join(", ")}
                  </p>
                )}

                {/* Impact diff */}
                {diff.length > 0 && (
                  <div className={styles.reclassImpact}>
                    <p className={styles.reclassImpactTitle}>Configuration changes</p>
                    {diff.map((d) => (
                      <div key={d.field} className={styles.reclassImpactRow}>
                        <span className={styles.reclassImpactField}>{d.label}:</span>
                        <span className={styles.reclassImpactArrow}> {d.from} → </span>
                        <span className={styles.reclassImpactNew}>{d.to}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.reclassImpact}>
                  <p className={styles.reclassImpactTitle}>Apply eligibility</p>
                  <div className={styles.reclassImpactRow}>
                    <span className={styles.reclassImpactField}>Status:</span>
                    <span className={styles.reclassImpactNew}>
                      {r.apply_allowed
                        ? r.requires_milestone_adjustment
                          ? "Apply allowed after acknowledgement; milestone adjustments will be applied transactionally"
                          : "Apply allowed after acknowledgement"
                        : "Apply blocked in V1"}
                    </span>
                  </div>
                </div>

                {r.milestone_impacts.length > 0 && (
                  <div className={styles.reclassImpact}>
                    <p className={styles.reclassImpactTitle}>Milestone impacts</p>
                    {impactSummary.map((impact, idx) => (
                      <div key={`${r.id}-impact-${idx}`} className={styles.reclassImpactRow}>
                        <span className={styles.reclassImpactNew}>{impact}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.reclassItemActions}>
                  {isArchived ? (
                    <span className={styles.reclassLooseningWarning}>
                      Archived rollout â€” reclassification disabled
                    </span>
                  ) : (
                    <>
                  {!r.acknowledged_at && !r.is_loosening && (
                    <button
                      className={styles.btnSmall}
                      onClick={() => void handleAction(r.id, "acknowledge")}
                    >
                      Acknowledge
                    </button>
                  )}
                  {r.acknowledged_at && !r.is_loosening && (
                    <button
                      className={styles.btnSmallPrimary}
                      onClick={() => void handleAction(r.id, "apply")}
                    >
                      Apply
                    </button>
                  )}
                  {r.is_loosening && (
                    <>
                      <span className={styles.reclassLooseningWarning}>
                        ⚠ Loosening — Archive &amp; Restart required
                      </span>
                      {isArchived ? (
                        <Link href={restartHref} className={styles.btnSmallPrimary}>
                          Restart from this rollout
                        </Link>
                      ) : canArchive ? (
                        <button
                          className={styles.btnSmallDanger}
                          onClick={() => void onArchive()}
                          disabled={archiving}
                        >
                          {archiving ? "Archiving..." : "Archive & Restart"}
                        </button>
                      ) : null}
                    </>
                  )}
                  <button
                    className={styles.btnSmallWarn}
                    onClick={() => void handleAction(r.id, "cancel")}
                  >
                    Cancel
                  </button>
                    </>
                  )}
                </div>

                {actionErrors[r.id] && (
                  <p className={styles.reclassActionError}>{actionErrors[r.id]}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <div className={styles.reclassList}>
          <p className={styles.reclassGroupLabel}>History</p>
          {history.map((r) => (
            <div key={r.id} className={`${styles.reclassItem} ${styles.reclassItemDim}`}>
              <div className={styles.reclassItemHeader}>
                <Badge value={r.status} />
                <span className={styles.reclassDate}>
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.changed_fields.length > 0 && (
                <p className={styles.reclassFields}>
                  Fields: {r.changed_fields.map((f) => formatFieldLabel(f)).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {reclassifications.length === 0 && !showForm && (
        <p className={styles.emptyNote}>No reclassifications yet.</p>
      )}
      {isArchived && (
        <p className={styles.emptyNote}>This rollout is archived. History remains visible, but new changes are disabled.</p>
      )}
    </div>
  );
}

// ---- Main Dashboard ----

type RolloutMeta = {
  id: string;
  primary_goal: string;
  adoption_state: string;
  sensitivity_anchor: string;
  leadership_posture: string;
  rollout_mode: string;
  sensitivity_tier: string;
  needs_stabilization: boolean;
  initiative_lead_name:      string | null;
  initiative_lead_title:     string | null;
  approving_authority_name:  string | null;
  approving_authority_title: string | null;
  created_at: string | null;
  status: string | null;
  archived_at: string | null;
  archive_restart_used_at: string | null;
};

type ConfirmModal = {
  milestoneId: number;
  fromStatus: MilestoneStatus;
  toStatus: MilestoneStatus;
  title: string;
  body: string;
  confirmLabel: string;
};

type RolloutDashboardClientProps = {
  rolloutId: string;
  initialMilestones: Milestone[];
  initialArtifacts: Artifact[];
  initialRolloutMeta: RolloutMeta | null;
  initialReclassifications?: Reclassification[];
};

export default function RolloutDashboardClient({
  rolloutId,
  initialMilestones,
  initialArtifacts,
  initialRolloutMeta,
  initialReclassifications = [],
}: RolloutDashboardClientProps) {
  const router = useRouter();

  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [artifacts, setArtifacts] = useState<Artifact[]>(initialArtifacts);
  const [rolloutMeta, setRolloutMeta] = useState<RolloutMeta | null>(initialRolloutMeta);
  const [reclassifications, setReclassifications] = useState<Reclassification[]>(initialReclassifications);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactType | null>(null);
  const [transitioning, setTransitioning] = useState<number | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [mRes, aRes, rRes, rcRes] = await Promise.all([
        fetchDashboardApi(`/api/rollouts/${rolloutId}/milestones`),
        fetchDashboardApi(`/api/rollouts/${rolloutId}/artifacts`),
        fetchDashboardApi(`/api/rollouts/${rolloutId}`),
        fetchDashboardApi(`/api/rollouts/${rolloutId}/reclassifications`),
      ]);
      // fetchDashboardApi already retried once on 401 with a forced session refresh.
      // A second 401 here means the session is genuinely gone — send to login.
      if (
        mRes.status === 401 ||
        aRes.status === 401 ||
        rRes.status === 401 ||
        rcRes.status === 401
      ) {
        window.location.assign(`/auth/continue?next=${encodeURIComponent(`/rollouts/${rolloutId}`)}`);
        return;
      }
      const readApiError = async (res: Response): Promise<string> => {
        try {
          const body = await res.json();
          const detail = typeof body?.details === "string"
            ? body.details
            : typeof body?.message === "string"
              ? body.message
              : typeof body?.error === "string"
                ? body.error
                : null;
          return detail ?? `HTTP ${res.status}`;
        } catch {
          return `HTTP ${res.status}`;
        }
      };
      if (mRes.status === 404 || aRes.status === 404) {
        setLoadError("not-found");
        return;
      }
      if (!mRes.ok || !aRes.ok) {
        if (!mRes.ok) {
          const detail = await readApiError(mRes);
          setLoadError(`Failed to load milestones (${detail}).`);
          return;
        }
        const detail = await readApiError(aRes);
        setLoadError(`Failed to load artifacts (${detail}).`);
        return;
      }
      const [mData, aData] = await Promise.all([mRes.json(), aRes.json()]);
      if (mData.ok) setMilestones(mData.milestones);
      if (aData.ok) setArtifacts(aData.artifacts);
      // Rollout meta is best-effort (graceful fallback if absent)
      if (rRes.ok) {
        const rData = await rRes.json();
        if (rData.ok && rData.rollout) setRolloutMeta(rData.rollout as RolloutMeta);
      }
      // Reclassifications — best-effort
      if (rcRes.ok) {
        const rcData = await rcRes.json();
        if (rcData.ok && Array.isArray(rcData.reclassifications)) {
          setReclassifications(rcData.reclassifications as Reclassification[]);
        }
      }
    } catch {
      setLoadError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [rolloutId]);

  const isArchived = rolloutMeta?.status === "ARCHIVED";
  const m3Status = milestones.find((m) => m.code === "M3")?.status ?? null;
  const canArchive =
    !isArchived &&
    !!rolloutMeta &&
    !rolloutMeta.archive_restart_used_at &&
    m3Status !== "ACTIVATED";

  const restartHref = rolloutMeta
    ? `/generate?primary_goal=${encodeURIComponent(rolloutMeta.primary_goal)}&adoption_state=${encodeURIComponent(rolloutMeta.adoption_state)}&sensitivity_anchor=${encodeURIComponent(rolloutMeta.sensitivity_anchor)}&leadership_posture=${encodeURIComponent(rolloutMeta.leadership_posture)}&initiative_lead_name=${encodeURIComponent(rolloutMeta.initiative_lead_name ?? "")}&initiative_lead_title=${encodeURIComponent(rolloutMeta.initiative_lead_title ?? "")}&approving_authority_name=${encodeURIComponent(rolloutMeta.approving_authority_name ?? "")}&approving_authority_title=${encodeURIComponent(rolloutMeta.approving_authority_title ?? "")}`
    : "/generate";

  async function handleArchive() {
    if (!canArchive) return;
    const confirmed = window.confirm(
      "Archive this rollout and use your one included restart? This rollout will become read-only history."
    );
    if (!confirmed) return;

    setArchiveError(null);
    setArchiving(true);
    try {
      const res = await fetchDashboardApi(`/api/rollouts/${rolloutId}/archive`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setArchiveError(data.error ?? data.message ?? "Archive failed.");
        return;
      }
      await loadData();
    } catch {
      setArchiveError("Network error.");
    } finally {
      setArchiving(false);
    }
  }

  // On first mount, backfill any artifacts missing for completed milestones.
  // Covers rollouts that progressed before on-unlock generation was introduced.
  useEffect(() => {
    async function initLoad() {
      const needsBootstrap =
        !rolloutMeta ||
        milestones.length === 0 ||
        artifacts.length === 0;

      if (needsBootstrap) {
        setLoading(true);
        await ensureServerSession({ attempts: 2, pauseMs: 150 }).catch(() => null);
        await loadData();
        return;
      }

      try {
        const rcRes = await fetchDashboardApi(`/api/rollouts/${rolloutId}/reclassifications`);
        if (rcRes.ok) {
          const rcData = await rcRes.json();
          if (rcData.ok && Array.isArray(rcData.reclassifications)) {
            setReclassifications(rcData.reclassifications as Reclassification[]);
          }
        }
      } catch {
        // Non-fatal. The dashboard can render without reclassification history.
      }

      if (isArchived) return;
      // Fire-and-forget: if the regenerate endpoint finds nothing missing it's a no-op.
      try {
        const res = await fetchDashboardApi(`/api/rollouts/${rolloutId}/artifacts/regenerate`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.generated?.length > 0) await loadData();
        }
      } catch {
        // Non-fatal — existing artifacts still render correctly.
      }
    }
    void initLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolloutId, isArchived, rolloutMeta, milestones.length, artifacts.length]);

  function handleTransitionClick(milestoneId: number, fromStatus: MilestoneStatus, toStatus: MilestoneStatus) {
    const modal = TRANSITION_MODAL[fromStatus];
    if (modal) {
      setConfirmModal({ milestoneId, fromStatus, toStatus, title: modal.title, body: modal.body, confirmLabel: modal.confirm });
    } else {
      void handleConfirmedTransition(milestoneId, fromStatus, toStatus);
    }
  }

  async function postTransition(milestoneId: number, toStatus: MilestoneStatus): Promise<boolean> {
    const res = await fetchDashboardApi(
      `/api/rollouts/${rolloutId}/milestones/${milestoneId}/transition`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_status: toStatus }),
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setTransitionError(data.reason ?? data.error ?? "Transition failed.");
      return false;
    }
    return true;
  }

  async function handleConfirmedTransition(milestoneId: number, fromStatus: MilestoneStatus, toStatus: MilestoneStatus) {
    setConfirmModal(null);
    setTransitionError(null);
    setTransitioning(milestoneId);
    try {
      // When moving from IN_PROGRESS to CONFIRMED, the guard enforces one step
      // at a time — fire two sequential calls: IN_PROGRESS → AWAITING_CONFIRMATION,
      // then AWAITING_CONFIRMATION → CONFIRMED (which triggers document generation).
      // The guard treats same-status transitions as NOOP (allowed), so if step1 already
      // succeeded in a previous attempt, the retry is safe.
      if (fromStatus === "IN_PROGRESS" && toStatus === "CONFIRMED") {
        const step1 = await postTransition(milestoneId, "AWAITING_CONFIRMATION");
        if (step1) {
          await postTransition(milestoneId, "CONFIRMED");
        }
      } else {
        await postTransition(milestoneId, toStatus);
      }
      await loadData();
    } catch {
      setTransitionError("Network error.");
    } finally {
      setTransitioning(null);
    }

    // After any transition attempt — success or failure — run the backfill endpoint.
    // This ensures artifacts are generated for any milestone that is now IN_PROGRESS /
    // CONFIRMED / ACTIVATED but whose documents were never created (e.g. because an
    // earlier RPC commit succeeded while the HTTP response to the client was lost).
    // The endpoint is idempotent: it skips artifact types that already exist.
    try {
      const bfRes = await fetchDashboardApi(`/api/rollouts/${rolloutId}/artifacts/regenerate`, { method: "POST" });
      if (bfRes.ok) {
        const bfData = await bfRes.json();
        if (Array.isArray(bfData.generated) && bfData.generated.length > 0) {
          await loadData();
        }
      }
    } catch {
      // Non-fatal — existing artifacts still render correctly.
    }
  }

  const activeArtifact = selectedArtifact
    ? artifacts.find((a) => a.artifact_type === selectedArtifact) ?? null
    : null;

  // Only count artifacts whose milestone has been legitimately reached.
  const generatedArtifacts = artifacts.filter((a) => {
    if (!a.generated) return false;
    const ownerCode = (Object.entries(MILESTONE_ARTIFACTS) as [MilestoneCode, ArtifactType[]][])
      .find(([, types]) => types.includes(a.artifact_type as ArtifactType))?.[0];
    const ownerMilestone = ownerCode ? milestones.find((m) => m.code === ownerCode) : null;
    return ownerMilestone ? ownerMilestone.status !== "LOCKED" : false;
  });

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <p>Loading rollout…</p>
      </div>
    );
  }

  if (loadError) {
    const isNotFound = loadError === "not-found";
    return (
      <div className={styles.errorWrap}>
        <div className={styles.errorCard}>
          <div className={styles.errorCardIcon}>{isNotFound ? "404" : "!"}</div>
          <h2 className={styles.errorCardTitle}>
            {isNotFound ? "Rollout not found" : "Failed to load"}
          </h2>
          <p className={styles.errorCardMessage}>
            {isNotFound
              ? "This rollout does not exist or the link may be incorrect."
              : loadError}
          </p>
          <div className={styles.errorCardActions}>
            {!isNotFound && (
              <button className={styles.errorCardBtn} onClick={() => { setLoadError(null); setLoading(true); void loadData(); }}>
                Try again
              </button>
            )}
            <Link href="/" className={styles.errorCardLink}>Go home</Link>
          </div>
        </div>
      </div>
    );
  }

  // Derive artifact milestone status for drawer header
  function artifactMilestoneStatus(at: ArtifactType): MilestoneStatus | null {
    const code = (Object.entries(MILESTONE_ARTIFACTS) as [MilestoneCode, ArtifactType[]][])
      .find(([, types]) => types.includes(at))?.[0];
    if (!code) return null;
    return milestones.find((m) => m.code === code)?.status ?? null;
  }

  // Deterministic banner for an artifact type (spec J)
  function artifactBanner(at: ArtifactType): { label: string; text: string } | null {
    if (!rolloutMeta) return null;
    if (at === "ROLLOUT_PLAN" && rolloutMeta.needs_stabilization) {
      return { label: "Stabilization required", text: "Expansion is paused until review cadence and error thresholds stabilize." };
    }
    if (at === "ROLLOUT_PLAN" && rolloutMeta.rollout_mode === "SPLIT_DEPLOYMENT") {
      return { label: "Split deployment", text: "High-risk and low-risk tracks operate under different controls." };
    }
    if (at === "POLICY" && rolloutMeta.sensitivity_tier === "REGULATED") {
      return { label: "Regulated controls", text: "Approved tools and documented oversight are required." };
    }
    return null;
  }

  const STATUS_DISPLAY: Record<MilestoneStatus, string> = {
    LOCKED: "Not started",
    IN_PROGRESS: "In Progress",
    AWAITING_CONFIRMATION: "Draft complete",
    CONFIRMED: "Review complete",
    ACTIVATED: "Active",
    PAUSED: "Paused",
    INVALIDATED: "Invalidated",
  };

  return (
    <div className={styles.dashWrap}>
      {/* Confirmation modal */}
      {confirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>{confirmModal.title}</h3>
            <p className={styles.modalBody}>{confirmModal.body}</p>
            <div className={styles.modalActions}>
              <button
                className={styles.btnPrimary}
                onClick={() => void handleConfirmedTransition(confirmModal.milestoneId, confirmModal.fromStatus, confirmModal.toStatus)}
              >
                {confirmModal.confirmLabel}
              </button>
              <button
                className={styles.btnSecondary}
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header — AI Governance Framework (spec D) */}
      <div className={styles.dashHeader}>
        <div>
          {/* Section label — spec D */}
          <p className={styles.dashTitle}>Governance Checkpoints</p>

          {/* Primary headline */}
          <h1 className={styles.dashFrameworkTitle}>
            {rolloutMeta?.initiative_lead_name
              ? `AI Governance Framework for ${rolloutMeta.initiative_lead_name}`
              : "AI Governance Framework"}
          </h1>

          {/* Mode + tier context badges — null-guarded */}
          {rolloutMeta && (
            <div className={styles.dashBadgeRow}>
              <Badge value={rolloutMeta.rollout_mode} />
              <Badge value={rolloutMeta.sensitivity_tier} />
              {rolloutMeta.needs_stabilization && (
                <Badge value="STABILIZATION" label="Stabilization required" />
              )}
            </div>
          )}

          {/* Spec D statement — kept verbatim */}
          <p className={styles.dashSubheader}>
            Each checkpoint records a documented governance position. Actions record completion; they do not route requests or enforce compliance.
          </p>

          {isArchived && (
            <p className={styles.dashSubheader}>
              This rollout is archived. Documents remain available as historical records, but milestones and reclassifications are read-only.
            </p>
          )}

          {/* Reference ID — demoted, labeled */}
          <p className={styles.dashRefId}>
            <span className={styles.dashRefLabel}>Reference ID</span>
            <code>{rolloutId}</code>
          </p>
        </div>

        {/* Archive / Restart — top-right corner, low prominence */}
        {rolloutMeta && (isArchived || canArchive) && (
          <div className={styles.archiveCorner}>
              <button
              type="button"
              className={styles.archiveTrigger}
              onClick={() => router.push(`/rollouts/${rolloutId}/packet`)}
            >
              Open print packet
            </button>
            {isArchived ? (
              <Link href={restartHref} className={styles.archiveTrigger}>
                Restart from this rollout
              </Link>
            ) : (
              <button
                className={styles.archiveTrigger}
                onClick={() => void handleArchive()}
                disabled={archiving}
              >
                {archiving ? "Archiving..." : "Archive this rollout"}
              </button>
            )}
            <p className={styles.archiveHint}>
              {isArchived
                ? "Pre-fills your intake and identity details."
                : "One restart included. Read-only after archive."}
            </p>
            {archiveError && <div className={styles.errorBox}>{archiveError}</div>}
          </div>
        )}
        {rolloutMeta && !(isArchived || canArchive) && (
          <div className={styles.archiveCorner}>
            <button
              type="button"
              className={styles.archiveTrigger}
              onClick={() => router.push(`/rollouts/${rolloutId}/packet`)}
            >
              Open print packet
            </button>
          </div>
        )}
      </div>

      <div className={styles.dashBody}>
        {/* Left column: milestones + reclassifications */}
        <div className={styles.leftCol}>
          {/* Pending reclassification banner */}
          {!isArchived && reclassifications.some((r) => r.status === "PROPOSED") && (
            <div className={styles.reclassBanner}>
              <span className={styles.reclassBannerIcon}>⚠</span>
              <span>
                A configuration change is pending review. Apply or cancel it before advancing milestones.
              </span>
            </div>
          )}

          {/* Milestone tracker */}
          <div className={styles.card}>
            <div className={styles.milestoneTrack}>
              {milestones.map((m, idx) => {
                const nextStatus = STATUS_TRANSITIONS[m.status];
                const btnLabel = nextStatus ? TRANSITION_BUTTON_LABEL[m.status] : null;
                const helperText = nextStatus ? TRANSITION_HELPER_TEXT[m.status] : null;
                const statusDesc = MILESTONE_STATUS_DESCRIPTIONS[m.status];
                const isTransitioning = transitioning === m.milestone_id;

                return (
                  <div
                    key={m.milestone_id}
                    className={`${styles.milestoneItem} ${
                      m.status === "LOCKED" ? styles.milestoneLocked : ""
                    } ${
                      m.status === "ACTIVATED" || m.status === "CONFIRMED"
                        ? styles.milestoneDone
                        : ""
                    }`}
                  >
                    {/* Connector line */}
                    {idx < milestones.length - 1 && (
                      <div
                        className={`${styles.connector} ${
                          m.status === "ACTIVATED" ? styles.connectorDone : ""
                        }`}
                      />
                    )}

                    <div className={styles.milestoneLeft}>
                      <div
                        className={`${styles.milestoneDot} ${styles[`dot_${m.status}`]}`}
                      >
                        {m.status === "CONFIRMED" || m.status === "ACTIVATED" ? "✓" : idx + 1}
                      </div>
                    </div>

                    <div className={styles.milestoneContent}>
                      <div className={styles.milestoneTop}>
                        <span className={styles.milestoneName}>
                          {MILESTONE_LABELS[m.code]}
                        </span>
                        <Badge value={m.status} label={STATUS_LABELS[m.status]} />
                      </div>

                      <p className={styles.milestoneDesc}>
                        {MILESTONE_DESCRIPTIONS[m.code]}
                      </p>

                      {/* Status-level description (spec C) */}
                      {statusDesc && (
                        <div className={styles.milestoneStatusDesc}>
                          <span className={styles.milestoneStatusDescTitle}>{statusDesc.title}</span>
                          <span> — </span>
                          {statusDesc.description}
                        </div>
                      )}

                      {/* Artifact pills */}
                      <div className={styles.milestoneArtifacts}>
                        {MILESTONE_ARTIFACTS[m.code].map((at) => {
                          const art = artifacts.find((a) => a.artifact_type === at);
                          // Accessible when this milestone has been reached (not LOCKED).
                          // The artifact row may exist from backfill but should stay locked
                          // if the user hasn't legitimately reached this stage yet.
                          const milestoneReached = m.status !== "LOCKED";
                          const accessible = milestoneReached && !!art?.generated;
                          const banner = accessible ? artifactBanner(at) : null;
                          return (
                            <div key={at} className={styles.artifactPillWrap}>
                              <button
                                className={`${styles.artifactPill} ${
                                  accessible ? styles.artifactPillReady : styles.artifactPillLocked
                                } ${selectedArtifact === at ? styles.artifactPillActive : ""}`}
                                onClick={() => {
                                  if (accessible) {
                                    setSelectedArtifact(at === selectedArtifact ? null : at);
                                  }
                                }}
                                disabled={!accessible}
                                title={accessible ? `View ${ARTIFACT_LABELS[at]}` : `Available once the previous stage is complete`}
                              >
                                {accessible ? "↗ " : "⊘ "}{ARTIFACT_LABELS[at]}
                              </button>
                              {banner && (
                                <span className={styles.artifactBannerBadge} title={banner.text}>
                                  {banner.label}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Transition button + helper text (spec A) */}
                      {btnLabel && !isArchived && (
                        <div className={styles.transitionArea}>
                          <button
                            className={styles.transitionBtn}
                            disabled={isTransitioning}
                            onClick={() => handleTransitionClick(m.milestone_id, m.status, nextStatus!)}
                          >
                            {isTransitioning ? "Recording…" : btnLabel}
                          </button>
                          {helperText && (
                            <p className={styles.transitionHelper}>{helperText}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {transitionError && (
              <div className={styles.errorBox}>{transitionError}</div>
            )}
          </div>

          {/* Reclassification */}
          <ReclassificationPanel
            reclassifications={reclassifications}
            rolloutMeta={rolloutMeta}
            rolloutId={rolloutId}
            isArchived={!!isArchived}
            canArchive={canArchive}
            archiving={archiving}
            onArchive={handleArchive}
            restartHref={restartHref}
            onDone={loadData}
          />
        </div>

        {/* Right column: artifact viewer */}
        <div className={styles.rightCol}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Governance documents</h2>
            <p className={styles.cardSubtitle}>
              Each document is generated when you complete its checkpoint. Click any document to view it.
            </p>

            {generatedArtifacts.length === 0 ? (
              <div className={styles.artifactEmpty}>
                <p className={styles.artifactEmptyTitle}>No documents yet.</p>
                <p className={styles.artifactEmptyHint}>
                  Complete the first checkpoint to generate your Governance Profile and Usage Guardrails.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.artifactTabs}>
                  {(["PROFILE", "GUARDRAILS", "REVIEW_MODEL", "ROLLOUT_PLAN", "POLICY"] as ArtifactType[]).map(
                    (at) => {
                      const art = artifacts.find((a) => a.artifact_type === at);
                      // Find which milestone owns this artifact type
                      const ownerCode = (Object.entries(MILESTONE_ARTIFACTS) as [MilestoneCode, ArtifactType[]][])
                        .find(([, types]) => types.includes(at))?.[0];
                      const ownerMilestone = ownerCode ? milestones.find((m) => m.code === ownerCode) : null;
                      const milestoneReached = ownerMilestone ? ownerMilestone.status !== "LOCKED" : false;
                      if (!art?.generated || !milestoneReached) return null;
                      return (
                        <button
                          key={at}
                          className={`${styles.artifactTab} ${
                            selectedArtifact === at ? styles.artifactTabActive : ""
                          }`}
                          onClick={() => setSelectedArtifact(at)}
                        >
                          {ARTIFACT_LABELS[at]}
                        </button>
                      );
                    }
                  )}
                </div>

                {activeArtifact ? (
                  <div className={styles.artifactViewer}>
                    {/* Artifact drawer header (spec F) */}
                    <div className={styles.artifactViewerHeader}>
                      <div>
                        <h3 className={styles.artifactViewerTitle}>
                          {ARTIFACT_LABELS[activeArtifact.artifact_type]}
                        </h3>
                        {activeArtifact.version && (
                          <span className={styles.artifactVersion}>
                            v{activeArtifact.version}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Artifact metadata block (spec F) */}
                    <div className={styles.artifactMetaBlock}>
                      <div className={styles.artifactMetaRow}>
                        <span className={styles.artifactMetaLabel}>Rollout ID</span>
                        <span className={styles.artifactMetaValue}>
                          <code>{rolloutId.slice(0, 8)}…</code>
                        </span>
                      </div>
                      {activeArtifact.created_at && (
                        <div className={styles.artifactMetaRow}>
                          <span className={styles.artifactMetaLabel}>Effective as of</span>
                          <span className={styles.artifactMetaValue}>
                            {new Date(activeArtifact.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                        </div>
                      )}
                      <div className={styles.artifactMetaRow}>
                        <span className={styles.artifactMetaLabel}>Prepared by</span>
                        <span className={styles.artifactMetaValue}>
                          {rolloutMeta?.initiative_lead_name && rolloutMeta.initiative_lead_title
                            ? `${rolloutMeta.initiative_lead_name}, ${rolloutMeta.initiative_lead_title}`
                            : "Initiative Lead"}
                        </span>
                      </div>
                      {(rolloutMeta?.approving_authority_name && rolloutMeta.approving_authority_title) && (
                        <div className={styles.artifactMetaRow}>
                          <span className={styles.artifactMetaLabel}>Approved by</span>
                          <span className={styles.artifactMetaValue}>
                            {`${rolloutMeta.approving_authority_name}, ${rolloutMeta.approving_authority_title}`}
                          </span>
                        </div>
                      )}
                      {(() => {
                        const st = artifactMilestoneStatus(activeArtifact.artifact_type);
                        return st ? (
                          <div className={styles.artifactMetaRow}>
                            <span className={styles.artifactMetaLabel}>Status</span>
                            <span className={styles.artifactMetaValue}>{STATUS_DISPLAY[st]}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>

                    {/* Description */}
                    <p className={styles.artifactDescription}>
                      {ARTIFACT_DESCRIPTIONS[activeArtifact.artifact_type]}
                    </p>

                    {/* Deterministic banner (spec J) */}
                    {(() => {
                      const banner = artifactBanner(activeArtifact.artifact_type);
                      return banner ? (
                        <div className={styles.artifactBanner}>
                          <span className={styles.artifactBannerLabel}>{banner.label}</span>
                          <span className={styles.artifactBannerText}>{banner.text}</span>
                        </div>
                      ) : null;
                    })()}

                    {renderArtifactContent(activeArtifact)}

                    {/* Footer line (spec F) */}
                    <p className={styles.artifactFooter}>
                      This document records the current governance stance. It does not create legal obligations beyond existing firm duties.
                    </p>
                  </div>
                ) : (
                  <div className={styles.artifactSelectHint}>
                    Select a document above to view its contents.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

