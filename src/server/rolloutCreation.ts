import { evaluateDecision } from "@/decision-engine/engine";
import type { DecisionInputs } from "@/decision-engine/options";
import { generateArtifactsForMilestone } from "@/governance/artifacts/generateArtifactsForMilestone";
import { getServiceRoleSupabase } from "@/lib/supabase-server";

type TraceStep = Readonly<{
  step: string;
  notes: string[];
}>;

export type IdentityFields = Partial<
  Record<
    | "initiative_lead_name"
    | "initiative_lead_title"
    | "approving_authority_name"
    | "approving_authority_title",
    string
  >
>;

type PaymentMeta = {
  provider: "stripe" | "demo";
  checkout_session_id: string;
  payment_status: string;
  user_id?: string | null;
};

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
  inputs: DecisionInputs;
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
  payment?: PaymentMeta;
}): Record<string, unknown> {
  const { inputs, outputs, trace, payment } = args;

  const riskFloor = trace.find((t) => t.step === "1_risk_floor");
  const goalMod = trace.find((t) => t.step === "2_goal_modifier");
  const baseSpeed = trace.find((t) => t.step === "3_base_speed");
  const speedAdj = trace.find((t) => t.step === "4_speed_adjust");
  const ceiling = trace.find((t) => t.step === "5_sensitivity_speed_ceiling");
  const split = trace.find((t) => t.step === "6_split_deployment_trigger");

  const snapshot: Record<string, unknown> = {
    v: 1,
    inputs,
    applied: {
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
    },
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

  if (payment) snapshot.payment = payment;
  return snapshot;
}

export async function findRolloutByCheckoutSessionId(sessionId: string, userId?: string | null): Promise<string | null> {
  const supabase = getServiceRoleSupabase();
  let query = supabase
    .from("rollouts")
    .select("id")
    .eq("payment_checkout_session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) return null;
  return data?.[0]?.id ?? null;
}

async function rollbackPartialRolloutCreation(rolloutId: string): Promise<void> {
  const supabase = getServiceRoleSupabase();

  // Best-effort cleanup for non-transactional creation steps.
  await supabase.from("artifacts").delete().eq("rollout_id", rolloutId);
  await supabase.from("rollout_milestone_state").delete().eq("rollout_id", rolloutId);
  await supabase.from("rollouts").delete().eq("id", rolloutId);
}

function isMissingCreateRolloutRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || error.message?.includes("osai_create_rollout") === true;
}

async function createRolloutLegacy(args: {
  inputs: DecisionInputs;
  identityFields: IdentityFields;
  payment?: PaymentMeta;
  decision_trace: Record<string, unknown>;
  output: ReturnType<typeof evaluateDecision>["output"];
  trace: ReturnType<typeof evaluateDecision>["trace"];
  generateM1Artifacts: boolean;
}): Promise<{
  rollout: Record<string, unknown>;
  output: ReturnType<typeof evaluateDecision>["output"];
  trace: ReturnType<typeof evaluateDecision>["trace"];
  seeded_milestones: number;
}> {
  const { inputs, identityFields, payment, decision_trace, output, trace, generateM1Artifacts } = args;
  const supabase = getServiceRoleSupabase();
  const rolloutInsert = await supabase
    .from("rollouts")
    .insert({
      primary_goal: inputs.primary_goal,
      adoption_state: inputs.adoption_state,
      sensitivity_anchor: inputs.sensitivity_anchor,
      leadership_posture: inputs.leadership_posture,
      rollout_mode: output.rollout_mode,
      guardrail_strictness: output.guardrail_strictness,
      review_depth: output.review_depth,
      policy_tone: output.policy_tone,
      maturity_state: output.maturity_state,
      primary_risk_driver: output.primary_risk_driver,
      needs_stabilization: output.needs_stabilization,
      sensitivity_tier: output.sensitivity_tier,
      decision_trace,
      user_id: payment?.user_id ?? null,
      payment_checkout_session_id: payment?.checkout_session_id ?? null,
      payment_provider: payment?.provider ?? null,
      payment_status: payment?.payment_status ?? null,
      ...identityFields,
    })
    .select("*")
    .single();

  if (rolloutInsert.error) {
    throw new Error(`Failed to save rollout: ${rolloutInsert.error.message}`);
  }
  const rollout = rolloutInsert.data;

  try {
    const milestoneFetch = await supabase
      .from("milestones")
      .select("id")
      .order("order_index", { ascending: true });
    if (milestoneFetch.error) {
      throw new Error(`Failed to fetch milestone templates: ${milestoneFetch.error.message}`);
    }
    const milestones = milestoneFetch.data ?? [];

    const seedRows = milestones.map((m, i) => ({
      rollout_id: rollout.id,
      milestone_id: m.id,
      status: i === 0 ? "IN_PROGRESS" : "LOCKED",
      checklist_state: {},
      notes: null,
    }));

    if (seedRows.length > 0) {
      const seedInsert = await supabase.from("rollout_milestone_state").insert(seedRows);
      if (seedInsert.error) {
        throw new Error(`Rollout was created but milestone seeding failed: ${seedInsert.error.message}`);
      }
    }

    if (generateM1Artifacts) {
      const m1Row = milestones[0];
      if (m1Row?.id) {
        const artifactResult = await generateArtifactsForMilestone(rollout.id as string, m1Row.id, "M1");
        if (artifactResult.errors.length > 0) {
          throw new Error(`Rollout artifacts failed to initialize: ${artifactResult.errors.join("; ")}`);
        }
      }
    }

    return {
      rollout,
      output,
      trace,
      seeded_milestones: seedRows.length,
    };
  } catch (error) {
    await rollbackPartialRolloutCreation(String(rollout.id)).catch(() => null);
    throw error;
  }
}

export async function createRolloutFromInputs(args: {
  inputs: DecisionInputs;
  identityFields: IdentityFields;
  payment?: PaymentMeta;
  generateM1Artifacts?: boolean;
}): Promise<{
  rollout: Record<string, unknown>;
  output: ReturnType<typeof evaluateDecision>["output"];
  trace: ReturnType<typeof evaluateDecision>["trace"];
  seeded_milestones: number;
}> {
  const { inputs, identityFields, payment, generateM1Artifacts = true } = args;
  const result = evaluateDecision(inputs);

  if (payment?.checkout_session_id) {
    const existingRolloutId = await findRolloutByCheckoutSessionId(payment.checkout_session_id, payment.user_id);
    if (existingRolloutId) {
      const supabase = getServiceRoleSupabase();
      const [{ data: rollout }, { count }] = await Promise.all([
        supabase.from("rollouts").select("*").eq("id", existingRolloutId).single(),
        supabase
          .from("rollout_milestone_state")
          .select("*", { count: "exact", head: true })
          .eq("rollout_id", existingRolloutId),
      ]);

      return {
        rollout: rollout ?? { id: existingRolloutId },
        output: result.output,
        trace: result.trace,
        seeded_milestones: count ?? 0,
      };
    }
  }
  const decision_trace = buildDecisionTraceSnapshot({
    inputs,
    outputs: result.output,
    trace: result.trace,
    payment,
  });

  const supabase = getServiceRoleSupabase();
  const rpc = await supabase.rpc("osai_create_rollout", {
    p_inputs: inputs,
    p_outputs: result.output,
    p_identity_fields: identityFields,
    p_decision_trace: decision_trace,
    p_user_id: payment?.user_id ?? null,
    p_payment_checkout_session_id: payment?.checkout_session_id ?? null,
    p_payment_provider: payment?.provider ?? null,
    p_payment_status: payment?.payment_status ?? null,
  });

  if (rpc.error && !isMissingCreateRolloutRpc(rpc.error)) {
    throw new Error(`Failed to create rollout: ${rpc.error.message}`);
  }

  if (rpc.data) {
    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    const rolloutId = row?.rollout_id as string | undefined;
    const seededMilestones = Number(row?.seeded_milestones ?? 0);

    if (!rolloutId) {
      throw new Error("Rollout creation RPC returned no rollout id.");
    }

    const { data: rollout, error: rolloutError } = await supabase
      .from("rollouts")
      .select("*")
      .eq("id", rolloutId)
      .single();

    if (rolloutError || !rollout) {
      throw new Error(`Rollout was created but could not be loaded: ${rolloutError?.message ?? "missing rollout row"}`);
    }

    if (generateM1Artifacts) {
      const { data: m1Row, error: m1Error } = await supabase
        .from("milestones")
        .select("id")
        .eq("code", "M1")
        .maybeSingle();

      if (m1Error) {
        await rollbackPartialRolloutCreation(rolloutId).catch(() => null);
        throw new Error(`Rollout was created but M1 lookup failed: ${m1Error.message}`);
      }

      if (m1Row?.id) {
        const artifactResult = await generateArtifactsForMilestone(rolloutId, m1Row.id, "M1");
        if (artifactResult.errors.length > 0) {
          await rollbackPartialRolloutCreation(rolloutId).catch(() => null);
          throw new Error(`Rollout artifacts failed to initialize: ${artifactResult.errors.join("; ")}`);
        }
      }
    }

    return {
      rollout,
      output: result.output,
      trace: result.trace,
      seeded_milestones: seededMilestones,
    };
  }

  return createRolloutLegacy({
    inputs,
    identityFields,
    payment,
    decision_trace,
    output: result.output,
    trace: result.trace,
    generateM1Artifacts,
  });
}
