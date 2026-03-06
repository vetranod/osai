import { z } from "zod";

import { validateDecisionInputs } from "@/decision-engine/options";
import { evaluateDecision } from "@/decision-engine/engine";
import { getServiceRoleSupabase } from "@/lib/supabase-server";
import { computeIsLoosening, computeChangedFields } from "@/governance/reclassification/proposalAnalysis";
import { requireRolloutAccess } from "@/server/requestAuth";
import {
  computeMilestoneImpacts,
  milestoneDecisionTable,
  normalizeMilestoneSummary as normalizeMilestoneSummaryBase,
  requiresMilestoneAdjustment,
  summarizeMilestoneImpact,
  type MilestoneImpact,
  type MilestoneStateSummary,
} from "@/governance/reclassification/milestoneImpactPolicy";

export const runtime = "nodejs";

const GetParamsSchema = z.object({
  rolloutId: z.string().uuid(),
});

async function ensureRolloutAccess(
  request: Request,
  rolloutId: string
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const access = await requireRolloutAccess(request, rolloutId);
  if (!access.ok) return access;
  return { ok: true };
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ rolloutId: string }> }
): Promise<Response> {
  const paramsRaw = await ctx.params;
  const paramsParsed = GetParamsSchema.safeParse(paramsRaw);
  if (!paramsParsed.success) {
    return Response.json(
      { ok: false, message: "Invalid route params.", details: paramsParsed.error.flatten() },
      { status: 400 }
    );
  }

  const { rolloutId } = paramsParsed.data;
  const access = await ensureRolloutAccess(request, rolloutId);
  if (!access.ok) return access.response;
  const supabase = getServiceRoleSupabase();

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from("rollout_milestone_state")
    .select("status, milestones!inner(code, order_index)")
    .eq("rollout_id", rolloutId);

  if (milestoneError) {
    return Response.json(
      { ok: false, stage: "fetch_milestone_state", error: milestoneError.message },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("reclassification_events")
    .select(
      "id, event_type, status, created_at, changed_fields, is_loosening, " +
      "acknowledged_at, acknowledged_by, applied_at, prior_snapshot, " +
      "proposed_inputs, proposed_outputs, computed_outputs, milestone_impacts, apply_allowed"
    )
    .eq("rollout_id", rolloutId)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      { ok: false, stage: "fetch_reclassifications", error: error.message },
      { status: 500 }
    );
  }

  const currentMilestones = normalizeMilestoneSummary(
    (milestoneRows ?? []) as Array<{ status: string; milestones: { code: string; order_index: number } | { code: string; order_index: number }[] | null }>
  );

  type ReclassificationEventRow = {
    id: string;
    event_type: string;
    status: string;
    created_at: string;
    changed_fields: string[];
    is_loosening: boolean;
    acknowledged_at: string | null;
    acknowledged_by: string | null;
    applied_at: string | null;
    prior_snapshot: Record<string, unknown> | null;
    proposed_inputs: Record<string, unknown> | null;
    proposed_outputs: Record<string, unknown> | null;
    computed_outputs: Record<string, unknown> | null;
    milestone_impacts: unknown;
    apply_allowed: boolean | null;
  };

  return Response.json({
    ok: true,
    reclassifications: ((data ?? []) as unknown as ReclassificationEventRow[]).map((row) => {
      const storedImpacts = normalizeStoredMilestoneImpacts(row.milestone_impacts);
      const milestone_impacts = storedImpacts ?? computeMilestoneImpacts({
        changedInputFields: Array.isArray(row.changed_fields) ? row.changed_fields : [],
        priorOutputs: extractOutputs(row.prior_snapshot) ?? {},
        proposedOutputs: extractOutputs({ outputs: row.proposed_outputs ?? row.computed_outputs }) ?? {},
        currentMilestones,
      });

      return {
        ...row,
        apply_allowed: typeof row.apply_allowed === "boolean" ? row.apply_allowed : !row.is_loosening,
        milestone_impacts,
        requires_milestone_adjustment: requiresMilestoneAdjustment(milestone_impacts),
        milestone_impact_summary: row.is_loosening
          ? [
              "Apply is blocked in V1 because this proposal loosens controls.",
              "Archive + Restart is required instead of changing milestone state mid-cycle.",
            ]
          : milestone_impacts.map(summarizeMilestoneImpact),
        policy_table: milestoneDecisionTable(),
      };
    }),
  });
}

