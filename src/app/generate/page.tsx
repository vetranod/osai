"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { bridgeBrowserSessionToServer } from "@/lib/browser-auth-bridge";
import { getCachedBrowserSession } from "@/lib/browser-session-cache";
import {
  buildClientAuthHeaders,
  getClientAccessToken,
  restoreBrowserSessionFromCache,
} from "@/lib/browser-auth-client";
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
  { value: "PUBLIC_CONTENT",                label: "Public-facing content",          desc: "Nothing sensitive - marketing copy, public communications" },
  { value: "INTERNAL_BUSINESS_INFO",        label: "Internal business information",  desc: "Internal documents not intended for outside the firm" },
  { value: "CLIENT_MATERIALS",              label: "Client materials",               desc: "Documents, data, or communications belonging to clients" },
  { value: "FINANCIAL_OPERATIONAL_RECORDS", label: "Financial or operational data",  desc: "Revenue figures, budgets, contracts, or operational records" },
  { value: "REGULATED_CONFIDENTIAL",        label: "Regulated or confidential data", desc: "Anything subject to legal, compliance, or confidentiality obligations" },
] as const;

const LEADERSHIP_OPTIONS = [
  { value: "MOVE_QUICKLY", label: "Move quickly",  desc: "Get this in place fast - we'll refine as we go" },
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

type ClientAuthProof = {
  userId: string;
  email: string;
  exp: number;
  sig: string;
};

declare global {
  interface Window {
    __OSAI_AUTH_PROOF?: ClientAuthProof | null;
  }
}

const GENERATE_DRAFT_KEY = "osai_generate_draft_v1";

function getGenerateDraftKey(): string {
  if (typeof window === "undefined") return `${GENERATE_DRAFT_KEY}:anon`;
  const userId = window.__OSAI_AUTH_PROOF?.userId?.trim();
  return userId ? `${GENERATE_DRAFT_KEY}:${userId}` : `${GENERATE_DRAFT_KEY}:anon`;
}

function saveGenerateDraft(prefill: PrefillData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getGenerateDraftKey(),
      JSON.stringify({
        ...prefill,
        updatedAt: Date.now(),
      })
    );
  } catch {}
}

function loadGenerateDraft(): PrefillData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getGenerateDraftKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      inputs?: Partial<FormState>;
      identity?: Partial<FinalizeState>;
    };
    return {
      inputs: {
        primary_goal: parsed.inputs?.primary_goal ?? "",
        adoption_state: parsed.inputs?.adoption_state ?? "",
        sensitivity_anchor: parsed.inputs?.sensitivity_anchor ?? "",
        leadership_posture: parsed.inputs?.leadership_posture ?? "",
      },
      identity: {
        initiative_lead_name: parsed.identity?.initiative_lead_name ?? "",
        initiative_lead_title: parsed.identity?.initiative_lead_title ?? "",
        approving_authority_name: parsed.identity?.approving_authority_name ?? "",
        approving_authority_title: parsed.identity?.approving_authority_title ?? "",
      },
    };
  } catch {
    return null;
  }
}

async function postCheckoutStart(body: Record<string, string>): Promise<Response> {
  const headers = await buildClientAuthHeaders(
    { "Content-Type": "application/json" },
    { preferServerToken: true }
  );

  return fetch("/api/checkout/start", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });
}

async function postDemoCheckoutStart(body: Record<string, string>): Promise<Response> {
  const headers = await buildClientAuthHeaders(
    { "Content-Type": "application/json" },
    { preferServerToken: true }
  );

  return fetch("/api/checkout/demo-start", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });
}

function buildGenerateResumePath(inputs: FormState, identity: FinalizeState): string {
  const params = new URLSearchParams();
  params.set("resume", "finalize");
  params.set("primary_goal", inputs.primary_goal);
  params.set("adoption_state", inputs.adoption_state);
  params.set("sensitivity_anchor", inputs.sensitivity_anchor);
  params.set("leadership_posture", inputs.leadership_posture);
  if (identity.initiative_lead_name) params.set("initiative_lead_name", identity.initiative_lead_name);
  if (identity.initiative_lead_title) params.set("initiative_lead_title", identity.initiative_lead_title);
  if (identity.approving_authority_name) params.set("approving_authority_name", identity.approving_authority_name);
  if (identity.approving_authority_title) params.set("approving_authority_title", identity.approving_authority_title);
  return `/generate?${params.toString()}`;
}

