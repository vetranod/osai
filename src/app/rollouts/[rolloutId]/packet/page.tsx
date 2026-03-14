"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  buildClientAuthHeaders,
  ensureServerSession,
} from "@/lib/browser-auth-client";

import { PrintActions } from "./PrintActions";
import { buildPacketPrintHtml } from "./printDocument";
import {
  ARTIFACT_SUMMARIES,
  ARTIFACT_TITLES,
  formatDate,
  formatEnumDisplay,
  personLine,
  type ArtifactRow,
  type ArtifactType,
  type RolloutMeta,
} from "./packet-shared";
import styles from "./packet.module.css";

function getResponseMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  if ("message" in body && typeof body.message === "string") return body.message;
  if ("error" in body && typeof body.error === "string") return body.error;
  return fallback;
}

async function fetchPacketApi(url: string, nextPath: string, init: RequestInit = {}): Promise<Response> {
  const headers = await buildClientAuthHeaders(init.headers, {
    bridgeMode: "background",
  });

  let response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers,
  });

  if (response.status === 401) {
    const retryToken = await ensureServerSession({ attempts: 3, pauseMs: 200 });
    if (retryToken) {
      const retryHeaders = await buildClientAuthHeaders(init.headers, {
        preferServerToken: true,
      });
      response = await fetch(url, {
        credentials: "include",
        cache: "no-store",
        ...init,
        headers: retryHeaders,
      });
    }
  }

  if (response.status === 401) {
    window.location.assign(`/auth/continue?next=${encodeURIComponent(nextPath)}`);
  }

  return response;
}

function PacketSection({
  artifact,
  rollout,
  sectionNumber,
}: {
  artifact: ArtifactRow;
  rollout: RolloutMeta;
  sectionNumber: string;
}) {
  const json = artifact.content_json ?? {};

  return (
    <section className={styles.packetSection}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>Document {sectionNumber}</p>
          <h2 className={styles.sectionTitle}>{ARTIFACT_TITLES[artifact.artifact_type]}</h2>
        </div>
        <div className={styles.sectionMeta}>
          <span>Revision {artifact.version ?? "-"}</span>
          <span>Issued {formatDate(artifact.created_at)}</span>
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

export default function RolloutPacketPage() {
  const params = useParams<{ rolloutId: string }>();
  const rolloutId = useMemo(
    () => (typeof params?.rolloutId === "string" ? params.rolloutId : ""),
    [params]
  );
  const [rollout, setRollout] = useState<RolloutMeta | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rolloutId) return;

    let cancelled = false;

    async function loadPacket() {
      setLoading(true);
      setLoadError(null);

      const nextPath = `/rollouts/${rolloutId}/packet`;
      const [rolloutRes, artifactsRes] = await Promise.all([
        fetchPacketApi(`/api/rollouts/${rolloutId}`, nextPath),
        fetchPacketApi(`/api/rollouts/${rolloutId}/artifacts`, nextPath),
      ]);

      const rolloutBody = await rolloutRes.json().catch(() => null);
      const artifactsBody = await artifactsRes.json().catch(() => null);

      if (cancelled) return;

      if (!rolloutRes.ok || !artifactsRes.ok) {
        if (rolloutRes.status === 404 || artifactsRes.status === 404) {
          setLoadError("Packet not found.");
        } else {
          setLoadError(
            getResponseMessage(rolloutBody, getResponseMessage(artifactsBody, "Failed to load packet."))
          );
        }
        setLoading(false);
        return;
      }

      const rolloutData =
        rolloutBody &&
        typeof rolloutBody === "object" &&
        "ok" in rolloutBody &&
        rolloutBody.ok === true &&
        "rollout" in rolloutBody &&
        rolloutBody.rollout &&
        typeof rolloutBody.rollout === "object"
          ? (rolloutBody.rollout as RolloutMeta)
          : null;

      const artifactData =
        artifactsBody &&
        typeof artifactsBody === "object" &&
        "ok" in artifactsBody &&
        artifactsBody.ok === true &&
        "artifacts" in artifactsBody &&
        Array.isArray(artifactsBody.artifacts)
          ? (artifactsBody.artifacts as ArtifactRow[])
          : [];

      if (!rolloutData) {
        setLoadError("Failed to load packet.");
        setLoading(false);
        return;
      }

      setRollout(rolloutData);
      setArtifacts(
        artifactData.filter(
          (artifact) => artifact.generated && typeof artifact.artifact_type === "string"
        )
      );
      setLoading(false);
    }

    void loadPacket();
    return () => {
      cancelled = true;
    };
  }, [rolloutId]);

  if (!rolloutId) {
    return null;
  }

  const printHtml =
    rollout && artifacts.length > 0
      ? buildPacketPrintHtml(rollout, artifacts)
      : null;

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.cover}>
            <p className={styles.kicker}>DeploySure</p>
            <h1 className={styles.title}>AI Governance Framework Packet</h1>
            <p className={styles.intro}>Loading packet...</p>
          </section>
        </div>
      </main>
    );
  }

  if (loadError || !rollout) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.cover}>
            <p className={styles.kicker}>DeploySure</p>
            <h1 className={styles.title}>AI Governance Framework Packet</h1>
            <p className={styles.intro}>{loadError ?? "Packet unavailable."}</p>
            <Link href={`/rollouts/${rolloutId}`} className={styles.backLink}>
              Back to dashboard
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <PrintActions rolloutId={rolloutId} printHtml={printHtml} />

        <section className={styles.cover}>
          <div className={styles.coverHeader}>
            <div>
              <p className={styles.kicker}>DeploySure</p>
              <h1 className={styles.title}>AI Governance Framework Packet</h1>
            </div>
            <div className={styles.coverBadge}>{formatEnumDisplay(rollout.rollout_mode)} Rollout</div>
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
              <div key={artifact.id ?? artifact.artifact_type} className={styles.contentsItem}>
                <span className={styles.contentsIndex}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <div className={styles.contentsItemTitle}>{ARTIFACT_TITLES[artifact.artifact_type]}</div>
                  <div className={styles.contentsItemBody}>{ARTIFACT_SUMMARIES[artifact.artifact_type]}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {artifacts.map((artifact, index) => (
          <PacketSection
            key={artifact.id ?? artifact.artifact_type}
            artifact={artifact}
            rollout={rollout}
            sectionNumber={String(index + 1).padStart(2, "0")}
          />
        ))}

        <footer className={styles.footer}>
          This document records the current governance stance for this rollout. It is intended as an internal operating
          packet and should be reviewed alongside existing firm obligations and controls.
        </footer>
      </div>
    </main>
  );
}