type TraceStep = Readonly<{
  step: string;
  notes: string[];
}>;

function parseBoolNote(step: TraceStep | undefined, key: string): boolean | null {
  if (!step) return null;
  const prefix = `${key}=`;
  const line = step.notes.find((n) => n.startsWith(prefix));
  if (!line) return null;
  const v = line.slice(prefix.length).trim();
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

function parseNumberNote(step: TraceStep | undefined, key: string): number | null {
  if (!step) return null;
  const prefix = `${key}=`;
  const line = step.notes.find((n) => n.startsWith(prefix));
  if (!line) return null;
  const raw = line.slice(prefix.length).trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseStringNote(step: TraceStep | undefined, key: string): string | null {
  if (!step) return null;
  const prefix = `${key}=`;
  const line = step.notes.find((n) => n.startsWith(prefix));
  if (!line) return null;
  return line.slice(prefix.length).trim();
}

function normalizeMilestoneSummary(
  rows: Array<{ status: string; milestones: { code: string; order_index: number } | { code: string; order_index: number }[] | null }>
): MilestoneStateSummary[] {
  return normalizeMilestoneSummaryBase(
    rows.map((row) => {
      const raw = row.milestones;
      const milestone = Array.isArray(raw) ? (raw[0] ?? null) : raw;
      return {
        code: milestone?.code,
        order_index: milestone?.order_index,
        status: row.status,
      };
    })
  );
}

function extractOutputs(
  source: unknown
): Record<string, unknown> | null {
  if (!source || typeof source !== "object") return null;
  const maybeOutputs = "outputs" in source && source.outputs && typeof source.outputs === "object"
    ? source.outputs
    : source;

  if (!maybeOutputs || typeof maybeOutputs !== "object") return null;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(maybeOutputs)) {
    if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function normalizeStoredMilestoneImpacts(raw: unknown): MilestoneImpact[] | null {
  if (!Array.isArray(raw)) return null;
  const impacts = raw.filter((entry) => entry && typeof entry === "object").map((entry) => {
    const item = entry as Record<string, unknown>;
    return {
      milestone_code: String(item.milestone_code ?? ""),
      current_status: String(item.current_status ?? ""),
      recommended_action: String(item.recommended_action ?? ""),
      reason: String(item.reason ?? ""),
      changed_fields: Array.isArray(item.changed_fields) ? item.changed_fields.map(String) : [],
    };
  }).filter((entry) =>
    entry.milestone_code &&
    entry.current_status &&
    entry.recommended_action &&
    entry.reason
  ) as MilestoneImpact[];

  return impacts.length > 0 ? impacts : null;
}

function buildDecisionTraceSnapshot(args: {
  inputs: {
    primary_goal: string;
    adoption_state: string;
    sensitivity_anchor: string;
    leadership_posture: string;
  };
  outputs: {
    rollout_mode: string;
    guardrail_strictness: string;
    review_depth: string;
    policy_tone: string;
    maturity_state: string;
    primary_risk_driver: string;
    needs_stabilization: boolean;
    sensitivity_tier: string;
  };
  trace: TraceStep[];
}): Record<string, unknown> {
  const { inputs, outputs, trace } = args;

  const riskFloor = trace.find((t) => t.step === "1_risk_floor");
  const goalMod = trace.find((t) => t.step === "2_goal_modifier");
  const baseSpeed = trace.find((t) => t.step === "3_base_speed");
  const speedAdj = trace.find((t) => t.step === "4_speed_adjust");
  const ceiling = trace.find((t) => t.step === "5_sensitivity_speed_ceiling");
  const split = trace.find((t) => t.step === "6_split_deployment_trigger");

  const applied = {
    floors: {
      strictness_floor: parseStringNote(riskFloor, "guardrail_strictness_floor"),
      review_floor: parseStringNote(riskFloor, "review_depth_floor"),
    },
    goal_modifiers: {
      strictness_modifier: parseNumberNote(goalMod, "strictness_modifier"),
      review_modifier: parseNumberNote(goalMod, "review_modifier"),
      leadership_modifier_review_only: parseNumberNote(goalMod, "leadership_modifier(review_only)"),
    },
    speed: {
      base_speed_level: parseNumberNote(baseSpeed, "base_speed_level"),
      speed_delta: parseNumberNote(speedAdj, "speed_delta"),
      combined_speed_level: parseNumberNote(ceiling, "combined_speed_level"),
      sensitivity_ceiling: parseNumberNote(ceiling, "sensitivity_ceiling"),
      capped_speed_level: parseNumberNote(ceiling, "capped_speed_level"),
    },
    split_deployment: {
      highSensitivity: parseBoolNote(split, "highSensitivity"),
      highAdoption: parseBoolNote(split, "highAdoption"),
      movingQuickly: parseBoolNote(split, "movingQuickly"),
      triggered: parseBoolNote(split, "triggered"),
    },
  };

  return {
    v: 1,
    inputs,
    applied,
    outputs: {
      rollout_mode: outputs.rollout_mode,
      guardrail_strictness: outputs.guardrail_strictness,
      review_depth: outputs.review_depth,
      policy_tone: outputs.policy_tone,
      maturity_state: outputs.maturity_state,
      primary_risk_driver: outputs.primary_risk_driver,
      sensitivity_tier: outputs.sensitivity_tier,
    },
    flags: {
      needs_stabilization: outputs.needs_stabilization,
    },
  };
}

const ParamsSchema = z.object({
  rolloutId: z.string().uuid(),
});

const BodySchema = z.object({
  event_type: z.enum(["POSTURE", "SENSITIVITY", "GOAL"]),
  patch: z.object({
    primary_goal: z.string().optional(),
    adoption_state: z.string().optional(),
    sensitivity_anchor: z.string().optional(),
    leadership_posture: z.string().optional(),
  }),
});

export async function POST(
  request: Request,
  ctx: { params: Promise<{ rolloutId: string }> }
): Promise<Response> {
  const paramsRaw = await ctx.params;
  const paramsParsed = ParamsSchema.safeParse(paramsRaw);
  if (!paramsParsed.success) {
    return Response.json(
      { ok: false, message: "Invalid route params.", details: paramsParsed.error.flatten() },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const bodyParsed = BodySchema.safeParse(body);
  if (!bodyParsed.success) {
    return Response.json(
      { ok: false, message: "Invalid body.", details: bodyParsed.error.flatten() },
      { status: 400 }
    );
  }

  const { rolloutId } = paramsParsed.data;
  const access = await ensureRolloutAccess(request, rolloutId);
  if (!access.ok) return access.response;
  const { event_type, patch } = bodyParsed.data;

  const supabase = getServiceRoleSupabase();

  const rolloutState = await supabase
    .from("rollouts")
    .select("status")
    .eq("id", rolloutId)
    .single();

  if (rolloutState.error) {
    return Response.json(
      { ok: false, stage: "fetch_rollout_status", error: rolloutState.error.message },
      { status: 500 }
    );
  }

  if (rolloutState.data?.status === "ARCHIVED") {
    return Response.json(
      { ok: false, message: "Archived rollouts cannot be reclassified." },
      { status: 409 }
    );
  }

  const rolloutFetch = await supabase
    .from("rollouts")
    .select(
      "id, primary_goal, adoption_state, sensitivity_anchor, leadership_posture, " +
      "rollout_mode, guardrail_strictness, review_depth, policy_tone, maturity_state, " +
      "primary_risk_driver, needs_stabilization, sensitivity_tier, decision_trace"
    )
    .eq("id", rolloutId)
    .single();

  if (rolloutFetch.error) {
    return Response.json(
      { ok: false, stage: "fetch_rollout", error: rolloutFetch.error },
      { status: 500 }
    );
  }

  type RolloutRow = {
    id: string;
    primary_goal: string;
    adoption_state: string;
    sensitivity_anchor: string;
    leadership_posture: string;
    rollout_mode: string;
    guardrail_strictness: string;
    review_depth: string;
    policy_tone: string;
    maturity_state: string;
    primary_risk_driver: string;
    needs_stabilization: boolean;
    sensitivity_tier: string;
    decision_trace: Record<string, unknown>;
  };

  const rollout = rolloutFetch.data as unknown as RolloutRow;

  // Capture current state as prior_snapshot before applying any changes
  const prior_snapshot = {
    inputs: {
      primary_goal:       rollout.primary_goal,
      adoption_state:     rollout.adoption_state,
      sensitivity_anchor: rollout.sensitivity_anchor,
      leadership_posture: rollout.leadership_posture,
    },
    outputs: {
      rollout_mode:         rollout.rollout_mode,
      guardrail_strictness: rollout.guardrail_strictness,
      review_depth:         rollout.review_depth,
      policy_tone:          rollout.policy_tone,
      maturity_state:       rollout.maturity_state,
      primary_risk_driver:  rollout.primary_risk_driver,
      needs_stabilization:  rollout.needs_stabilization,
      sensitivity_tier:     rollout.sensitivity_tier,
    },
    decision_trace: rollout.decision_trace,
  };

  const mergedInputs = {
    primary_goal:       patch.primary_goal       ?? rollout.primary_goal,
    adoption_state:     patch.adoption_state     ?? rollout.adoption_state,
    sensitivity_anchor: patch.sensitivity_anchor ?? rollout.sensitivity_anchor,
    leadership_posture: patch.leadership_posture ?? rollout.leadership_posture,
  };

  const validation = validateDecisionInputs(mergedInputs);
  if (!validation.ok) {
    return Response.json(validation, { status: 400 });
  }

  const inputs = validation.value;
  const result = evaluateDecision(inputs);

  const proposed_trace = buildDecisionTraceSnapshot({
    inputs,
    outputs: result.output,
    trace: result.trace,
  });

  // Compute loosening and changed fields — pure, no DB.
  // prior_snapshot values come from the DB as plain strings; cast to the
  // engine's strict enum types which are guaranteed by the DB constraints.
  const is_loosening = computeIsLoosening(
    {
      inputs:  prior_snapshot.inputs  as typeof inputs,
      outputs: prior_snapshot.outputs as typeof result.output,
    },
    { inputs, outputs: result.output }
  );

  const changed_fields = computeChangedFields(
    prior_snapshot.inputs as typeof inputs,
    inputs
  );

  const milestoneState = await supabase
    .from("rollout_milestone_state")
    .select("status, milestones!inner(code, order_index)")
    .eq("rollout_id", rolloutId);

  if (milestoneState.error) {
    return Response.json(
      { ok: false, stage: "fetch_milestone_state", error: milestoneState.error.message },
      { status: 500 }
    );
  }

  const currentMilestones = normalizeMilestoneSummary(
    (milestoneState.data ?? []) as Array<{ status: string; milestones: { code: string; order_index: number } | { code: string; order_index: number }[] | null }>
  );
  const apply_allowed = !is_loosening;
  const milestone_impacts = is_loosening
    ? []
    : computeMilestoneImpacts({
        changedInputFields: changed_fields,
        priorOutputs: extractOutputs(prior_snapshot) ?? {},
        proposedOutputs: extractOutputs({ outputs: result.output }) ?? {},
        currentMilestones,
      });
  const requires_milestone_adjustment = requiresMilestoneAdjustment(milestone_impacts);

  const rpc = await supabase.rpc("osai_create_reclassification_proposal", {
    p_rollout_id:      rolloutId,
    p_event_type:      event_type,
    p_prior_snapshot:  prior_snapshot,
    p_proposed_inputs: inputs,
    p_proposed_outputs: result.output,
    p_proposed_trace:  proposed_trace,
    p_is_loosening:    is_loosening,
    p_changed_fields:  changed_fields,
  });

  if (rpc.error) {
    const status = rpc.error.code === "23505" ? 409 : 500;
    return Response.json(
      { ok: false, stage: "create_proposal", error: rpc.error },
      { status }
    );
  }

  const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;

  const { data: updatedProposal, error: updateProposalError } = await supabase
    .from("reclassification_events")
    .update({
      apply_allowed,
      computed_outputs: result.output,
      milestone_impacts,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row?.reclassification_id ?? "")
    .eq("rollout_id", rolloutId)
    .select("id")
    .maybeSingle();

  if (updateProposalError || !updatedProposal) {
    return Response.json(
      { ok: false, stage: "update_reclassification_metadata", error: updateProposalError?.message ?? "Proposal metadata update failed" },
      { status: 500 }
    );
  }

  return Response.json(
    {
      ok: true,
      rollout_id: rolloutId,
      reclassification_id: row?.reclassification_id ?? null,
      event_type,
      changed_fields,
      is_loosening,
      apply_allowed,
      milestone_impacts,
      requires_milestone_adjustment,
      milestone_impact_summary: is_loosening
        ? [
            "Apply is blocked in V1 because this proposal loosens controls.",
            "Archive + Restart is required instead of changing milestone state mid-cycle.",
          ]
        : milestone_impacts.map(summarizeMilestoneImpact),
      proposed_inputs: inputs,
      proposed_outputs: result.output,
      proposed_trace,
      policy_table: milestoneDecisionTable(),
    },
    { status: 201 }
  );
}
