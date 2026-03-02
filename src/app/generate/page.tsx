"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";

// ---- Options ----

const PRIMARY_GOAL_OPTIONS = [
  { value: "CLIENT_COMMUNICATION",   label: "Client Communication",   desc: "Drafting, summarising, or responding to client correspondence" },
  { value: "INTERNAL_DOCUMENTATION", label: "Internal Documentation", desc: "SOPs, knowledge bases, internal memos and reference docs" },
  { value: "MARKETING_CONTENT",      label: "Marketing Content",      desc: "Copy, campaigns, website content, and brand materials" },
  { value: "SALES_PROPOSALS",        label: "Sales Proposals",        desc: "Quotes, pitches, RFP responses, and sales materials" },
  { value: "DATA_REPORTING",         label: "Data Reporting",         desc: "Dashboards, summaries, and analytical outputs" },
  { value: "OPERATIONS_ADMIN",       label: "Operations & Admin",     desc: "Workflows, scheduling, and day-to-day operational tasks" },
] as const;

const ADOPTION_STATE_OPTIONS = [
  { value: "NONE",                      label: "Not yet",                         desc: "No one in the firm is using AI tools yet" },
  { value: "FEW_EXPERIMENTING",         label: "A few people, on their own",      desc: "Some individuals have started experimenting independently" },
  { value: "MULTIPLE_REGULAR",          label: "Several using it regularly",      desc: "A meaningful group uses AI tools as part of their routine work" },
  { value: "ENCOURAGED_UNSTRUCTURED",   label: "We encourage it, but no rules",  desc: "Leadership supports AI use but there are no standards or guidelines" },
  { value: "WIDELY_USED_UNSTANDARDIZED", label: "Widespread, but unmanaged",     desc: "Most people use AI tools, but usage is inconsistent and ungoverned" },
] as const;

const SENSITIVITY_OPTIONS = [
  { value: "PUBLIC_CONTENT",                label: "Public-facing content",          desc: "Nothing sensitive — marketing copy, public communications" },
  { value: "INTERNAL_BUSINESS_INFO",        label: "Internal business information",  desc: "Internal documents not intended for outside the firm" },
  { value: "CLIENT_MATERIALS",              label: "Client materials",               desc: "Documents, data, or communications belonging to clients" },
  { value: "FINANCIAL_OPERATIONAL_RECORDS", label: "Financial or operational data",  desc: "Revenue figures, budgets, contracts, or operational records" },
  { value: "REGULATED_CONFIDENTIAL",        label: "Regulated or confidential data", desc: "Anything subject to legal, compliance, or confidentiality obligations" },
] as const;

const LEADERSHIP_OPTIONS = [
  { value: "MOVE_QUICKLY", label: "Move quickly",  desc: "Get this in place fast — we'll refine as we go" },
  { value: "BALANCED",     label: "Balanced",      desc: "Move at a reasonable pace with appropriate checkpoints" },
  { value: "CAUTIOUS",     label: "Carefully",     desc: "We want thorough controls before expanding AI use" },
] as const;

// ---- Types ----

type FormState = {
  primary_goal: string;
  adoption_state: string;
  sensitivity_anchor: string;
  leadership_posture: string;
};

type EngineOutput = {
  rollout_mode: string;
  guardrail_strictness: string;
  review_depth: string;
  policy_tone: string;
  maturity_state: string;
  primary_risk_driver: string;
  needs_stabilization: boolean;
  sensitivity_tier: string;
};

type FinalizeState = {
  initiative_lead_name: string;
  initiative_lead_title: string;
  approving_authority_name: string;
  approving_authority_title: string;
};

type PrefillData = {
  inputs: FormState;
  identity: FinalizeState;
};

// ---- Helpers ----

