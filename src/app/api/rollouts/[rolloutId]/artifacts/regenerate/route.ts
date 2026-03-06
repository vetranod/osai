// POST /api/rollouts/:rolloutId/artifacts/regenerate
//
// Backfill missing artifacts for any milestone that has reached CONFIRMED or
// ACTIVATED but whose expected artifacts were never inserted (e.g. due to an
// error during an earlier generation attempt, or a rollout created before the
// on-unlock generation was introduced).
//
// Non-destructive: skips artifact types that already have at least one row.
// Safe to call repeatedly.

import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { generateArtifactsForMilestone } from "@/governance/artifacts/generateArtifactsForMilestone";
import type { ArtifactType } from "@/governance/artifacts/generateArtifactsForMilestone";
import { normalizeJoinedMilestone } from "@/governance/milestones/normalizeMilestoneJoin";
import { requireRolloutAccess } from "@/server/requestAuth";

export const runtime = "nodejs";

const MILESTONE_ARTIFACT_MAP: Readonly<Record<string, ArtifactType[]>> = {
  M1: ["PROFILE", "GUARDRAILS"],
  M2: ["REVIEW_MODEL"],
  M3: ["ROLLOUT_PLAN"],
  M4: ["POLICY"],
};

// Include IN_PROGRESS: a milestone may have been unlocked and its artifacts
// never generated (e.g. if the RPC errored mid-flight during activation).
const GENERATE_STATUSES = new Set(["IN_PROGRESS", "AWAITING_CONFIRMATION", "CONFIRMED", "ACTIVATED"]);

const ParamsSchema = z.object({
  rolloutId: z.string().uuid(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ rolloutId: string }> }
) {
  const paramsRaw = await ctx.params;
  const parsed = ParamsSchema.safeParse(paramsRaw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid route params" },
      { status: 400 }
    );
  }

  const { rolloutId } = parsed.data;
  const access = await requireRolloutAccess(req, rolloutId);
  if (!access.ok) return access.response;

  // Fetch all milestone states with their codes
  const { data: milestoneRows, error: msErr } = await supabaseAdmin
    .from("rollout_milestone_state")
    .select("milestone_id, status, milestones!inner(code)")
    .eq("rollout_id", rolloutId);

  if (msErr) {
    return NextResponse.json(
      { ok: false, error: "Failed to fetch milestones", details: msErr.message },
      { status: 500 }
    );
  }

  // Fetch all existing artifact types for this rollout (just need the type, not content)
  const { data: existingArtifacts, error: artErr } = await supabaseAdmin
    .from("artifacts")
    .select("artifact_type")
    .eq("rollout_id", rolloutId);

  if (artErr) {
    return NextResponse.json(
      { ok: false, error: "Failed to fetch existing artifacts", details: artErr.message },
      { status: 500 }
    );
  }

  const existingTypes = new Set((existingArtifacts ?? []).map((a: { artifact_type: string }) => a.artifact_type));

  const generated: ArtifactType[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  for (const row of milestoneRows ?? []) {
    const status = row.status as string;
    if (!GENERATE_STATUSES.has(status)) continue;

    const code = normalizeJoinedMilestone<{ code: string }>(row.milestones)?.code;
    if (!code) continue;

    const expectedTypes = MILESTONE_ARTIFACT_MAP[code];
    if (!expectedTypes || expectedTypes.length === 0) continue;

    const missingTypes = expectedTypes.filter((t) => !existingTypes.has(t));
    if (missingTypes.length === 0) {
      skipped.push(...expectedTypes.map((t) => `${t} (already exists)`));
      continue;
    }

    // Generate only for this milestone — the utility handles all expected types
    // for the milestone code, so we call it and let it check versions internally.
    // Any type that already exists will just get version+1, which is fine.
    // To be precise about skipping, we only call when at least one type is missing.
    const result = await generateArtifactsForMilestone(
      rolloutId,
      row.milestone_id,
      code,
      missingTypes
    );
    generated.push(...result.generated);
    errors.push(...result.errors);

    // Track newly generated types as existing so sibling milestones don't double-generate
    for (const t of result.generated) existingTypes.add(t);
  }

  return NextResponse.json({ ok: true, generated, skipped, errors });
}
