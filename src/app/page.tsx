"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const PRIMARY_GOAL_OPTIONS = [
  { value: "CLIENT_COMMUNICATION", label: "Client Communication", desc: "Emails, messages, and correspondence with clients" },
  { value: "INTERNAL_DOCUMENTATION", label: "Internal Documentation", desc: "SOPs, wikis, and internal knowledge bases" },
  { value: "MARKETING_CONTENT", label: "Marketing Content", desc: "Copy, campaigns, and brand materials" },
  { value: "SALES_PROPOSALS", label: "Sales Proposals", desc: "Quotes, pitches, and sales materials" },
  { value: "DATA_REPORTING", label: "Data Reporting", desc: "Dashboards, reports, and analytical summaries" },
  { value: "OPERATIONS_ADMIN", label: "Operations & Admin", desc: "Workflows, scheduling, and operational tasks" },
] as const;

const ADOPTION_STATE_OPTIONS = [
  { value: "NONE", label: "None", desc: "No one is using AI tools yet" },
  { value: "FEW_EXPERIMENTING", label: "A few experimenting", desc: "Small number trying things on their own" },
  { value: "MULTIPLE_REGULAR", label: "Multiple using regularly", desc: "Several people use AI tools routinely" },
  { value: "ENCOURAGED_UNSTRUCTURED", label: "Encouraged but unstructured", desc: "Leadership supports it but no standards exist" },
  { value: "WIDELY_USED_UNSTANDARDIZED", label: "Widely used, unstandardized", desc: "Broad adoption with no governance in place" },
] as const;

const SENSITIVITY_OPTIONS = [
  { value: "PUBLIC_CONTENT", label: "Public Content", desc: "No sensitive information involved" },
  { value: "INTERNAL_BUSINESS_INFO", label: "Internal Business Info", desc: "Internal data not meant for public" },
  { value: "CLIENT_MATERIALS", label: "Client Materials", desc: "Documents or data belonging to clients" },
  { value: "FINANCIAL_OPERATIONAL_RECORDS", label: "Financial & Operational Records", desc: "Revenue, budgets, or operational data" },
  { value: "REGULATED_CONFIDENTIAL", label: "Regulated / Confidential", desc: "PII, PHI, legal, or compliance-sensitive data" },
] as const;

const LEADERSHIP_OPTIONS = [
  { value: "MOVE_QUICKLY", label: "Move quickly", desc: "Prioritize speed and enablement" },
  { value: "BALANCED", label: "Balanced", desc: "Equal weight to speed and caution" },
  { value: "CAUTIOUS", label: "Cautious", desc: "Prioritize risk management and control" },
] as const;

type FormState = {
  primary_goal: string;
  adoption_state: string;
  sensitivity_anchor: string;
  leadership_posture: string;
};

type DecisionOutput = {
  rollout_mode: string;
  guardrail_strictness: string;
  review_depth: string;
  policy_tone: string;
  maturity_state: string;
  primary_risk_driver: string;
  needs_stabilization: boolean;
};

type CreateRolloutResponse = {
  ok: boolean;
  rollout: { id: string };
  output: DecisionOutput;
  message?: string;
};

const BADGE_COLORS: Record<string, string> = {
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
  BALANCED_TONE: "info",
  PROTECTIVE: "warning",
  CONTROLLED_ENABLEMENT: "danger",
  YES: "danger",
  NO: "success",
};

