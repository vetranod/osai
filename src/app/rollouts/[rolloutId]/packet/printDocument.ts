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

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fieldGridHtml(rows: Array<[string, unknown]>): string {
  return `
    <div class="field-grid">
      ${rows
        .map(
          ([label, value]) => `
            <div class="field-row">
              <div class="field-label">${escapeHtml(label)}</div>
              <div class="field-value">${escapeHtml(
                typeof value === "boolean" ? (value ? "Yes" : "No") : formatEnumDisplay(value)
              )}</div>
            </div>`
        )
        .join("")}
    </div>
  `;
}

function renderListHtml(items: Array<{ label?: string; value?: unknown }>): string {
  return `
    <ul class="rule-list">
      ${items
        .flatMap((item) => {
          const values = Array.isArray(item.value) ? item.value : [item.value];
          return values.map(
            (value) => `
              <li class="rule-item">
                <span class="rule-bullet"></span>
                <span>${item.label ? `<strong>${escapeHtml(item.label)}:</strong> ` : ""}${escapeHtml(value)}</span>
              </li>`
          );
        })
        .join("")}
    </ul>
  `;
}

function renderZoneTableHtml(items: Array<{ label: string; zone: string }>): string {
  return `
    <table class="policy-table">
      <thead>
        <tr>
          <th>Classification</th>
          <th>Activity</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
              <tr>
                <td class="policy-table-zone zone-${escapeHtml(item.zone)}">${escapeHtml(formatEnumDisplay(item.zone))}</td>
                <td>${escapeHtml(item.label)}</td>
              </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderArtifactHtml(type: ArtifactType, json: Record<string, unknown>, rollout: RolloutMeta): string {
  switch (type) {
    case "PROFILE":
      return `
        ${fieldGridHtml([
          ["Primary Goal", json.primary_goal],
          ["Adoption State", json.adoption_state],
          ["Sensitivity", json.sensitivity_anchor],
          ["Leadership Posture", json.leadership_posture],
          ["Maturity State", json.maturity_state],
          ["Needs Stabilization", json.needs_stabilization],
        ])}
        <div class="narrative-block">
          <div class="field-label">Primary Risk Driver</div>
          <div class="long-value">${escapeHtml(json.primary_risk_driver)}</div>
        </div>
      `;

    case "GUARDRAILS": {
      const sections = Array.isArray(json.sections)
        ? (json.sections as Array<{ title: string; items: Array<{ label: string; zone: string }> }>)
        : [];
      return `
        ${fieldGridHtml([
          ["Strictness", json.guardrail_strictness],
          ["Sensitivity Tier", rollout.sensitivity_tier],
        ])}
        ${
          json.context_note
            ? `<div class="callout">${escapeHtml(json.context_note)}</div>`
            : ""
        }
        ${sections
          .map(
            (section) => `
              <div class="subsection">
                <h3 class="subsection-title">${escapeHtml(section.title)}</h3>
                ${renderZoneTableHtml(section.items)}
              </div>`
          )
          .join("")}
      `;
    }

    case "REVIEW_MODEL":
    case "POLICY": {
      const sections = Array.isArray(json.sections)
        ? (json.sections as Array<{ id: string; title: string; items: Array<{ label?: string; value?: unknown }> }>)
        : [];
      return `
        ${fieldGridHtml([[type === "REVIEW_MODEL" ? "Review Depth" : "Policy Tone", type === "REVIEW_MODEL" ? json.review_depth : json.policy_tone]])}
        ${sections
          .map(
            (section) => `
              <div class="subsection">
                <h3 class="subsection-title">${escapeHtml(section.title)}</h3>
                ${renderListHtml(section.items)}
              </div>`
          )
          .join("")}
      `;
    }

    case "ROLLOUT_PLAN": {
      const sections = Array.isArray(json.sections)
        ? (json.sections as Array<{
            id: string;
            title: string;
            items?: Array<{ label?: string; value?: unknown }>;
            phases?: Array<{ phase: number; name: string; entry_criteria: string; exit_criteria: string }>;
          }>)
        : [];
      return `
        ${fieldGridHtml([
          ["Mode", json.rollout_mode],
          ["Stabilization Required", json.needs_stabilization],
        ])}
        ${sections
          .map((section) => {
            if (section.id === "phase_structure") {
              return `
                <div class="subsection">
                  <h3 class="subsection-title">${escapeHtml(section.title)}</h3>
                  <div class="phase-list">
                    ${(section.phases ?? [])
                      .map(
                        (phase) => `
                          <div class="phase-card">
                            <div class="phase-number">${phase.phase === 0 ? "S" : escapeHtml(phase.phase)}</div>
                            <div>
                              <div class="phase-title">${escapeHtml(phase.name)}</div>
                              <p class="phase-body"><strong>Enter:</strong> ${escapeHtml(phase.entry_criteria)}</p>
                              <p class="phase-body"><strong>Exit:</strong> ${escapeHtml(phase.exit_criteria)}</p>
                            </div>
                          </div>`
                      )
                      .join("")}
                  </div>
                </div>`;
            }

            return `
              <div class="subsection">
                <h3 class="subsection-title">${escapeHtml(section.title)}</h3>
                ${renderListHtml(section.items ?? [])}
              </div>`;
          })
          .join("")}
      `;
    }
  }
}

function sectionHtml(artifact: ArtifactRow, rollout: RolloutMeta, index: number): string {
  const json = artifact.content_json ?? {};
  return `
    <section class="packet-section">
      <div class="section-header">
        <div>
          <p class="section-eyebrow">Document ${String(index + 1).padStart(2, "0")}</p>
          <h2 class="section-title">${escapeHtml(ARTIFACT_TITLES[artifact.artifact_type])}</h2>
        </div>
        <div class="section-meta">
          <span>Revision ${escapeHtml(artifact.version ?? "-")}</span>
          <span>Issued ${escapeHtml(formatDate(artifact.created_at))}</span>
        </div>
      </div>
      <p class="section-summary">${escapeHtml(ARTIFACT_SUMMARIES[artifact.artifact_type])}</p>
      ${renderArtifactHtml(artifact.artifact_type, json, rollout)}
    </section>
  `;
}

const PRINT_CSS = `
  @page { size: Letter portrait; margin: 14mm 14mm 16mm; }
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #18263a; font-family: "Inter", "Segoe UI", Arial, sans-serif; }
  body { -webkit-font-smoothing: antialiased; }
  .document { width: 100%; }
  .cover, .contents, .packet-section { background: #fff; page-break-inside: avoid; }
  .cover { padding: 28px 0 26px; border-top: 5px solid #17355f; border-bottom: 1px solid #cfd7e2; page-break-after: always; }
  .cover-header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 18px; }
  .kicker, .section-eyebrow { margin: 0 0 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #57708f; }
  .title, .section-title, .contents-title { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #18263a; }
  .title { font-size: 38px; line-height: 1.02; letter-spacing: -0.025em; max-width: 560px; }
  .cover-badge { flex-shrink: 0; padding: 8px 12px; border-radius: 0; background: transparent; border: 1px solid #b8c5d4; color: #23415f; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
  .intro { margin: 0 0 20px; max-width: 720px; font-size: 14px; line-height: 1.75; color: #40556f; }
  .meta-grid, .field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 24px; }
  .meta-grid { margin-bottom: 14px; }
  .meta-row, .field-row { padding: 10px 0 12px; border-top: 1px solid #e1e6ed; }
  .field-label { margin-bottom: 5px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #516984; }
  .field-value, .meta-value { font-size: 14px; line-height: 1.55; color: #18263a; }
  .meta-value code { font-size: 11px; color: #40556f; }
  .contents { padding: 20px 0 8px; margin-top: 16px; page-break-after: always; }
  .contents-title { font-size: 20px; margin-bottom: 14px; }
  .contents-list { display: grid; grid-template-columns: 1fr; gap: 10px; }
  .contents-item { display: grid; grid-template-columns: 38px 1fr; gap: 12px; align-items: start; padding-bottom: 10px; border-bottom: 1px solid #e1e6ed; }
  .contents-index { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 24px; border-radius: 0; background: #17355f; color: #f8fbff; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; }
  .contents-item-title { margin-bottom: 3px; font-size: 13px; font-weight: 700; color: #18263a; }
  .contents-item-body { font-size: 12px; line-height: 1.55; color: #40556f; }
  .packet-section { padding: 16px 0 0; margin-top: 14px; page-break-before: always; }
  .section-header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 10px; }
  .section-title { font-size: 26px; letter-spacing: -0.02em; }
  .section-meta { display: flex; gap: 12px; flex-wrap: wrap; color: #516984; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
  .section-summary { margin: 0 0 16px; padding-bottom: 12px; border-bottom: 1px solid #d7dee8; font-size: 13px; line-height: 1.7; color: #40556f; }
  .subsection { margin-top: 18px; }
  .subsection-title { margin: 0 0 10px; padding-top: 8px; border-top: 1px solid #e1e6ed; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #516984; }
  .callout, .narrative-block { margin-top: 14px; padding: 10px 0 0 14px; border-left: 2px solid #c6d3e2; }
  .callout, .long-value { font-size: 13px; line-height: 1.7; color: #18263a; }
  .rule-list, .phase-list { display: flex; flex-direction: column; gap: 8px; padding: 0; margin: 0; list-style: none; }
  .rule-item { display: flex; gap: 10px; font-size: 13px; line-height: 1.65; color: #18263a; }
  .rule-bullet { width: 6px; height: 6px; margin-top: 7px; flex-shrink: 0; border-radius: 50%; background: #4f6987; }
  .policy-table { width: 100%; border-collapse: collapse; border-top: 1px solid #d7dee8; border-bottom: 1px solid #d7dee8; }
  .policy-table thead th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #516984; border-bottom: 1px solid #d7dee8; }
  .policy-table tbody td { padding: 10px 10px; vertical-align: top; font-size: 13px; line-height: 1.55; color: #18263a; border-top: 1px solid #eef2f6; }
  .policy-table tbody tr:first-child td { border-top: none; }
  .policy-table-zone { width: 120px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #40556f; }
  .zone-SAFE, .zone-RESTRICTED, .zone-HUMAN-ONLY { background: transparent; border: 0; }
  .phase-card { display: grid; grid-template-columns: 44px 1fr; gap: 12px; align-items: start; padding: 10px 0; border-top: 1px solid #e1e6ed; }
  .phase-card:first-child { border-top: 0; }
  .phase-number { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 24px; border-radius: 0; background: #17355f; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; }
  .phase-title { margin-bottom: 4px; font-size: 14px; font-weight: 700; color: #18263a; }
  .phase-body { margin: 0; font-size: 12px; line-height: 1.65; color: #40556f; }
  .footer { margin-top: 18px; padding-top: 18px; border-top: 1px solid #dce3ec; font-size: 11px; line-height: 1.7; color: #526684; }
`;

export function buildPacketDocumentHtml(
  rollout: RolloutMeta,
  artifacts: ArtifactRow[],
  options?: { autoPrint?: boolean }
): string {
  const autoPrint = options?.autoPrint ?? false;
  const contentsHtml = artifacts
    .map(
      (artifact, index) => `
        <div class="contents-item">
          <span class="contents-index">${String(index + 1).padStart(2, "0")}</span>
          <div>
            <div class="contents-item-title">${escapeHtml(ARTIFACT_TITLES[artifact.artifact_type])}</div>
            <div class="contents-item-body">${escapeHtml(ARTIFACT_SUMMARIES[artifact.artifact_type])}</div>
          </div>
        </div>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Governance Framework Packet | ${escapeHtml(rollout.id)}</title>
    <style>${PRINT_CSS}</style>
  </head>
  <body>
    <main class="document">
      <section class="cover">
        <div class="cover-header">
          <div>
            <p class="kicker">DeploySure</p>
            <h1 class="title">AI Governance Framework Packet</h1>
            <p class="intro">Controlled internal reference for AI rollout governance, review, and usage boundaries.</p>
          </div>
          <div class="cover-badge">${escapeHtml(formatEnumDisplay(rollout.rollout_mode))} Rollout</div>
        </div>

        <div class="meta-grid">
          <div class="meta-row">
            <div class="field-label">Prepared For</div>
            <div class="meta-value">${escapeHtml(
              personLine(rollout.initiative_lead_name, rollout.initiative_lead_title, "Initiative Lead")
            )}</div>
          </div>
          <div class="meta-row">
            <div class="field-label">Approved By</div>
            <div class="meta-value">${escapeHtml(
              personLine(rollout.approving_authority_name, rollout.approving_authority_title, "Approving Authority")
            )}</div>
          </div>
          <div class="meta-row">
            <div class="field-label">Effective Date</div>
            <div class="meta-value">${escapeHtml(formatDate(rollout.created_at))}</div>
          </div>
          <div class="meta-row">
            <div class="field-label">Reference ID</div>
            <div class="meta-value"><code>${escapeHtml(rollout.id)}</code></div>
          </div>
        </div>

        ${fieldGridHtml([
          ["Primary Goal", rollout.primary_goal],
          ["Sensitivity Tier", rollout.sensitivity_tier],
          ["Review Depth", rollout.review_depth],
          ["Policy Tone", rollout.policy_tone],
          ["Maturity State", rollout.maturity_state],
          ["Needs Stabilization", rollout.needs_stabilization],
        ])}
      </section>

      <section class="contents">
        <h2 class="contents-title">Included Documents</h2>
        <div class="contents-list">${contentsHtml}</div>
      </section>

      ${artifacts.map((artifact, index) => sectionHtml(artifact, rollout, index)).join("")}

      <footer class="footer">
        This document records the current governance stance for this rollout. It is intended as an internal operating packet and should be reviewed alongside existing firm obligations and controls.
      </footer>
    </main>
    ${
      autoPrint
        ? `<script>
      window.addEventListener("load", () => {
        setTimeout(() => {
          window.print();
        }, 150);
      });
    </script>`
        : ""
    }
  </body>
</html>`;
}
