import { getServiceRoleSupabase } from "@/lib/supabase-server";
import { generateArtifactsForMilestone } from "@/governance/artifacts/generateArtifactsForMilestone";

export const runtime = "nodejs";

// Max lengths per constraint policy
const MAX_LEN = 120;

function normalizeField(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\r\n]/g, "");
  return trimmed.length === 0 ? null : trimmed;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ rolloutId: string }> }
): Promise<Response> {
  const { rolloutId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ ok: false, message: "Body must be an object." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  const initiative_lead_name      = normalizeField(raw.initiative_lead_name);
  const initiative_lead_title     = normalizeField(raw.initiative_lead_title);
  const approving_authority_name  = normalizeField(raw.approving_authority_name);
  const approving_authority_title = normalizeField(raw.approving_authority_title);

  // Length checks
  const fields: [string, string | null][] = [
    ["initiative_lead_name", initiative_lead_name],
    ["initiative_lead_title", initiative_lead_title],
    ["approving_authority_name", approving_authority_name],
    ["approving_authority_title", approving_authority_title],
  ];
  for (const [name, val] of fields) {
    if (val !== null && val.length > MAX_LEN) {
      return Response.json(
        { ok: false, message: `${name} exceeds ${MAX_LEN} characters.` },
        { status: 400 }
      );
    }
  }

  // Paired completeness: initiative lead
  if ((initiative_lead_name === null) !== (initiative_lead_title === null)) {
    return Response.json(
      { ok: false, message: "Provide both initiative_lead_name and initiative_lead_title, or neither." },
      { status: 400 }
    );
  }

  // Paired completeness: approving authority
  if ((approving_authority_name === null) !== (approving_authority_title === null)) {
    return Response.json(
      { ok: false, message: "Provide both approving_authority_name and approving_authority_title, or neither." },
      { status: 400 }
    );
  }

  const supabase = getServiceRoleSupabase();

  // Fetch rollout to check tier
  const { data: rollout, error: fetchError } = await supabase
    .from("rollouts")
    .select("id, sensitivity_tier")
    .eq("id", rolloutId)
    .single();

  if (fetchError || !rollout) {
    return Response.json({ ok: false, message: "Rollout not found." }, { status: 404 });
  }

  // Regulated tier: all four fields required
  if (rollout.sensitivity_tier === "REGULATED") {
    if (!initiative_lead_name || !initiative_lead_title || !approving_authority_name || !approving_authority_title) {
      return Response.json(
        {
          ok: false,
          message: "All four identity fields are required for regulated-tier rollouts.",
          fields_required: [
            "initiative_lead_name",
            "initiative_lead_title",
            "approving_authority_name",
            "approving_authority_title",
          ],
        },
        { status: 400 }
      );
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("rollouts")
    .update({
      initiative_lead_name,
      initiative_lead_title,
      approving_authority_name,
      approving_authority_title,
    })
    .eq("id", rolloutId)
    .select("id, initiative_lead_name, initiative_lead_title, approving_authority_name, approving_authority_title, sensitivity_tier")
    .single();

  if (updateError || !updated) {
    return Response.json(
      { ok: false, message: "Failed to save identity fields.", error: updateError },
      { status: 500 }
    );
  }

  // Generate M1 documents (Governance Profile + Usage Guardrails) now that
  // identity fields are saved. Fetch all milestone state rows and find M1 by code.
  // Note: PostgREST does not support .eq() filters on joined tables in this client
  // version, so we fetch all rows and filter in application code.
  const { data: milestoneRows } = await supabase
    .from("rollout_milestone_state")
    .select("milestone_id, milestones!inner(code)")
    .eq("rollout_id", rolloutId);

  const m1Row = (milestoneRows ?? []).find(
    (r: any) => (r.milestones as { code: string } | null)?.code === "M1"
  );

  if (m1Row?.milestone_id) {
    // Non-fatal — if generation fails the rollout is still valid.
    // The dashboard will show documents as soon as they exist.
    await generateArtifactsForMilestone(rolloutId, m1Row.milestone_id, "M1");
  }

  return Response.json({ ok: true, rollout: updated });
}
