import { z } from "zod";

import { validateDecisionInputs } from "@/decision-engine/options";
import { evaluateDecision } from "@/decision-engine/engine";
import { getServiceRoleSupabase } from "@/lib/supabase-server";
import { computeIsLoosening, computeChangedFields } from "@/governance/reclassification/proposalAnalysis";

export const runtime = "nodejs";

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
  const { event_type, patch } = bodyParsed.data;

  const supabase = getServiceRoleSupabase();

  const rolloutFetch = await supabase
    .from("rollouts")
    .select(
      "id, primary_goal, adoption_state, sensitivity_anchor, leadership_posture, " +
      "rollout_mode, guardrail_strictness, review_depth, policy_tone, maturity_state, " +
      "primary_risk_driver, needs_stabilization, decision_trace"
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

  return Response.json(
    {
      ok: true,
      rollout_id: rolloutId,
      reclassification_id: row?.reclassification_id ?? null,
      event_type,
      changed_fields,
      is_loosening,
      proposed_inputs: inputs,
      proposed_outputs: result.output,
      proposed_trace,
    },
    { status: 201 }
  );
}