function buildAuthContinuePath(nextPath: string): string {
  return `/auth/continue?next=${encodeURIComponent(nextPath)}`;
}

function hasCompleteIntake(inputs: FormState): boolean {
  return Boolean(
    inputs.primary_goal &&
    inputs.adoption_state &&
    inputs.sensitivity_anchor &&
    inputs.leadership_posture
  );
}

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
  | { deferred: true; output: EngineOutput; inputs: FormState };

// Step metadata for the 4-question wizard
const WIZARD_STEPS: Array<{
  field: keyof FormState;
  category: string;
  question: string;
}> = [
  {
    field: "primary_goal",
    category: "Primary Use Case",
    question: "Where will AI be used most in your firm?",
  },
  {
    field: "adoption_state",
    category: "Current AI Usage",
    question: "How widely are AI tools already being used today?",
  },
  {
    field: "sensitivity_anchor",
    category: "Data Sensitivity",
    question: "What kind of information will AI be working with?",
  },
  {
    field: "leadership_posture",
    category: "Rollout Approach",
    question: "How does leadership want to approach this rollout?",
  },
];

// ---- Framework Preview helpers (inline engine logic, no server imports) ----

function previewRiskTier(anchor: string): string {
  switch (anchor) {
    case "PUBLIC_CONTENT":
    case "INTERNAL_BUSINESS_INFO": return "Low";
    case "CLIENT_MATERIALS": return "Client";
    case "FINANCIAL_OPERATIONAL_RECORDS": return "High";
    case "REGULATED_CONFIDENTIAL": return "Regulated";
    default: return "-";
  }
}

function previewGuardrailLevel(anchor: string, goal: string): string {
  const floor = (anchor === "PUBLIC_CONTENT" || anchor === "INTERNAL_BUSINESS_INFO") ? 2 : 3;
  const mods: Record<string, number> = {
    MARKETING_CONTENT: 0, INTERNAL_DOCUMENTATION: 1, OPERATIONS_ADMIN: 1,
    CLIENT_COMMUNICATION: 2, SALES_PROPOSALS: 2, DATA_REPORTING: 3,
  };
  const score = Math.min(4, floor + (mods[goal] ?? 0));
  const labels: Record<number, string> = { 1: "Low", 2: "Moderate", 3: "High", 4: "Very High" };
  return labels[score] ?? "-";
}

function previewRolloutSpeed(adoption: string, anchor: string, posture: string): string {
  const highSensitivity = anchor === "FINANCIAL_OPERATIONAL_RECORDS" || anchor === "REGULATED_CONFIDENTIAL";
  const highAdoption = adoption === "ENCOURAGED_UNSTRUCTURED" || adoption === "WIDELY_USED_UNSTANDARDIZED";
  if (highSensitivity && highAdoption && posture === "MOVE_QUICKLY") return "Split Deployment";
  const bases: Record<string, number> = {
    NONE: 1, FEW_EXPERIMENTING: 2, MULTIPLE_REGULAR: 3,
    ENCOURAGED_UNSTRUCTURED: 4, WIDELY_USED_UNSTANDARDIZED: 5,
  };
  const deltas: Record<string, number> = { CAUTIOUS: -1, BALANCED: 0, MOVE_QUICKLY: 1 };
  const ceilings: Record<string, number> = {
    PUBLIC_CONTENT: 5, INTERNAL_BUSINESS_INFO: 4, CLIENT_MATERIALS: 3,
    FINANCIAL_OPERATIONAL_RECORDS: 2, REGULATED_CONFIDENTIAL: 2,
  };
  const level = Math.max(1, Math.min((bases[adoption] ?? 3) + (deltas[posture] ?? 0), ceilings[anchor] ?? 5));
  if (level <= 2) return "Controlled";
  if (level === 3) return "Phased";
  return "Accelerated";
}

