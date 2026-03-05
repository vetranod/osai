import { validateDecisionInputs, type DecisionInputs } from "@/decision-engine/options";
import type { IdentityFields } from "@/server/rolloutCreation";

export type CheckoutPayload = {
  inputs: DecisionInputs;
  identity: IdentityFields;
};

const MAX_LEN = 120;

function normalizeField(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\s+/g, " ").replace(/[\r\n]/g, "");
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_LEN);
}

export function parseCheckoutPayload(body: unknown): { ok: true; value: CheckoutPayload } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be an object." };
  }

  const validation = validateDecisionInputs(body);
  if (!validation.ok) {
    return { ok: false, message: validation.message ?? "Invalid intake values." };
  }

  const raw = body as Record<string, unknown>;
  const identity: IdentityFields = {
    initiative_lead_name: normalizeField(raw.initiative_lead_name) ?? undefined,
    initiative_lead_title: normalizeField(raw.initiative_lead_title) ?? undefined,
    approving_authority_name: normalizeField(raw.approving_authority_name) ?? undefined,
    approving_authority_title: normalizeField(raw.approving_authority_title) ?? undefined,
  };

  const hasLeadName = Boolean(identity.initiative_lead_name);
  const hasLeadTitle = Boolean(identity.initiative_lead_title);
  const hasAuthName = Boolean(identity.approving_authority_name);
  const hasAuthTitle = Boolean(identity.approving_authority_title);

  if (hasLeadName !== hasLeadTitle) {
    return { ok: false, message: "Provide both initiative lead name and title, or neither." };
  }
  if (hasAuthName !== hasAuthTitle) {
    return { ok: false, message: "Provide both approving authority name and title, or neither." };
  }

  return { ok: true, value: { inputs: validation.value, identity } };
}

export function toCheckoutMetadata(payload: CheckoutPayload, userId: string): Record<string, string> {
  return {
    user_id: userId,
    primary_goal: payload.inputs.primary_goal,
    adoption_state: payload.inputs.adoption_state,
    sensitivity_anchor: payload.inputs.sensitivity_anchor,
    leadership_posture: payload.inputs.leadership_posture,
    initiative_lead_name: payload.identity.initiative_lead_name ?? "",
    initiative_lead_title: payload.identity.initiative_lead_title ?? "",
    approving_authority_name: payload.identity.approving_authority_name ?? "",
    approving_authority_title: payload.identity.approving_authority_title ?? "",
  };
}

export function fromCheckoutMetadata(metadata: Record<string, string | null> | null): CheckoutPayload | null {
  if (!metadata) return null;
  const value = {
    primary_goal: metadata.primary_goal ?? "",
    adoption_state: metadata.adoption_state ?? "",
    sensitivity_anchor: metadata.sensitivity_anchor ?? "",
    leadership_posture: metadata.leadership_posture ?? "",
    initiative_lead_name: metadata.initiative_lead_name ?? "",
    initiative_lead_title: metadata.initiative_lead_title ?? "",
    approving_authority_name: metadata.approving_authority_name ?? "",
    approving_authority_title: metadata.approving_authority_title ?? "",
  };
  const parsed = parseCheckoutPayload(value);
  return parsed.ok ? parsed.value : null;
}
