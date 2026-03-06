import { beforeEach, describe, expect, it, vi } from "vitest";

const rolloutId = "5b45ff74-4835-4f90-a95c-16187e1f6c01";
const requireRolloutAccess = vi.fn();

vi.mock("@/server/requestAuth", () => ({
  requireRolloutAccess,
}));

function createRolloutsBuilder(statusRow: unknown, rolloutRow: unknown) {
  let callCount = 0;

  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => {
          callCount += 1;
          return callCount === 1
            ? { data: statusRow, error: null }
            : { data: rolloutRow, error: null };
        }),
      })),
    })),
  };
}

function createMilestoneBuilder(rows: unknown) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(async () => ({ data: rows, error: null })),
    })),
  };
}

function createReclassificationBuilder() {
  const maybeSingle = vi.fn(async () => ({ data: { id: "reclass-1" }, error: null }));
  const selectAfterUpdate = vi.fn(() => ({ maybeSingle }));
  const eqAfterSecond = vi.fn(() => ({ select: selectAfterUpdate }));
  const eqAfterFirst = vi.fn(() => ({ eq: eqAfterSecond }));
  const update = vi.fn(() => ({ eq: eqAfterFirst }));

  return {
    update,
    __update: update,
    __eqAfterFirst: eqAfterFirst,
    __eqAfterSecond: eqAfterSecond,
    __selectAfterUpdate: selectAfterUpdate,
    __maybeSingle: maybeSingle,
  };
}

describe("POST /api/rollouts/:rolloutId/reclassifications", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireRolloutAccess.mockResolvedValue({
      ok: true,
      user: { id: "user-1" },
    });
  });

  it("persists computed outputs and milestone impacts for a proposal", async () => {
    const rollouts = createRolloutsBuilder(
      { status: "ACTIVE" },
      {
        id: rolloutId,
        primary_goal: "MARKETING_CONTENT",
        adoption_state: "MULTIPLE_REGULAR",
        sensitivity_anchor: "INTERNAL_BUSINESS_INFO",
        leadership_posture: "MOVE_QUICKLY",
        rollout_mode: "FAST",
        guardrail_strictness: "MODERATE",
        review_depth: "STANDARD",
        policy_tone: "EMPOWERING",
        maturity_state: "OPPORTUNISTIC",
        primary_risk_driver: "Marketing content",
        needs_stabilization: false,
        sensitivity_tier: "LOW",
        decision_trace: {},
      }
    );

    const milestoneRows = [
      { status: "ACTIVATED", milestones: { code: "M1", order_index: 1 } },
      { status: "ACTIVATED", milestones: { code: "M2", order_index: 2 } },
      { status: "ACTIVATED", milestones: { code: "M3", order_index: 3 } },
      { status: "LOCKED", milestones: { code: "M4", order_index: 4 } },
    ];
    const milestoneState = createMilestoneBuilder(milestoneRows);
    const reclassifications = createReclassificationBuilder();

    const rpc = vi.fn(async () => ({
      data: [{ reclassification_id: "reclass-1" }],
      error: null,
    }));

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "rollouts") return rollouts;
        if (table === "rollout_milestone_state") return milestoneState;
        if (table === "reclassification_events") return reclassifications;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc,
    };

    vi.doMock("@/lib/supabase-server", () => ({
      getServiceRoleSupabase: () => supabase,
    }));

    const mod = await import("./route");
    const req = new Request(`http://localhost/api/rollouts/${rolloutId}/reclassifications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event_type: "POSTURE",
        patch: {
          leadership_posture: "CAUTIOUS",
        },
      }),
    });

    const res = await mod.POST(req, {
      params: Promise.resolve({ rolloutId }),
    } as any);

    expect(res.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("osai_create_reclassification_proposal", expect.objectContaining({
      p_rollout_id: rolloutId,
      p_event_type: "POSTURE",
    }));

    expect(reclassifications.__update).toHaveBeenCalledWith(expect.objectContaining({
      apply_allowed: true,
      computed_outputs: expect.objectContaining({
        rollout_mode: expect.any(String),
        policy_tone: expect.any(String),
      }),
      milestone_impacts: expect.arrayContaining([
        expect.objectContaining({
          milestone_code: "M2",
          recommended_action: "INVALIDATED",
        }),
      ]),
    }));

    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      reclassification_id: "reclass-1",
      apply_allowed: true,
      requires_milestone_adjustment: true,
    });
    expect(json.milestone_impact_summary).toEqual(
      expect.arrayContaining([expect.stringContaining("M2"), expect.stringContaining("invalidated")])
    );
  });
});
