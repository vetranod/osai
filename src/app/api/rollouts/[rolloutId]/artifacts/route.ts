// src/app/api/rollouts/[rolloutId]/artifacts/route.ts
//
// GET /api/rollouts/:rolloutId/artifacts
//
// Returns all artifacts for a rollout, latest version only per artifact type.
// Ordered by artifact_type enum sort order (PROFILE, GUARDRAILS, REVIEW_MODEL,
// ROLLOUT_PLAN, POLICY).

import { z } from "zod";
import { getServiceRoleSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  rolloutId: z.string().uuid(),
});

// Canonical display order matches the artifact_type enum sort order in the DB.
const ARTIFACT_TYPE_ORDER = [
  "PROFILE",
  "GUARDRAILS",
  "REVIEW_MODEL",
  "ROLLOUT_PLAN",
  "POLICY",
] as const;

type ArtifactType = (typeof ARTIFACT_TYPE_ORDER)[number];

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ rolloutId: string }> }
): Promise<Response> {
  const paramsRaw = await ctx.params;
  const paramsParsed = ParamsSchema.safeParse(paramsRaw);
  if (!paramsParsed.success) {
    return Response.json(
      { ok: false, error: "Invalid route params", details: paramsParsed.error.flatten() },
      { status: 400 }
    );
  }

  const { rolloutId } = paramsParsed.data;
  const supabase = getServiceRoleSupabase();

  // Fetch all artifact rows for this rollout
  const { data, error } = await supabase
    .from("artifacts")
    .select("id, artifact_type, version, content_json, content_markdown, unlocked_by_milestone_id, created_at")
    .eq("rollout_id", rolloutId)
    .order("artifact_type", { ascending: true })
    .order("version",       { ascending: false });

  if (error) {
    return Response.json(
      { ok: false, error: "Failed to fetch artifacts", details: error.message },
      { status: 500 }
    );
  }

  const rows = data ?? [];

  // Keep only the latest version per artifact_type
  const latestByType = new Map<string, typeof rows[number]>();
  for (const row of rows) {
    if (!latestByType.has(row.artifact_type)) {
      latestByType.set(row.artifact_type, row);
    }
  }

  // Return in canonical order; include null entries for types not yet generated
  const artifacts = ARTIFACT_TYPE_ORDER.map((type: ArtifactType) => {
    const row = latestByType.get(type) ?? null;
    return {
      artifact_type:            type,
      generated:                row !== null,
      id:                       row?.id                       ?? null,
      version:                  row?.version                  ?? null,
      content_json:             row?.content_json             ?? null,
      content_markdown:         row?.content_markdown         ?? null,
      unlocked_by_milestone_id: row?.unlocked_by_milestone_id ?? null,
      created_at:               row?.created_at               ?? null,
    };
  });

  return Response.json(
    {
      ok:         true,
      rollout_id: rolloutId,
      artifacts,
    },
    { status: 200 }
  );
}