function previewReviewStandard(anchor: string, goal: string, posture: string): string {
  const floor = (anchor === "PUBLIC_CONTENT" || anchor === "INTERNAL_BUSINESS_INFO") ? 2 : 3;
  const reviewMods: Record<string, number> = {
    MARKETING_CONTENT: 0, INTERNAL_DOCUMENTATION: 1, OPERATIONS_ADMIN: 1,
    CLIENT_COMMUNICATION: 1, SALES_PROPOSALS: 1, DATA_REPORTING: 2,
  };
  const leaderMods: Record<string, number> = { MOVE_QUICKLY: -1, BALANCED: 0, CAUTIOUS: 1 };
  const afterLeader = Math.max(floor, floor + (leaderMods[posture] ?? 0));
  const score = Math.min(4, afterLeader + (reviewMods[goal] ?? 0));
  const labels: Record<number, string> = { 1: "Light", 2: "Standard", 3: "Structured", 4: "Formal" };
  return labels[score] ?? "-";
}

function PreviewField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={styles.previewField}>
      <span className={styles.previewFieldLabel}>{label}</span>
      {value !== null ? (
        <span className={styles.previewFieldValue}>{value}</span>
      ) : (
        <span className={styles.previewFieldEmpty}>-</span>
      )}
    </div>
  );
}

function FrameworkPreview({ form }: { form: FormState }) {
  const hasGoal       = Boolean(form.primary_goal);
  const hasAdoption   = Boolean(form.adoption_state);
  const hasSensitivity = Boolean(form.sensitivity_anchor);
  const hasLeadership = Boolean(form.leadership_posture);

  const riskTierReady     = hasSensitivity;
  const rolloutSpeedReady = hasAdoption && hasSensitivity && hasLeadership;
  const guardrailReady    = hasGoal && hasSensitivity;
  const reviewReady       = hasGoal && hasSensitivity && hasLeadership;

  return (
    <div className={styles.previewPanel}>
      <div className={styles.previewPanelHeader}>
        <span className={styles.previewPanelLabel}>Framework Preview</span>
        <p className={styles.previewPanelNote}>
          Estimates based on current selections. Full documents generated after completion.
        </p>
      </div>
      <div className={styles.previewFields}>
        <PreviewField
          label="Risk Tier"
          value={riskTierReady ? previewRiskTier(form.sensitivity_anchor) : null}
        />
        <PreviewField
          label="Rollout Speed"
          value={rolloutSpeedReady ? previewRolloutSpeed(form.adoption_state, form.sensitivity_anchor, form.leadership_posture) : null}
        />
        <PreviewField
          label="Guardrail Level"
          value={guardrailReady ? previewGuardrailLevel(form.sensitivity_anchor, form.primary_goal) : null}
        />
        <PreviewField
          label="Review Standard"
          value={reviewReady ? previewReviewStandard(form.sensitivity_anchor, form.primary_goal, form.leadership_posture) : null}
        />
      </div>
    </div>
  );
}

// ---- Step 1: Intake Form ----

function IntakeForm({
  onComplete,
  initialForm,
}: {
  onComplete: (result: OnIntakeComplete) => void;
  initialForm: FormState;
}) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [wizardStep, setWizardStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentField = WIZARD_STEPS[wizardStep].field;
  const currentStepFilled = Boolean(form[currentField]);
  const isLastStep = wizardStep === WIZARD_STEPS.length - 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Evaluate only during intake; actual rollout creation happens post-payment.
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
    } catch {
      setError("Network error - please try again.");
    } finally {
      setLoading(false);
    }
  }

  const step = WIZARD_STEPS[wizardStep];

  return (
    <div className={styles.wizardWrap}>
      <div className={styles.formCard}>
        <div className={styles.formHeader}>
          <p className={styles.stepEyebrow}>Step {wizardStep + 1} of {WIZARD_STEPS.length}</p>
          <div className={styles.progressBarWrap}>
            <div
              className={styles.progressBar}
              style={{ width: `${Math.round((wizardStep + 1) / WIZARD_STEPS.length * 100)}%` }}
            />
          </div>
          <h2 className={styles.stepCategory}>{step.category}</h2>
          <p className={styles.subtitle}>{step.question}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          {wizardStep === 0 && (
            <fieldset className={styles.fieldset}>
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
          )}

          {wizardStep === 1 && (
            <fieldset className={styles.fieldset}>
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
          )}

          {wizardStep === 2 && (
            <fieldset className={styles.fieldset}>
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
          )}

          {wizardStep === 3 && (
            <fieldset className={styles.fieldset}>
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
          )}

          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.wizardFooter}>
            {wizardStep > 0 ? (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setWizardStep((s) => s - 1)}
                disabled={loading}
              >
                {"← Back"}
              </button>
            ) : (
              <span />
            )}
            {isLastStep ? (
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={!currentStepFilled || loading}
              >
                {loading ? "Building your framework..." : "Continue →"}
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={!currentStepFilled}
                onClick={() => setWizardStep((s) => s + 1)}
              >
                {"Next →"}
              </button>
            )}
          </div>

          {isLastStep && (
            <p className={styles.hint} style={{ marginTop: 10 }}>
              One more step after this.
            </p>
          )}

        </form>
      </div>
      <div className={styles.previewPanelWrap}>
        <FrameworkPreview form={form} />
      </div>
    </div>
  );
}