function isSoloMode(f: FinalizeState): boolean {
  if (!f.initiative_lead_name || !f.approving_authority_name) return false;
  return (
    f.initiative_lead_name.trim().toLowerCase() ===
      f.approving_authority_name.trim().toLowerCase() &&
    f.initiative_lead_title.trim().toLowerCase() ===
      f.approving_authority_title.trim().toLowerCase()
  );
}

function readPrefill(searchParams: { get(name: string): string | null }): PrefillData {
  return {
    inputs: {
      primary_goal: searchParams.get("primary_goal") ?? "",
      adoption_state: searchParams.get("adoption_state") ?? "",
      sensitivity_anchor: searchParams.get("sensitivity_anchor") ?? "",
      leadership_posture: searchParams.get("leadership_posture") ?? "",
    },
    identity: {
      initiative_lead_name: searchParams.get("initiative_lead_name") ?? "",
      initiative_lead_title: searchParams.get("initiative_lead_title") ?? "",
      approving_authority_name: searchParams.get("approving_authority_name") ?? "",
      approving_authority_title: searchParams.get("approving_authority_title") ?? "",
    },
  };
}

// ---- Step 1: Intake Form ----

type OnIntakeComplete =
  | { deferred: false; rolloutId: string; output: EngineOutput; inputs: FormState }
  | { deferred: true; output: EngineOutput; inputs: FormState };

function IntakeForm({
  onComplete,
  initialForm,
}: {
  onComplete: (result: OnIntakeComplete) => void;
  initialForm: FormState;
}) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allFilled = Object.values(form).every(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // REGULATED_CONFIDENTIAL: the DB constraint chk_regulated_identity_required
      // rejects an insert without identity fields. Evaluate only here — the actual
      // DB insert happens in the finalize step once identity is collected.
      if (form.sensitivity_anchor === "REGULATED_CONFIDENTIAL") {
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.message ?? "Something went wrong. Please try again.");
          return;
        }
        onComplete({ deferred: true, output: data.output, inputs: form });
        return;
      }

      const res = await fetch("/api/rollouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        return;
      }
      onComplete({ deferred: false, rolloutId: data.rollout.id, output: data.output, inputs: form });
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.formCard}>
        <div className={styles.formHeader}>
          <p className={styles.formCardLabel}>Step 1 of 2</p>
          <h2 className={styles.title}>Set up your framework</h2>
          <p className={styles.subtitle}>
            Answer four questions about your firm. Your responses calibrate the framework — including risk tier, rollout pacing, and review depth.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.legendNum}>1</span>
              Where will AI be used most in your firm?
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

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.legendNum}>2</span>
              How much is AI already being used at your firm?
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

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.legendNum}>3</span>
              What kind of information will AI be working with?
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

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.legendNum}>4</span>
              How does leadership want to approach this rollout?
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
              {loading ? "Building your framework…" : "Continue →"}
            </button>
            <p className={styles.hint}>
              {allFilled ? "One more step after this." : "Answer all four questions to continue."}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Step 2: Finalize (identity fields + mode framing) ----

