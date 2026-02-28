import { validateDecisionInputs } from "@/decision-engine/options";
import { evaluateDecision } from "@/decision-engine/engine";
import { getServiceRoleSupabase } from "@/lib/supabase-server";

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

/**
 * Build a compact, structured decision snapshot for DB storage.
 * This is NOT a narrative trace. It's a stable, queryable object.
 */
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

  const snapshot = {
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

  return snapshot;
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
  const result = evaluateDecision(inputs);

  const decision_trace = buildDecisionTraceSnapshot({
    inputs,
    outputs: result.output,
    trace: result.trace,
  });

  const supabase = getServiceRoleSupabase();

  // Insert rollout (including decision_trace snapshot)
  const rolloutInsert = await supabase
    .from("rollouts")
    .insert({
      primary_goal: inputs.primary_goal,
      adoption_state: inputs.adoption_state,
      sensitivity_anchor: inputs.sensitivity_anchor,
      leadership_posture: inputs.leadership_posture,
      rollout_mode: result.output.rollout_mode,
      guardrail_strictness: result.output.guardrail_strictness,
      review_depth: result.output.review_depth,
      policy_tone: result.output.policy_tone,
      maturity_state: result.output.maturity_state,
      primary_risk_driver: result.output.primary_risk_driver,
      needs_stabilization: result.output.needs_stabilization,
      decision_trace,
    })
    .select("*")
    .single();

  if (rolloutInsert.error) {
    return Response.json(
      { ok: false, stage: "insert_rollout", error: rolloutInsert.error },
      { status: 500 }
    );
  }

  const rollout = rolloutInsert.data;

  // Fetch milestone templates
  const milestoneFetch = await supabase
    .from("milestones")
    .select("id")
    .order("order_index", { ascending: true });

  if (milestoneFetch.error) {
    return Response.json(
      { ok: false, stage: "fetch_milestones", error: milestoneFetch.error },
      { status: 500 }
    );
  }

  const milestones = milestoneFetch.data ?? [];

  // Seed rollout_milestone_state
  // The first milestone (order_index=1) starts IN_PROGRESS; all others start LOCKED.
  const seedRows = milestones.map((m, i) => ({
    rollout_id:      rollout.id,
    milestone_id:    m.id,
    status:          i === 0 ? "IN_PROGRESS" : "LOCKED",
    checklist_state: {},
    notes:           null,
  }));

  if (seedRows.length > 0) {
    const seedInsert = await supabase.from("rollout_milestone_state").insert(seedRows);
    if (seedInsert.error) {
      return Response.json(
        {
          ok: false,
          stage: "seed_rollout_milestone_state",
          error: seedInsert.error,
          rollout_created: rollout,
          note: "Rollout was created but milestone seeding failed (non-transactional flow).",
        },
        { status: 500 }
      );
    }
  }

  return Response.json(
    {
      ok: true,
      rollout,
      output: result.output,
      trace: result.trace,
      seeded_milestones: seedRows.length,
    },
    { status: 201 }
  );
}
