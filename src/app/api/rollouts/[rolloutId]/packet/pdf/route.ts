import { existsSync } from "node:fs";

import type { NextRequest } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

import { buildPacketDocumentHtml, type PageFormat } from "@/app/rollouts/[rolloutId]/packet/printDocument";
import type {
  ArtifactRow,
  ArtifactType,
  RolloutMeta,
} from "@/app/rollouts/[rolloutId]/packet/packet-shared";
import { getServiceRoleSupabase } from "@/lib/supabase-server";
import { requireRolloutAccess } from "@/server/requestAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ARTIFACT_TYPE_ORDER: ArtifactType[] = [
  "PROFILE",
  "GUARDRAILS",
  "REVIEW_MODEL",
  "ROLLOUT_PLAN",
  "POLICY",
];

const LOCAL_BROWSER_CANDIDATES = [
  process.env.PACKET_PDF_BROWSER_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);

type PacketExportData = {
  rollout: RolloutMeta;
  artifacts: ArtifactRow[];
};

function isServerlessBrowserEnvironment(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
}

function resolveLocalBrowserExecutablePath(): string | null {
  for (const candidate of LOCAL_BROWSER_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function launchPacketPdfBrowser() {
  if (isServerlessBrowserEnvironment()) {
    return puppeteer.launch({
      args: puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
  }

  const executablePath = resolveLocalBrowserExecutablePath();
  if (!executablePath) {
    throw new Error("No local browser executable was found for PDF export.");
  }

  return puppeteer.launch({
    executablePath,
    headless: true,
  });
}

async function getPacketExportData(rolloutId: string): Promise<PacketExportData | null> {
  const supabase = getServiceRoleSupabase();

  const { data: rolloutRow, error: rolloutError } = await supabase
    .from("rollouts")
    .select(
      "id, primary_goal, adoption_state, sensitivity_anchor, leadership_posture, " +
        "rollout_mode, guardrail_strictness, review_depth, policy_tone, maturity_state, " +
        "primary_risk_driver, sensitivity_tier, needs_stabilization, " +
        "initiative_lead_name, initiative_lead_title, " +
        "approving_authority_name, approving_authority_title, " +
        "created_at"
    )
    .eq("id", rolloutId)
    .single();

  if (rolloutError || !rolloutRow) {
    return null;
  }

  const rollout = rolloutRow as unknown as RolloutMeta;

  const { data: artifactRows, error: artifactError } = await supabase
    .from("artifacts")
    .select("id, artifact_type, version, content_json, created_at")
    .eq("rollout_id", rolloutId)
    .order("artifact_type", { ascending: true })
    .order("version", { ascending: false });

  if (artifactError) {
    throw new Error("Failed to fetch packet artifacts.");
  }

  const latestByType = new Map<string, (typeof artifactRows)[number]>();
  for (const row of artifactRows ?? []) {
    if (!latestByType.has(row.artifact_type)) {
      latestByType.set(row.artifact_type, row);
    }
  }

  const artifacts = ARTIFACT_TYPE_ORDER.map((artifactType) => latestByType.get(artifactType))
    .filter((row): row is NonNullable<typeof artifactRows>[number] => Boolean(row))
    .map(
      (row): ArtifactRow => ({
        artifact_type: row.artifact_type as ArtifactType,
        generated: true,
        id: row.id ?? null,
        version: row.version ?? null,
        content_json: row.content_json ?? null,
        created_at: row.created_at ?? null,
      })
    );

  return {
    rollout,
    artifacts,
  };
}

async function renderPacketPdfBuffer(documentHtml: string, pageFormat: PageFormat): Promise<Buffer> {
  const browser = await launchPacketPdfBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(documentHtml, {
      waitUntil: "networkidle0",
    });

    const pdf = await page.pdf({
      format: pageFormat === "a4" ? "A4" : "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await page.close();
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<unknown> }
): Promise<Response> {
  const params = await context.params;
  if (!params || typeof params !== "object" || !("rolloutId" in params) || typeof params.rolloutId !== "string") {
    return Response.json({ ok: false, message: "Invalid rollout id." }, { status: 400 });
  }

  const { rolloutId } = params;
  const access = await requireRolloutAccess(request, rolloutId);
  if (!access.ok) return access.response;

  try {
    const packetData = await getPacketExportData(rolloutId);
    if (!packetData) {
      return Response.json({ ok: false, message: "Packet not found." }, { status: 404 });
    }

    if (packetData.artifacts.length === 0) {
      return Response.json({ ok: false, message: "Packet is not ready for export yet." }, { status: 409 });
    }

    const rawFormat = new URL(request.url).searchParams.get("format");
    const pageFormat: PageFormat = rawFormat === "a4" ? "a4" : "letter";

    const packetHtml = buildPacketDocumentHtml(packetData.rollout, packetData.artifacts, {
      autoPrint: true,
      pageFormat,
    });

    try {
      const pdfBuffer = await renderPacketPdfBuffer(packetHtml, pageFormat);

      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="fulcral-packet-${rolloutId}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      console.error("Failed to render packet PDF; serving print-ready HTML fallback instead.", error);
      return new Response(packetHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="fulcral-packet-${rolloutId}.html"`,
          "Cache-Control": "no-store",
          "X-DeploySure-Export-Format": "html-fallback",
        },
      });
    }
  } catch (error) {
    console.error("Failed to prepare packet export", error);
    return Response.json({ ok: false, message: "Failed to generate packet." }, { status: 500 });
  }
}
