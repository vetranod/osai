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
  html, body { margin: 0; padding: 0; background: #fff; color: #102345; font-family: "Inter", "Segoe UI", Arial, sans-serif; }
  body { -webkit-font-smoothing: antialiased; }
  .document { width: 100%; }
  .cover, .contents, .packet-section { background: #fff; page-break-inside: avoid; }

  .cover { padding: 30px 0 28px; padding-left: 20px; border-top: 3px solid #102345; border-left: 4px solid #17355F; border-bottom: 1px solid #D7DFEB; page-break-after: always; }
  .cover-mark { display: block; margin-bottom: 18px; }
  .cover-header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; margin-bottom: 24px; }
  .kicker { margin: 0 0 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #526684; }
  .title { margin: 0 0 14px; font-family: Georgia, "Times New Roman", serif; font-size: 38px; line-height: 1.04; letter-spacing: -0.02em; max-width: 560px; color: #102345; }
  .cover-badge { flex-shrink: 0; padding: 8px 12px; background: #fff; border: 1px solid #D7DFEB; color: #526684; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
  .intro { margin: 0 0 22px; max-width: 720px; font-size: 13px; line-height: 1.75; color: #526684; }

  .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 32px; row-gap: 0; margin-bottom: 16px; }
  .meta-row { padding: 10px 0; border-bottom: 1px solid #D7DFEB; }
  .field-label { margin-bottom: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #526684; }
  .meta-value { font-size: 13px; line-height: 1.55; color: #102345; }
  .meta-value code { font-size: 11px; color: #526684; font-family: "Courier New", monospace; }

  .field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 32px; row-gap: 0; }
  .field-row { padding: 10px 0; border-bottom: 1px solid #D7DFEB; }
  .field-value { font-size: 13px; line-height: 1.55; color: #102345; }

  .contents { padding: 26px 0 10px; margin-top: 18px; page-break-after: always; }
  .contents-title { margin: 0 0 16px; font-family: Georgia, "Times New Roman", serif; font-size: 20px; color: #102345; padding-bottom: 10px; border-bottom: 1px solid #D7DFEB; }
  .contents-list { display: grid; grid-template-columns: 1fr; gap: 0; }
  .contents-item { display: grid; grid-template-columns: 38px 1fr; gap: 14px; align-items: start; padding: 10px 0; border-bottom: 1px solid #D7DFEB; }
  .contents-index { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 22px; background: #102345; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .contents-item-title { margin-bottom: 3px; font-size: 13px; font-weight: 700; color: #102345; }
  .contents-item-body { font-size: 11px; line-height: 1.55; color: #526684; }

  .packet-section { padding: 20px 0 0; margin-top: 16px; page-break-before: always; }
  .section-header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; padding-bottom: 10px; border-bottom: 1px solid #D7DFEB; margin-bottom: 14px; }
  .section-eyebrow { margin: 0 0 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #526684; }
  .section-title { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: 24px; letter-spacing: -0.02em; color: #102345; }
  .section-meta { display: flex; gap: 14px; flex-wrap: wrap; color: #526684; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; padding-top: 20px; }
  .section-summary { margin: 0 0 18px; font-size: 13px; line-height: 1.75; color: #526684; }

  .subsection { margin-top: 20px; }
  .subsection-title { margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid #D7DFEB; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #526684; }

  .callout { margin-top: 14px; padding: 10px 0 10px 14px; border-left: 3px solid #D7DFEB; font-size: 13px; line-height: 1.7; color: #102345; }
  .narrative-block { margin-top: 14px; padding: 10px 0 10px 14px; border-left: 3px solid #D7DFEB; }
  .long-value { font-size: 13px; line-height: 1.7; color: #102345; }

  .rule-list { display: flex; flex-direction: column; gap: 8px; padding: 0; margin: 0; list-style: none; }
  .phase-list { display: flex; flex-direction: column; gap: 10px; padding: 0; margin: 0; list-style: none; }
  .rule-item { display: flex; gap: 10px; font-size: 13px; line-height: 1.65; color: #102345; }
  .rule-bullet { width: 5px; height: 5px; margin-top: 8px; flex-shrink: 0; background: #526684; }

  .policy-table { width: 100%; border-collapse: collapse; border: 1px solid #D7DFEB; }
  .policy-table thead th { padding: 9px 12px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #fff; background: #102345; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .policy-table tbody td { padding: 9px 12px; vertical-align: top; font-size: 13px; line-height: 1.55; color: #102345; border-top: 1px solid #D7DFEB; }
  .policy-table tbody tr:first-child td { border-top: none; }
  .policy-table-zone { width: 120px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #526684; }
  .zone-SAFE { color: #526684; }
  .zone-RESTRICTED { color: #526684; }
  .zone-HUMAN-ONLY { color: #526684; }

  .phase-card { display: grid; grid-template-columns: 44px 1fr; gap: 14px; align-items: start; padding: 12px; border: 1px solid #D7DFEB; margin-bottom: 8px; }
  .phase-number { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 24px; background: #102345; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .phase-title { margin-bottom: 5px; font-size: 14px; font-weight: 700; font-family: Georgia, "Times New Roman", serif; color: #102345; }
  .phase-body { margin: 0 0 3px; font-size: 11px; line-height: 1.65; color: #526684; }

  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #D7DFEB; font-size: 10px; line-height: 1.7; color: #526684; display: flex; justify-content: space-between; align-items: baseline; gap: 20px; }
  .footer-site { color: #526684; font-weight: 600; flex-shrink: 0; }
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
        <div class="cover-mark">
          <svg width="22" height="24" viewBox="0 0 52 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6 L18 50" stroke="#17355F" stroke-width="4.5" stroke-linecap="round"/>
            <path d="M18 6 L38 6" stroke="#17355F" stroke-width="4.5" stroke-linecap="round"/>
            <circle cx="18" cy="28" r="7" fill="#fff" stroke="#17355F" stroke-width="3.5"/>
            <circle cx="18" cy="28" r="2.8" fill="#526684"/>
          </svg>
        </div>
        <div class="cover-header">
          <div>
            <p class="kicker">Fulcral</p>
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
        <p style="margin: 18px 0 0; font-size: 9px; color: #999;">TEST BUILD 001</p>
      </section>

      <section class="contents">
        <h2 class="contents-title">Included Documents</h2>
        <div class="contents-list">${contentsHtml}</div>
      </section>

      ${artifacts.map((artifact, index) => sectionHtml(artifact, rollout, index)).join("")}

      <footer class="footer">
        <span>This document records the current governance stance for this rollout. It is intended as an internal operating packet and should be reviewed alongside existing firm obligations and controls.</span>
        <span class="footer-site">fulcral.org</span>
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
