import { notFound, redirect } from "next/navigation";

import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import { getServiceRoleSupabase } from "@/lib/supabase-server";
import { userCanAccessRollout } from "@/server/rolloutAccess";

import { PrintActions } from "./PrintActions";
import styles from "./packet.module.css";

type RolloutMeta = {
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

type ArtifactType = "PROFILE" | "GUARDRAILS" | "REVIEW_MODEL" | "ROLLOUT_PLAN" | "POLICY";

type ArtifactRow = {
  id: string;
  artifact_type: ArtifactType;
  version: number;
  content_json: Record<string, unknown> | null;
  created_at: string | null;
};

const ARTIFACT_ORDER: ArtifactType[] = ["PROFILE", "GUARDRAILS", "REVIEW_MODEL", "ROLLOUT_PLAN", "POLICY"];

const ARTIFACT_TITLES: Record<ArtifactType, string> = {
  PROFILE: "Governance Profile",
  GUARDRAILS: "Usage Guardrails",
  REVIEW_MODEL: "Review Standard",
  ROLLOUT_PLAN: "Adoption Plan",
  POLICY: "AI Usage Policy",
};

const ARTIFACT_SUMMARIES: Record<ArtifactType, string> = {
  PROFILE: "Operational snapshot of the rollout, its intended use, and the governing risk posture.",
  GUARDRAILS: "Permitted, restricted, and human-only boundaries for AI-assisted work.",
  REVIEW_MODEL: "Review authority, cadence, escalation rules, and oversight model.",
  ROLLOUT_PLAN: "Pacing, phases, stabilization controls, and expansion criteria.",
  POLICY: "Consolidated internal policy language for use, review, and data handling.",
};

function formatEnumDisplay(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  return raw
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function personLine(name: string | null, title: string | null, fallback: string): string {
  return name && title ? `${name}, ${title}` : fallback;
}

async function loadPacketData(rolloutId: string): Promise<{ rollout: RolloutMeta; artifacts: ArtifactRow[] } | null> {
  const nextPath = `/rollouts/${rolloutId}/packet`;
  const auth = await getSupabaseServerAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    redirect(`/auth/continue?next=${encodeURIComponent(nextPath)}`);
  }

  const allowed = await userCanAccessRollout(rolloutId, user.id);
  if (!allowed) {
    return null;
  }

  const supabase = getServiceRoleSupabase();

  const [{ data: rollout, error: rolloutError }, { data: artifactRows, error: artifactError }] = await Promise.all([
    supabase
      .from("rollouts")
      .select(
        "id, primary_goal, adoption_state, sensitivity_anchor, leadership_posture, " +
        "rollout_mode, guardrail_strictness, review_depth, policy_tone, maturity_state, " +
        "primary_risk_driver, needs_stabilization, sensitivity_tier, " +
        "initiative_lead_name, initiative_lead_title, approving_authority_name, approving_authority_title, created_at"
      )
      .eq("id", rolloutId)
      .single(),
    supabase
      .from("artifacts")
      .select("id, artifact_type, version, content_json, created_at")
      .eq("rollout_id", rolloutId)
      .order("artifact_type", { ascending: true })
      .order("version", { ascending: false }),
  ]);

  if (rolloutError || !rollout || artifactError) {
    return null;
  }

  const latestByType = new Map<string, ArtifactRow>();
  for (const row of (artifactRows ?? []) as ArtifactRow[]) {
    if (!latestByType.has(row.artifact_type)) {
      latestByType.set(row.artifact_type, row);
    }
  }

  return {
    rollout: rollout as unknown as RolloutMeta,
    artifacts: ARTIFACT_ORDER.map((type) => latestByType.get(type)).filter((row): row is ArtifactRow => Boolean(row)),
  };
}

function PacketSection({
  artifact,
  rollout,
}: {
  artifact: ArtifactRow;
  rollout: RolloutMeta;
}) {
  const json = artifact.content_json ?? {};

  return (
    <section className={styles.packetSection}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>Document</p>
          <h2 className={styles.sectionTitle}>{ARTIFACT_TITLES[artifact.artifact_type]}</h2>
        </div>
        <div className={styles.sectionMeta}>
          <span>v{artifact.version}</span>
          <span>{formatDate(artifact.created_at)}</span>
        </div>
      </div>
      <p className={styles.sectionSummary}>{ARTIFACT_SUMMARIES[artifact.artifact_type]}</p>
      {renderArtifactContent(artifact.artifact_type, json, rollout)}
    </section>
  );
}

function FieldGrid({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <div className={styles.fieldGrid}>
      {rows.map(([label, value]) => (
        <div key={label} className={styles.fieldCard}>
          <div className={styles.fieldLabel}>{label}</div>
          <div className={styles.fieldValue}>{typeof value === "boolean" ? (value ? "Yes" : "No") : formatEnumDisplay(value)}</div>
        </div>
      ))}
    </div>
  );
}

function renderList(items: Array<{ label?: string; value?: unknown }>) {
  return (
    <ul className={styles.ruleList}>
      {items.map((item, index) => {
        const values = Array.isArray(item.value) ? item.value : [item.value];
        return values.map((value, subIndex) => (
          <li key={`${index}-${subIndex}`} className={styles.ruleItem}>
            <span className={styles.ruleBullet} />
            <span>
              {item.label ? <strong>{item.label}: </strong> : null}
              {String(value ?? "")}
            </span>
          </li>
        ));
      })}
    </ul>
  );
}

function renderArtifactContent(type: ArtifactType, json: Record<string, unknown>, rollout: RolloutMeta) {
  switch (type) {
    case "PROFILE":
      return (
        <>
          <FieldGrid
            rows={[
              ["Primary Goal", json.primary_goal],
              ["Adoption State", json.adoption_state],
              ["Sensitivity", json.sensitivity_anchor],
              ["Leadership Posture", json.leadership_posture],
              ["Maturity State", json.maturity_state],
              ["Needs Stabilization", json.needs_stabilization],
            ]}
          />
          <div className={styles.narrativeBlock}>
            <div className={styles.fieldLabel}>Primary Risk Driver</div>
            <div className={styles.longValue}>{String(json.primary_risk_driver ?? "-")}</div>
          </div>
        </>
      );

    case "GUARDRAILS": {
      const sections = Array.isArray(json.sections) ? (json.sections as Array<{ title: string; items: Array<{ label: string; zone: string }> }>) : [];
      return (
        <>
          <FieldGrid rows={[["Strictness", json.guardrail_strictness], ["Sensitivity Tier", rollout.sensitivity_tier]]} />
          {json.context_note ? <div className={styles.callout}>{String(json.context_note)}</div> : null}
          {sections.map((section) => (
            <div key={section.title} className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>{section.title}</h3>
              <div className={styles.zoneList}>
                {section.items.map((item) => (
                  <div key={`${section.title}-${item.label}`} className={styles.zoneRow}>
                    <span className={`${styles.zoneBadge} ${styles[`zone_${item.zone}` as keyof typeof styles]}`}>{formatEnumDisplay(item.zone)}</span>
                    <span className={styles.zoneText}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      );
    }

    case "REVIEW_MODEL":
    case "POLICY": {
      const sections = Array.isArray(json.sections) ? (json.sections as Array<{ id: string; title: string; items: Array<{ label?: string; value?: unknown }> }>) : [];
      return (
        <>
          <FieldGrid
            rows={type === "REVIEW_MODEL" ? [["Review Depth", json.review_depth]] : [["Policy Tone", json.policy_tone]]}
          />
          {sections.map((section) => (
            <div key={section.id} className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>{section.title}</h3>
              {renderList(section.items)}
            </div>
          ))}
        </>
      );
    }

    case "ROLLOUT_PLAN": {
      const sections = Array.isArray(json.sections)
        ? (json.sections as Array<{ id: string; title: string; items?: Array<{ label?: string; value?: unknown }>; phases?: Array<{ phase: number; name: string; entry_criteria: string; exit_criteria: string }> }>)
        : [];
      return (
        <>
          <FieldGrid rows={[["Mode", json.rollout_mode], ["Stabilization Required", json.needs_stabilization]]} />
          {sections.map((section) => (
            <div key={section.id} className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>{section.title}</h3>
              {section.id === "phase_structure" ? (
                <div className={styles.phaseList}>
                  {(section.phases ?? []).map((phase) => (
                    <div key={phase.phase} className={styles.phaseCard}>
                      <div className={styles.phaseNumber}>{phase.phase === 0 ? "S" : phase.phase}</div>
                      <div>
                        <div className={styles.phaseTitle}>{phase.name}</div>
                        <p className={styles.phaseBody}><strong>Enter:</strong> {phase.entry_criteria}</p>
                        <p className={styles.phaseBody}><strong>Exit:</strong> {phase.exit_criteria}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                renderList(section.items ?? [])
              )}
            </div>
          ))}
        </>
      );
    }
  }
}

export default async function RolloutPacketPage({
  params,
}: {
  params: Promise<{ rolloutId: string }>;
}) {
  const { rolloutId } = await params;
  const packet = await loadPacketData(rolloutId);

  if (!packet) {
    notFound();
  }

  const { rollout, artifacts } = packet;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <PrintActions rolloutId={rolloutId} />

        <section className={styles.cover}>
          <div className={styles.coverHeader}>
            <div>
              <p className={styles.kicker}>DeploySure</p>
              <h1 className={styles.title}>AI Governance Framework Packet</h1>
            </div>
            <div className={styles.coverBadge}>{formatEnumDisplay(rollout.rollout_mode)}</div>
          </div>

          <p className={styles.intro}>
            This packet records the current governance position for the rollout and consolidates the generated framework
            documents into a print-ready format.
          </p>

          <div className={styles.metaGrid}>
            <div className={styles.metaCard}>
              <div className={styles.fieldLabel}>Prepared For</div>
              <div className={styles.metaValue}>{personLine(rollout.initiative_lead_name, rollout.initiative_lead_title, "Initiative Lead")}</div>
            </div>
            <div className={styles.metaCard}>
              <div className={styles.fieldLabel}>Approved By</div>
              <div className={styles.metaValue}>{personLine(rollout.approving_authority_name, rollout.approving_authority_title, "Approving Authority")}</div>
            </div>
            <div className={styles.metaCard}>
              <div className={styles.fieldLabel}>Effective Date</div>
              <div className={styles.metaValue}>{formatDate(rollout.created_at)}</div>
            </div>
            <div className={styles.metaCard}>
              <div className={styles.fieldLabel}>Reference ID</div>
              <div className={styles.metaValue}><code>{rollout.id}</code></div>
            </div>
          </div>

          <FieldGrid
            rows={[
              ["Primary Goal", rollout.primary_goal],
              ["Sensitivity Tier", rollout.sensitivity_tier],
              ["Review Depth", rollout.review_depth],
              ["Policy Tone", rollout.policy_tone],
              ["Maturity State", rollout.maturity_state],
              ["Needs Stabilization", rollout.needs_stabilization],
            ]}
          />
        </section>

        <section className={styles.contents}>
          <h2 className={styles.contentsTitle}>Included Documents</h2>
          <div className={styles.contentsList}>
            {artifacts.map((artifact, index) => (
              <div key={artifact.id} className={styles.contentsItem}>
                <span className={styles.contentsIndex}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <div className={styles.contentsItemTitle}>{ARTIFACT_TITLES[artifact.artifact_type]}</div>
                  <div className={styles.contentsItemBody}>{ARTIFACT_SUMMARIES[artifact.artifact_type]}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {artifacts.map((artifact) => (
          <PacketSection key={artifact.id} artifact={artifact} rollout={rollout} />
        ))}

        <footer className={styles.footer}>
          This document records the current governance stance for this rollout. It is intended as an internal operating
          packet and should be reviewed alongside existing firm obligations and controls.
        </footer>
      </div>
    </main>
  );
}