// ---- Step 2: Finalize (identity fields + mode framing) ----

function FinalizeStep({
  output,
  inputs,
  initialIdentity,
  showDemoCta,
  onBackToQuestions,
}: {
  output: EngineOutput;
  inputs: FormState;
  initialIdentity: FinalizeState;
  showDemoCta: boolean;
  onBackToQuestions: () => void;
}) {
  const [form, setForm] = useState<FinalizeState>(initialIdentity);
  const [sameAsLead, setSameAsLead] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demoEnabled =
    showDemoCta &&
    typeof window !== "undefined" &&
    ((window as unknown as { __OSAI_PUBLIC_ENV?: { demoCheckoutEnabled?: boolean } }).__OSAI_PUBLIC_ENV
      ?.demoCheckoutEnabled === true);

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

  function redirectToLoginResume(
    options: { sessionExpired?: boolean; promptCreateAccount?: boolean } = {}
  ): void {
    const next = buildGenerateResumePath(inputs, form);
    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set("next", next);
    if (options.sessionExpired) {
      loginUrl.searchParams.set("auth_error", "session_required");
    }
    if (options.promptCreateAccount) {
      loginUrl.searchParams.set("mode", "sign_up");
      loginUrl.searchParams.set("intent", "checkout");
    }
    window.location.assign(loginUrl.toString());
  }

  useEffect(() => {
    saveGenerateDraft({
      inputs,
      identity: form,
    });
  }, [inputs, form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const identityPayload: Record<string, string> = {};
    if (form.initiative_lead_name) identityPayload.initiative_lead_name = form.initiative_lead_name.trim();
    if (form.initiative_lead_title) identityPayload.initiative_lead_title = form.initiative_lead_title.trim();
    if (form.approving_authority_name) identityPayload.approving_authority_name = form.approving_authority_name.trim();
    if (form.approving_authority_title) identityPayload.approving_authority_title = form.approving_authority_title.trim();

    try {
      let res = await postCheckoutStart({ ...inputs, ...identityPayload });
      // One retry after a forced refresh to avoid false session-expired loops.
      if (res.status === 401) {
        res = await postCheckoutStart({ ...inputs, ...identityPayload });
      }
      const data = await res.json();
      if (res.status === 401) {
        redirectToLoginResume({
          sessionExpired: data?.reason !== "missing_auth",
          promptCreateAccount: data?.reason === "missing_auth",
        });
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        return;
      }
      if (typeof data.dashboard_url === "string") {
        await bridgeBrowserSessionToServer();
        window.location.assign(buildAuthContinuePath(data.dashboard_url));
        return;
      }
      if (typeof data.checkout_url !== "string") {
        setError("Missing checkout URL.");
        return;
      }
      await bridgeBrowserSessionToServer();
      window.location.assign(data.checkout_url);
    } catch {
      setError("Network error - please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    if (!canSkip) return;
    setError(null);
    setLoading(true);
    try {
      let res = await postCheckoutStart(inputs);
      // One retry after a forced refresh to avoid false session-expired loops.
      if (res.status === 401) {
        res = await postCheckoutStart(inputs);
      }
      const data = await res.json();
      if (res.status === 401) {
        redirectToLoginResume({
          sessionExpired: data?.reason !== "missing_auth",
          promptCreateAccount: data?.reason === "missing_auth",
        });
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Something went wrong.");
        return;
      }
      if (typeof data.dashboard_url === "string") {
        await bridgeBrowserSessionToServer();
        window.location.assign(buildAuthContinuePath(data.dashboard_url));
        return;
      }
      if (typeof data.checkout_url !== "string") {
        setError("Missing checkout URL.");
        return;
      }
      await bridgeBrowserSessionToServer();
      window.location.assign(data.checkout_url);
    } catch {
      setError("Network error - please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoCheckout() {
    setError(null);
    setLoading(true);
    const identityPayload: Record<string, string> = {};
    if (form.initiative_lead_name) identityPayload.initiative_lead_name = form.initiative_lead_name.trim();
    if (form.initiative_lead_title) identityPayload.initiative_lead_title = form.initiative_lead_title.trim();
    if (form.approving_authority_name) identityPayload.approving_authority_name = form.approving_authority_name.trim();
    if (form.approving_authority_title) identityPayload.approving_authority_title = form.approving_authority_title.trim();

    try {
      let res = await postDemoCheckoutStart({ ...inputs, ...identityPayload });
      if (res.status === 401) {
        res = await postDemoCheckoutStart({ ...inputs, ...identityPayload });
      }
      const data = await res.json();
      if (res.status === 401) {
        if (data?.reason === "missing_auth") {
          redirectToLoginResume({
            sessionExpired: false,
            promptCreateAccount: true,
          });
          return;
        }
        const detailParts = [
          data?.message ?? "Authentication required.",
          typeof data?.reason === "string" ? `reason=${data.reason}` : null,
          typeof data?.request_host === "string" ? `request_host=${data.request_host}` : null,
          typeof data?.app_host === "string" ? `app_host=${data.app_host}` : null,
          typeof data?.has_auth_header === "boolean" ? `has_auth_header=${String(data.has_auth_header)}` : null,
        ].filter(Boolean);
        setError(`Demo auth failed: ${detailParts.join(" | ")}`);
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Demo checkout failed.");
        return;
      }
      if (typeof data.dashboard_url !== "string") {
        setError("Missing dashboard URL.");
        return;
      }
      await bridgeBrowserSessionToServer();
      window.location.assign(buildAuthContinuePath(data.dashboard_url));
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
              Your usage guardrails, review standard, adoption plan, and AI usage policy are ready - record who owns this to complete the framework.
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
                You&apos;re establishing this framework as both the initiative lead and approving authority. Your documents will reflect that - no approval routing needed.
              </p>
            )}
          </fieldset>

          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.formFooter}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onBackToQuestions}
              disabled={loading}
            >
              {"← Back to questions"}
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={!canSubmit || loading}
            >
              {loading ? "Redirecting..." : "Continue to payment"}
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
            {demoEnabled && (
              <button
                type="button"
                className={styles.btnTertiary}
                onClick={handleDemoCheckout}
                disabled={!canSubmit || loading}
              >
                Run demo flow (no charge)
              </button>
            )}
          </div>
          <p className={styles.hint} style={{ marginTop: 8 }}>
            You&apos;ll sign in or create an account before checkout so your payment and rollout stay tied together.
          </p>
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

function GeneratePageInner() {
  const searchParams = useSearchParams();
  const demoQueryEnabled = searchParams.get("demo") === "1";
  const queryPrefill = useMemo(() => readPrefill(searchParams), [searchParams]);
  const [storedPrefill, setStoredPrefill] = useState<PrefillData | null>(null);
  const authState = searchParams.get("auth");
  const authError = searchParams.get("auth_error");
  const checkoutState = searchParams.get("checkout");
  const resume = searchParams.get("resume");
  const authNotice =
    authState === "confirmed"
      ? "Email confirmed. You're signed in and can continue."
      : authError === "exchange_failed"
        ? "We couldn't complete sign-in from that email link. Please request a new login link."
        : null;
  const checkoutNotice =
    checkoutState === "start_requires_post"
      ? "Checkout starts from the button in this page. Please use Continue to payment."
      : null;
  const prefill = useMemo(() => {
    if (hasCompleteIntake(queryPrefill.inputs)) return queryPrefill;
    if (storedPrefill && hasCompleteIntake(storedPrefill.inputs)) return storedPrefill;
    return queryPrefill;
  }, [queryPrefill, storedPrefill]);
  const restoredFromDraft = !hasCompleteIntake(queryPrefill.inputs) && hasCompleteIntake(prefill.inputs);
  const shouldResumeFinalize = (resume === "finalize" || restoredFromDraft) && hasCompleteIntake(prefill.inputs);

  type Stage =
    | { step: "intake" }
    | { step: "finalize_deferred"; output: EngineOutput; inputs: FormState };

  const [stage, setStage] = useState<Stage>({ step: "intake" });
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  useEffect(() => {
    setStoredPrefill(loadGenerateDraft());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreBrowserAuthFromCache() {
      const cachedSession = getCachedBrowserSession();
      if (!cachedSession) return;

      const restoredToken = await restoreBrowserSessionFromCache({ bridgeMode: "background" });
      if (cancelled || !restoredToken) return;
    }

    void restoreBrowserAuthFromCache();
    return () => {
      cancelled = true;
    };
  }, []);

  // If the user already has an active paid rollout, skip the wizard entirely
  // and take them straight to their dashboard.  Demo mode bypasses this check
  // so prospects can still run through the flow.
  useEffect(() => {
    if (demoQueryEnabled) return;

    let cancelled = false;

    async function redirectIfRolloutExists() {
      const accessToken = await getClientAccessToken({ preferServerToken: true });
      if (!accessToken || cancelled) return;

      try {
        const res = await fetch("/api/rollouts/mine", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          ok?: boolean;
          rollout?: { dashboard_url?: string } | null;
        };
        if (!cancelled && data.ok && data.rollout?.dashboard_url) {
          window.location.assign(buildAuthContinuePath(data.rollout.dashboard_url));
        }
      } catch {
        // Non-fatal — if the check fails just show the wizard.
      }
    }

    void redirectIfRolloutExists();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoQueryEnabled]);

  useEffect(() => {
    let active = true;

    async function resumeFinalizeStage() {
      if (!shouldResumeFinalize || stage.step !== "intake") return;
      setResumeError(null);
      setResumeLoading(true);
      try {
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prefill.inputs),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (active) setResumeError(data.message ?? "Could not restore your progress. Please continue below.");
          return;
        }
        if (active) {
          setStage({ step: "finalize_deferred", output: data.output, inputs: prefill.inputs });
        }
      } catch {
        if (active) setResumeError("Could not restore your progress. Please continue below.");
      } finally {
        if (active) setResumeLoading(false);
      }
    }

    void resumeFinalizeStage();
    return () => {
      active = false;
    };
  }, [prefill.inputs, shouldResumeFinalize, stage.step]);

  if (stage.step === "intake") {
    return (
      <>
        {authNotice ? <div className={styles.successBox}>{authNotice}</div> : null}
        {checkoutNotice ? <div className={styles.successBox}>{checkoutNotice}</div> : null}
        {restoredFromDraft ? <div className={styles.successBox}>Restored your previous progress.</div> : null}
        {resumeLoading ? <div className={styles.successBox}>Restoring your progress...</div> : null}
        {resumeError ? <div className={styles.errorBox}>{resumeError}</div> : null}
        <IntakeForm
          initialForm={prefill.inputs}
          onComplete={(result) => {
            setStage({ step: "finalize_deferred", output: result.output, inputs: result.inputs });
          }}
        />
      </>
    );
  }

  return (
    <>
      {authNotice ? <div className={styles.successBox}>{authNotice}</div> : null}
      {checkoutNotice ? <div className={styles.successBox}>{checkoutNotice}</div> : null}
      {restoredFromDraft ? <div className={styles.successBox}>Restored your previous progress.</div> : null}
      <FinalizeStep
        output={stage.output}
        inputs={stage.inputs}
        initialIdentity={prefill.identity}
        showDemoCta={demoQueryEnabled}
        onBackToQuestions={() => setStage({ step: "intake" })}
      />
    </>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={null}>
      <GeneratePageInner />
    </Suspense>
  );
}




