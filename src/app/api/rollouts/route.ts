import { validateDecisionInputs } from "@/decision-engine/options";
import { evaluateDecision } from "@/decision-engine/engine";
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

  try {
    const created = await createRolloutFromInputs({
      inputs,
      identityFields,
      generateM1Artifacts: true,
    });

    return Response.json(
      {
        ok: true,
        rollout: created.rollout,
        output: created.output,
        trace: created.trace,
        seeded_milestones: created.seeded_milestones,
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to save rollout.",
      },
      { status: 500 }
    );
  }
}

