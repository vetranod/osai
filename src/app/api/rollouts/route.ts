import { validateDecisionInputs } from "@/decision-engine/options";
import { evaluateDecision } from "@/decision-engine/engine";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import { createRolloutFromInputs, type IdentityFields } from "@/server/rolloutCreation";

export const runtime = "nodejs";

const IDENTITY_FIELDS = [
  "initiative_lead_name",
  "initiative_lead_title",
  "approving_authority_name",
  "approving_authority_title",
] as const;

function extractIdentityFields(raw: Record<string, unknown>): IdentityFields {
  const out: IdentityFields = {};
  for (const key of IDENTITY_FIELDS) {
    const val = raw[key];
    if (typeof val === "string" && val.trim().length > 0) {
      out[key] = val.trim().replace(/\s+/g, " ").replace(/[\r\n]/g, "").slice(0, 120);
    }
  }
  return out;
}

export async function POST(request: Request): Promise<Response> {
  const auth = await getSupabaseServerAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return Response.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateDecisionInputs(body);
  if (!validation.ok) {
    return Response.json(validation, { status: 400 });
  }

  const inputs = validation.value;
  const outputPreview = evaluateDecision(inputs).output;
  const identityFields = extractIdentityFields(body as Record<string, unknown>);

  if (outputPreview.sensitivity_tier === "REGULATED") {
    const missing = IDENTITY_FIELDS.filter((k) => !identityFields[k]);
    if (missing.length > 0) {
      return Response.json(
        {
          ok: false,
          message: "Regulated-tier rollouts require ownership fields before they can be saved.",
          fields_required: missing,
        },
        { status: 400 }
      );
    }
  }

  return Response.json(
    {
      ok: false,
      message: "Direct rollout creation is disabled. Start from checkout or the approved demo flow instead.",
      output_preview: outputPreview,
      identity_fields_received: Object.keys(identityFields),
    },
    { status: 403 }
  );
}
