"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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
  status: "PROPOSED" | "APPLIED" | "CANCELLED";
  proposed_at: string;
  changed_fields: string[];
  is_loosening: boolean;
  acknowledged_at: string | null;
};

// ---- Constants ----

const MILESTONE_LABELS: Record<MilestoneCode, string> = {
  M1: "Profile & Guardrails",
  M2: "Review Setup",
  M3: "Rollout Plan",
  M4: "Governance Policy",
};

// What this milestone stage produces — shown below the title
const MILESTONE_DESCRIPTIONS: Record<MilestoneCode, string> = {
  M1: "Defines what this rollout is, what data is involved, and what rules are in place before anyone starts using AI.",
  M2: "Establishes who reviews AI outputs, how often, and what gets escalated — before the rollout goes wider.",
  M3: "Sets the pacing and phasing for how AI access expands across the team or organization.",
  M4: "Creates the governance policy: what's allowed, what isn't, and what happens when something goes wrong.",
};

// What "submit" means at each stage — the specific ask
const MILESTONE_SUBMIT_CONTEXT: Partial<Record<MilestoneStatus, string>> = {
  IN_PROGRESS: "When you're ready, submit this for leadership review. Nothing changes until it's confirmed.",
  AWAITING_CONFIRMATION: "Review the generated documents on the right, then confirm to lock them in and generate the next stage.",
};

const MILESTONE_ARTIFACTS: Record<MilestoneCode, ArtifactType[]> = {
  M1: ["PROFILE", "GUARDRAILS"],
  M2: ["REVIEW_MODEL"],
  M3: ["ROLLOUT_PLAN"],
  M4: ["POLICY"],
};

const STATUS_TRANSITIONS: Record<MilestoneStatus, MilestoneStatus | null> = {
  LOCKED: null,
  IN_PROGRESS: "AWAITING_CONFIRMATION",
  AWAITING_CONFIRMATION: "CONFIRMED",
  CONFIRMED: "ACTIVATED",
  ACTIVATED: null,
  PAUSED: null,
  INVALIDATED: null,
};

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  LOCKED: "Not started",
  IN_PROGRESS: "In progress",
  AWAITING_CONFIRMATION: "Pending review",
  CONFIRMED: "Approved",
  ACTIVATED: "Live",
  PAUSED: "Paused",
  INVALIDATED: "Voided",
};

const TRANSITION_CTA: Partial<Record<MilestoneStatus, string>> = {
  IN_PROGRESS: "Submit for review →",
  AWAITING_CONFIRMATION: "Approve & generate documents →",
  CONFIRMED: "Mark as live →",
};

const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  PROFILE: "Org Profile",
  GUARDRAILS: "Usage Rules",
  REVIEW_MODEL: "Review Process",
  ROLLOUT_PLAN: "Rollout Plan",
  POLICY: "Governance Policy",
};

const ARTIFACT_DESCRIPTIONS: Record<ArtifactType, string> = {
  PROFILE: "A snapshot of your organization's AI context — goals, sensitivity level, adoption state, and risk classification.",
  GUARDRAILS: "The specific rules governing how AI can be used in this rollout — what requires review, what's prohibited, and what must be logged.",
  REVIEW_MODEL: "Who reviews AI outputs, how often, and what the escalation path looks like when something needs attention.",
  ROLLOUT_PLAN: "The phased plan for expanding AI access — how fast, in what order, and with what checkpoints along the way.",
  POLICY: "The formal governance policy for this rollout — behavioral expectations, approved use cases, and what happens if something goes wrong.",
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
};