function FinalizeStep({
  rolloutId,
  intakeInputs,
  output,
  inputs,
  initialIdentity,
  onComplete,
}: {
  rolloutId: string | null;   // null = deferred (REGULATED): create rollout here
  intakeInputs?: FormState;   // original intake answers (needed when rolloutId is null)
  output: EngineOutput;
  inputs: FormState;
  initialIdentity: FinalizeState;
  onComplete: (id: string) => void;
}) {
  const [form, setForm] = useState<FinalizeState>(initialIdentity);
  const [sameAsLead, setSameAsLead] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegulated = output.sensitivity_tier === "REGULATED";

  function handleSameAsLead(checked: boolean) {
    setSameAsLead(checked);
    if (checked) {
      setForm((f) => ({
        ...f,
        approving_authority_name: f.initiative_lead_name,
        approving_authority_title: f.initiative_lead_title,
      }));
    }
  }

  function handleLeadChange(field: "initiative_lead_name" | "initiative_lead_title", value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (sameAsLead) {
        if (field === "initiative_lead_name") next.approving_authority_name = value;
        if (field === "initiative_lead_title") next.approving_authority_title = value;
      }
      return next;
    });
  }

  const leadPairFilled = Boolean(form.initiative_lead_name && form.initiative_lead_title);
  const authorityPairFilled = Boolean(form.approving_authority_name && form.approving_authority_title);
  const canSkip = !isRegulated;
  const canSubmit = isRegulated
    ? leadPairFilled && authorityPairFilled
    : (!form.initiative_lead_name && !form.initiative_lead_title && !form.approving_authority_name && !form.approving_authority_title) ||
      (leadPairFilled && authorityPairFilled) ||
      (leadPairFilled && !form.approving_authority_name && !form.approving_authority_title) ||
      (!form.initiative_lead_name && !form.initiative_lead_title && authorityPairFilled);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const identityPayload: Record<string, string> = {};
    if (form.initiative_lead_name)      identityPayload.initiative_lead_name      = form.initiative_lead_name.trim();
    if (form.initiative_lead_title)     identityPayload.initiative_lead_title     = form.initiative_lead_title.trim();
    if (form.approving_authority_name)  identityPayload.approving_authority_name  = form.approving_authority_name.trim();
    if (form.approving_authority_title) identityPayload.approving_authority_title = form.approving_authority_title.trim();

    try {
      // Deferred path (REGULATED): create rollout and identity in one request
      if (rolloutId === null) {
        const src = intakeInputs ?? inputs;
        const res = await fetch("/api/rollouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...src, ...identityPayload }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.message ?? "Something went wrong. Please try again.");
          return;
        }
        onComplete(data.rollout.id);
        return;
      }

      const res = await fetch(`/api/rollouts/${rolloutId}/finalize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(identityPayload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        return;
      }
      onComplete(rolloutId);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    // Skip is only available for non-REGULATED tiers where rolloutId already exists.
    if (!rolloutId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/rollouts/${rolloutId}/finalize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Something went wrong.");
        return;
      }
      onComplete(rolloutId);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const solo = isSoloMode(form);
  const goalLabel = inputs.primary_goal.replace(/_/g, " ").toLowerCase();

  return (
    <div className={styles.wrap}>
      <div className={styles.formCard}>
        <div className={styles.formHeader}>
          <h1 className={styles.title}>Finalize governance ownership</h1>
          <p className={styles.subtitle}>
            These names are used in the generated documents. They do not change the decision outputs.
          </p>
          {isRegulated && (
            <div className={styles.regulatedGate}>
              <strong className={styles.regulatedGateTitle}>Ownership required</strong>
              <p className={styles.regulatedGateBody}>
                This rollout is anchored to regulated or confidential information. Governance ownership must be recorded before activation.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          <div className={styles.contextBanner}>
            <span className={styles.contextBannerLabel}>Your governance framework at a glance</span>
            <p className={styles.contextBannerText}>
              Based on your answers, your framework uses a <strong>{output.rollout_mode.replace(/_/g, " ").toLowerCase()} rollout</strong> focused on <strong>{goalLabel}</strong>
              {output.needs_stabilization ? ", with a stabilization phase to document and standardize current usage before expansion begins" : ""}.
              Your usage guardrails, review standard, adoption plan, and AI usage policy are ready — record who owns this to complete the framework.
            </p>
          </div>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.legendNum}>A</span>
              Initiative Lead
            </legend>
            <p className={styles.fieldsetHint}>
              The person responsible for implementing this framework and ensuring review requirements are met.
            </p>
            <div className={styles.nameGrid}>
              <div className={styles.nameField}>
                <label className={styles.nameLabel}>Full name</label>
                <input
                  type="text"
                  className={styles.nameInput}
                  placeholder="e.g. Sarah Mitchell"
                  value={form.initiative_lead_name}
                  maxLength={120}
                  onChange={(e) => handleLeadChange("initiative_lead_name", e.target.value)}
                />
              </div>
              <div className={styles.nameField}>
                <label className={styles.nameLabel}>Title or role</label>
                <input
                  type="text"
                  className={styles.nameInput}
                  placeholder="e.g. Managing Partner"
                  value={form.initiative_lead_title}
                  maxLength={120}
                  onChange={(e) => handleLeadChange("initiative_lead_title", e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              <span className={styles.legendNum}>B</span>
              Approving Authority
            </legend>
            <p className={styles.fieldsetHint}>
              The person with authority over this governance framework. If that&apos;s the same person as above, check the box.
            </p>

            {leadPairFilled && (
              <label className={styles.sameAsLeadToggle}>
                <input
                  type="checkbox"
                  checked={sameAsLead}
                  onChange={(e) => handleSameAsLead(e.target.checked)}
                />
                <span>Same person as the initiative lead</span>
              </label>
            )}

            <div className={styles.nameGrid}>
              <div className={styles.nameField}>
                <label className={styles.nameLabel}>Full name</label>
                <input
                  type="text"
                  className={styles.nameInput}
                  placeholder="e.g. James Okafor"
                  value={form.approving_authority_name}
                  maxLength={120}
                  disabled={sameAsLead}
                  onChange={(e) => setForm((f) => ({ ...f, approving_authority_name: e.target.value }))}
                />
              </div>
              <div className={styles.nameField}>
                <label className={styles.nameLabel}>Title or role</label>
                <input
                  type="text"
                  className={styles.nameInput}
                  placeholder="e.g. Principal"
                  value={form.approving_authority_title}
                  maxLength={120}
                  disabled={sameAsLead}
                  onChange={(e) => setForm((f) => ({ ...f, approving_authority_title: e.target.value }))}
                />
              </div>
            </div>

            {solo && (
              <p className={styles.soloNote}>
                You&apos;re establishing this framework as both the initiative lead and approving authority. Your documents will reflect that — no approval routing needed.
              </p>
            )}
          </fieldset>

          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.formFooter}>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={!canSubmit || loading}
            >
              {loading ? "Saving…" : "Save and continue →"}
            </button>
            {canSkip && (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleSkip}
                disabled={loading}
              >
                Skip for now
              </button>
            )}
          </div>
          {canSkip && (
            <p className={styles.hint} style={{ marginTop: 8 }}>
              You can add names later from the governance dashboard.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

// ---- Root Generate Page ----

export default function GeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = readPrefill(searchParams);

  type Stage =
    | { step: "intake" }
    | { step: "finalize"; rolloutId: string; output: EngineOutput; inputs: FormState }
    | { step: "finalize_deferred"; output: EngineOutput; inputs: FormState };

  const [stage, setStage] = useState<Stage>({ step: "intake" });

  if (stage.step === "intake") {
    return (
      <IntakeForm
        initialForm={prefill.inputs}
        onComplete={(result) => {
          if (result.deferred) {
            setStage({ step: "finalize_deferred", output: result.output, inputs: result.inputs });
          } else {
            setStage({ step: "finalize", rolloutId: result.rolloutId, output: result.output, inputs: result.inputs });
          }
        }}
      />
    );
  }

  if (stage.step === "finalize_deferred") {
    return (
      <FinalizeStep
        rolloutId={null}
        intakeInputs={stage.inputs}
        output={stage.output}
        inputs={stage.inputs}
        initialIdentity={prefill.identity}
        onComplete={(id) => router.push(`/rollouts/${id}`)}
      />
    );
  }

  return (
    <FinalizeStep
      rolloutId={stage.rolloutId}
      output={stage.output}
      inputs={stage.inputs}
      initialIdentity={prefill.identity}
      onComplete={(id) => router.push(`/rollouts/${id}`)}
    />
  );
}