function Badge({ value }: { value: string }) {
  const colorKey = value === "BALANCED" ? "BALANCED_TONE" : value;
  const color = BADGE_COLORS[colorKey] ?? "info";
  return (
    <span className={`${styles.badge} ${styles[`badge_${color}`]}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    primary_goal: "",
    adoption_state: "",
    sensitivity_anchor: "",
    leadership_posture: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ rolloutId: string; output: DecisionOutput } | null>(null);

  const allFilled = Object.values(form).every(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/rollouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: CreateRolloutResponse = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Failed to create rollout.");
        return;
      }
      setResult({ rolloutId: data.rollout.id, output: data.output });
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const { output, rolloutId } = result;
    return (
      <div className={styles.wrap}>
        <div className={styles.successCard}>
          <div className={styles.successHeader}>
            <div className={styles.successIcon}>✓</div>
            <div>
              <h2 className={styles.successTitle}>Rollout Created</h2>
              <p className={styles.successSub}>Decision engine has analyzed your inputs.</p>
            </div>
          </div>

          <div className={styles.outputGrid}>
            <div className={styles.outputItem}>
              <span className={styles.outputLabel}>Rollout Mode</span>
              <Badge value={output.rollout_mode} />
            </div>
            <div className={styles.outputItem}>
              <span className={styles.outputLabel}>Guardrail Strictness</span>
              <Badge value={output.guardrail_strictness} />
            </div>
            <div className={styles.outputItem}>
              <span className={styles.outputLabel}>Review Depth</span>
              <Badge value={output.review_depth} />
            </div>
            <div className={styles.outputItem}>
              <span className={styles.outputLabel}>Policy Tone</span>
              <Badge value={output.policy_tone} />
            </div>
            <div className={styles.outputItem}>
              <span className={styles.outputLabel}>Maturity State</span>
              <Badge value={output.maturity_state} />
            </div>
            <div className={styles.outputItem}>
              <span className={styles.outputLabel}>Needs Stabilization</span>
              <Badge value={output.needs_stabilization ? "YES" : "NO"} />
            </div>
            <div className={`${styles.outputItem} ${styles.outputFull}`}>
              <span className={styles.outputLabel}>Primary Risk Driver</span>
              <span className={styles.outputValue}>{output.primary_risk_driver}</span>
            </div>
          </div>

          <div className={styles.successActions}>
            <button
              className={styles.btnPrimary}
              onClick={() => router.push(`/rollouts/${rolloutId}`)}
            >
              Open Dashboard →
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => {
                setResult(null);
                setForm({ primary_goal: "", adoption_state: "", sensitivity_anchor: "", leadership_posture: "" });
              }}
            >
              Create Another
            </button>
          </div>

          <p className={styles.rolloutId}>
            Rollout ID: <code>{rolloutId}</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.formCard}>
        <div className={styles.formHeader}>
          <h1 className={styles.title}>New AI Rollout</h1>
          <p className={styles.subtitle}>
            Answer four questions to generate your governance profile, guardrails, and rollout plan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Primary Goal */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.legendNum}>1</span>
              What is the primary goal of this AI rollout?
            </legend>
            <div className={styles.optionGrid}>
              {PRIMARY_GOAL_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`${styles.optionCard} ${form.primary_goal === opt.value ? styles.optionCardSelected : ""}`}
                >
                  <input
                    type="radio"
                    name="primary_goal"
                    value={opt.value}
                    checked={form.primary_goal === opt.value}
                    onChange={(e) => setForm((f) => ({ ...f, primary_goal: e.target.value }))}
                    className={styles.radioHidden}
                  />
                  <span className={styles.optionLabel}>{opt.label}</span>
                  <span className={styles.optionDesc}>{opt.desc}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Adoption State */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.legendNum}>2</span>
              What is the current adoption state?
            </legend>
            <div className={styles.optionList}>
              {ADOPTION_STATE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`${styles.optionRow} ${form.adoption_state === opt.value ? styles.optionRowSelected : ""}`}
                >
                  <input
                    type="radio"
                    name="adoption_state"
                    value={opt.value}
                    checked={form.adoption_state === opt.value}
                    onChange={(e) => setForm((f) => ({ ...f, adoption_state: e.target.value }))}
                    className={styles.radioHidden}
                  />
                  <span className={styles.optionLabel}>{opt.label}</span>
                  <span className={styles.optionDesc}>{opt.desc}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Sensitivity Anchor */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.legendNum}>3</span>
              What is the sensitivity of data involved?
            </legend>
            <div className={styles.optionList}>
              {SENSITIVITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`${styles.optionRow} ${form.sensitivity_anchor === opt.value ? styles.optionRowSelected : ""}`}
                >
                  <input
                    type="radio"
                    name="sensitivity_anchor"
                    value={opt.value}
                    checked={form.sensitivity_anchor === opt.value}
                    onChange={(e) => setForm((f) => ({ ...f, sensitivity_anchor: e.target.value }))}
                    className={styles.radioHidden}
                  />
                  <span className={styles.optionLabel}>{opt.label}</span>
                  <span className={styles.optionDesc}>{opt.desc}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Leadership Posture */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.legendNum}>4</span>
              What is leadership&apos;s posture on this rollout?
            </legend>
            <div className={styles.optionGrid3}>
              {LEADERSHIP_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`${styles.optionCard} ${form.leadership_posture === opt.value ? styles.optionCardSelected : ""}`}
                >
                  <input
                    type="radio"
                    name="leadership_posture"
                    value={opt.value}
                    checked={form.leadership_posture === opt.value}
                    onChange={(e) => setForm((f) => ({ ...f, leadership_posture: e.target.value }))}
                    className={styles.radioHidden}
                  />
                  <span className={styles.optionLabel}>{opt.label}</span>
                  <span className={styles.optionDesc}>{opt.desc}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.formFooter}>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={!allFilled || loading}
            >
              {loading ? "Analyzing…" : "Generate Governance Profile →"}
            </button>
            <p className={styles.hint}>
              {allFilled
                ? "Ready to analyze."
                : "Select all four options above to continue."}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