function Badge({ value, label }: { value: string; label?: string }) {
  const color = BADGE_COLORS[value] ?? "info";
  return (
    <span className={`${styles.badge} ${styles[`badge_${color}`]}`}>
      {label ?? value.replace(/_/g, " ")}
    </span>
  );
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
                <span className={styles.fieldValue}>{String(val ?? "—").replace(/_/g, " ")}</span>
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
      type Section = { id: string; title: string; items: (PhaseItem | OverviewItem)[] };
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
                  {(section.items as PhaseItem[]).map((p) => (
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
                  {(section.items as OverviewItem[]).map((item, i) => (
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
  justification: string;
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

function ReclassificationPanel({
  rolloutId,
  onDone,
}: {
  rolloutId: string;
  onDone: () => void;
}) {
  const [reclass, setReclass] = useState<Reclassification[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ReclassFormState>({
    primary_goal: "",
    adoption_state: "",
    sensitivity_anchor: "",
    leadership_posture: "",
    justification: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReclass = useCallback(async () => {
    try {
      const res = await fetch(`/api/rollouts/${rolloutId}/reclassifications`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.reclassifications)) {
          setReclass(data.reclassifications);
        }
      }
    } catch {
      /* silent */
    }
  }, [rolloutId]);

  useEffect(() => {
    void loadReclass();
  }, [loadReclass]);

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, string> = { justification: form.justification };
      if (form.primary_goal) body.primary_goal = form.primary_goal;
      if (form.adoption_state) body.adoption_state = form.adoption_state;
      if (form.sensitivity_anchor) body.sensitivity_anchor = form.sensitivity_anchor;
      if (form.leadership_posture) body.leadership_posture = form.leadership_posture;

      const res = await fetch(`/api/rollouts/${rolloutId}/reclassifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? data.error ?? "Failed to propose reclassification.");
        return;
      }
      setShowForm(false);
      setForm({ primary_goal: "", adoption_state: "", sensitivity_anchor: "", leadership_posture: "", justification: "" });
      await loadReclass();
      onDone();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAction(rid: string, action: "acknowledge" | "apply" | "cancel") {
    try {
      await fetch(`/api/rollouts/${rolloutId}/reclassifications/${rid}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await loadReclass();
      onDone();
    } catch {
      /* silent */
    }
  }

  const proposed = reclass.filter((r) => r.status === "PROPOSED");
  const history = reclass.filter((r) => r.status !== "PROPOSED");

  return (
    <div className={styles.reclassPanel}>
      <div className={styles.reclassPanelHeader}>
        <h3 className={styles.sectionTitle}>Reclassifications</h3>
        {!showForm && (
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
              <label className={styles.reclassLabel}>{field.replace(/_/g, " ")}</label>
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
          <div className={styles.reclassField}>
            <label className={styles.reclassLabel}>Justification *</label>
            <textarea
              className={styles.textarea}
              rows={3}
              required
              value={form.justification}
              onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
              placeholder="Explain why this reclassification is needed…"
            />
          </div>
          {error && <div className={styles.errorBox}>{error}</div>}
          <div className={styles.reclassActions}>
            <button type="submit" className={styles.btnPrimary} disabled={!form.justification || submitting}>
              {submitting ? "Proposing…" : "Submit Proposal"}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => { setShowForm(false); setError(null); }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {proposed.length > 0 && (
        <div className={styles.reclassList}>
          <p className={styles.reclassGroupLabel}>Pending</p>
          {proposed.map((r) => (
            <div key={r.id} className={styles.reclassItem}>
              <div className={styles.reclassItemHeader}>
                <Badge value={r.status} />
                {r.is_loosening && (
                  <span className={styles.loosenBadge}>Loosening</span>
                )}
                <span className={styles.reclassDate}>
                  {new Date(r.proposed_at).toLocaleDateString()}
                </span>
              </div>
              {r.changed_fields.length > 0 && (
                <p className={styles.reclassFields}>
                  Fields: {r.changed_fields.join(", ").replace(/_/g, " ")}
                </p>
              )}
              <div className={styles.reclassItemActions}>
                {!r.acknowledged_at && (
                  <button
                    className={styles.btnSmall}
                    onClick={() => handleAction(r.id, "acknowledge")}
                  >
                    Acknowledge
                  </button>
                )}
                {r.acknowledged_at && (
                  <button
                    className={styles.btnSmallPrimary}
                    onClick={() => handleAction(r.id, "apply")}
                  >
                    Apply
                  </button>
                )}
                <button
                  className={styles.btnSmallDanger}
                  onClick={() => handleAction(r.id, "cancel")}
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
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
                  {new Date(r.proposed_at).toLocaleDateString()}
                </span>
              </div>
              {r.changed_fields.length > 0 && (
                <p className={styles.reclassFields}>
                  Fields: {r.changed_fields.join(", ").replace(/_/g, " ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {reclass.length === 0 && !showForm && (
        <p className={styles.emptyNote}>No reclassifications yet.</p>
      )}
    </div>
  );
}

// ---- Main Dashboard ----

export default function RolloutDashboard() {
  const params = useParams();
  const rolloutId = params.rolloutId as string;

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactType | null>(null);
  const [transitioning, setTransitioning] = useState<number | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [mRes, aRes] = await Promise.all([
        fetch(`/api/rollouts/${rolloutId}/milestones`),
        fetch(`/api/rollouts/${rolloutId}/artifacts`),
      ]);
      if (!mRes.ok || !aRes.ok) {
        setLoadError("Failed to load rollout data.");
        return;
      }
      const [mData, aData] = await Promise.all([mRes.json(), aRes.json()]);
      if (mData.ok) setMilestones(mData.milestones);
      if (aData.ok) setArtifacts(aData.artifacts);
    } catch {
      setLoadError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [rolloutId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleTransition(milestoneId: number, toStatus: MilestoneStatus) {
    setTransitionError(null);
    setTransitioning(milestoneId);
    try {
      const res = await fetch(
        `/api/rollouts/${rolloutId}/milestones/${milestoneId}/transition`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to_status: toStatus }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setTransitionError(data.reason ?? data.error ?? "Transition failed.");
        return;
      }
      await loadData();
    } catch {
      setTransitionError("Network error.");
    } finally {
      setTransitioning(null);
    }
  }

  const activeArtifact = selectedArtifact
    ? artifacts.find((a) => a.artifact_type === selectedArtifact) ?? null
    : null;

  const generatedArtifacts = artifacts.filter((a) => a.generated);

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <p>Loading rollout…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.errorWrap}>
        <p className={styles.errorText}>{loadError}</p>
      </div>
    );
  }

  return (
    <div className={styles.dashWrap}>
      {/* Header */}
      <div className={styles.dashHeader}>
        <div>
          <h1 className={styles.dashTitle}>Rollout Dashboard</h1>
          <p className={styles.dashId}>
            <code>{rolloutId}</code>
          </p>
        </div>
      </div>

      <div className={styles.dashBody}>
        {/* Left column: milestones + reclassifications */}
        <div className={styles.leftCol}>
          {/* Milestone tracker */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Milestones</h2>
            <div className={styles.milestoneTrack}>
              {milestones.map((m, idx) => {
                const nextStatus = STATUS_TRANSITIONS[m.status];
                const cta = nextStatus ? TRANSITION_CTA[m.status] : null;
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
                        {m.status === "CONFIRMED" || m.status === "ACTIVATED" ? "✓" : m.code}
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

                      <div className={styles.milestoneArtifacts}>
                        {MILESTONE_ARTIFACTS[m.code].map((at) => {
                          const art = artifacts.find((a) => a.artifact_type === at);
                          return (
                            <button
                              key={at}
                              className={`${styles.artifactPill} ${
                                art?.generated ? styles.artifactPillReady : styles.artifactPillLocked
                              } ${selectedArtifact === at ? styles.artifactPillActive : ""}`}
                              onClick={() => {
                                if (art?.generated) {
                                  setSelectedArtifact(at === selectedArtifact ? null : at);
                                }
                              }}
                              disabled={!art?.generated}
                              title={art?.generated ? `View ${ARTIFACT_LABELS[at]}` : `Generated when this stage is approved`}
                            >
                              {art?.generated ? "↗ " : "⊘ "}{ARTIFACT_LABELS[at]}
                            </button>
                          );
                        })}
                      </div>

                      {MILESTONE_SUBMIT_CONTEXT[m.status] && (
                        <p className={styles.milestoneSubmitNote}>
                          {MILESTONE_SUBMIT_CONTEXT[m.status]}
                        </p>
                      )}

                      {cta && (
                        <button
                          className={styles.transitionBtn}
                          disabled={isTransitioning}
                          onClick={() => handleTransition(m.milestone_id, nextStatus!)}
                        >
                          {isTransitioning ? "Processing…" : cta}
                        </button>
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
          <ReclassificationPanel rolloutId={rolloutId} onDone={loadData} />
        </div>

        {/* Right column: artifact viewer */}
        <div className={styles.rightCol}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Generated Documents</h2>
            <p className={styles.cardSubtitle}>
              Documents are generated automatically when each stage is approved. Click a document to view it.
            </p>

            {generatedArtifacts.length === 0 ? (
              <div className={styles.artifactEmpty}>
                <p className={styles.artifactEmptyTitle}>No documents generated yet.</p>
                <p className={styles.artifactEmptyHint}>
                  Approve the first stage — Profile &amp; Guardrails — to generate your first two documents.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.artifactTabs}>
                  {(["PROFILE", "GUARDRAILS", "REVIEW_MODEL", "ROLLOUT_PLAN", "POLICY"] as ArtifactType[]).map(
                    (at) => {
                      const art = artifacts.find((a) => a.artifact_type === at);
                      if (!art?.generated) return null;
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
                    <div className={styles.artifactViewerHeader}>
                      <h3 className={styles.artifactViewerTitle}>
                        {ARTIFACT_LABELS[activeArtifact.artifact_type]}
                      </h3>
                      {activeArtifact.version && (
                        <span className={styles.artifactVersion}>
                          v{activeArtifact.version}
                        </span>
                      )}
                    </div>
                    <p className={styles.artifactDescription}>
                      {ARTIFACT_DESCRIPTIONS[activeArtifact.artifact_type]}
                    </p>
                    {renderArtifactContent(activeArtifact)}
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
