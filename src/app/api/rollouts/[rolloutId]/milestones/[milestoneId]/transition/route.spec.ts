import { describe, it, expect, vi, beforeEach } from "vitest";

type MilestoneStateRow = {
  rollout_id: string;
  milestone_id: number;
  status: string;
};

type RpcRow = {
  updated_milestone_id: number | null;
  unlocked_milestone_id: number | null;
};

const rolloutId = "5b45ff74-4835-4f90-a95c-16187e1f6c01";

function buildSupabaseMock() {
  const queuedResults: Array<unknown> = [];
  const nextResult = () => queuedResults.shift();

  const queryBuilder = {
    select: vi.fn(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    then: vi.fn((resolve) => resolve(nextResult())),
  };

  (queryBuilder.select as any).mockReturnValue(queryBuilder);
  (queryBuilder.maybeSingle as any).mockImplementation(() => Promise.resolve(nextResult()));
  (queryBuilder.single as any).mockImplementation(() => Promise.resolve(nextResult()));
  
  const supabaseAdmin = {
    from: vi.fn(() => queryBuilder),
    rpc: vi.fn(),
    __queryBuilder: queryBuilder,
    __queuedResults: queuedResults,
  };

  return supabaseAdmin;
}

const supabaseMock = buildSupabaseMock();
const generateArtifactsForMilestone = vi.fn();

vi.mock("@/server/supabaseAdmin", () => {
  return {
    supabaseAdmin: supabaseMock,
  };
});

vi.mock("@/governance/artifacts/generateArtifactsForMilestone", () => {
  return {
    generateArtifactsForMilestone,
  };
});

describe("POST /api/rollouts/:rolloutId/milestones/:milestoneId/transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.__queuedResults.length = 0;
    generateArtifactsForMilestone.mockResolvedValue({
      generated: [],
      errors: [],
    });
  });

  it("applies a valid forward transition and calls the RPC with expected args", async () => {
    // Arrange: current milestone status in DB
    (supabaseMock.__queryBuilder.maybeSingle as any).mockResolvedValueOnce({
      data: {
        rollout_id: rolloutId,
        milestone_id: 1,
        status: "LOCKED",
      } satisfies MilestoneStateRow,
      error: null,
    });

    // Arrange: RPC succeeds
    (supabaseMock.rpc as any).mockResolvedValueOnce({
      data: [{ updated_milestone_id: 1, unlocked_milestone_id: null }] satisfies RpcRow[],
      error: null,
    });

    const mod = await import("./route");
    const { POST } = mod;

    const req = new Request(
      `http://localhost:3000/api/rollouts/${rolloutId}/milestones/1/transition`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to_status: "IN_PROGRESS" }),
      }
    );

    const ctx = {
      params: Promise.resolve({ rolloutId, milestoneId: "1" }),
    };

    const res = await POST(req, ctx as any);
    expect(res.status).toBe(200);

    const json = await res.json();

    expect(json).toMatchObject({
      ok: true,
      rollout_id: rolloutId,
      milestone_id: 1,
      from_status: "LOCKED",
      to_status: "IN_PROGRESS",
      unlocked_next_milestone_id: null,
    });

    expect(supabaseMock.from).toHaveBeenCalledWith("rollout_milestone_state");
    expect(supabaseMock.__queryBuilder.select).toHaveBeenCalled();
    expect(supabaseMock.__queryBuilder.eq).toHaveBeenCalledTimes(2);
    expect(supabaseMock.__queryBuilder.maybeSingle).toHaveBeenCalledTimes(1);

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("osai_apply_milestone_transition", {
      p_rollout_id: rolloutId,
      p_milestone_id: 1,
      p_expected_from: "LOCKED",
      p_to: "IN_PROGRESS",
      p_next_milestone_id: null,
    });
  });

  it("blocks an invalid skip transition (does not call RPC)", async () => {
    (supabaseMock.__queryBuilder.maybeSingle as any).mockResolvedValueOnce({
      data: {
        rollout_id: rolloutId,
        milestone_id: 1,
        status: "LOCKED",
      } satisfies MilestoneStateRow,
      error: null,
    });

    const mod = await import("./route");
    const { POST } = mod;

    const req = new Request(
      `http://localhost:3000/api/rollouts/${rolloutId}/milestones/1/transition`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to_status: "CONFIRMED" }),
      }
    );

    const ctx = {
      params: Promise.resolve({ rolloutId, milestoneId: "1" }),
    };

    const res = await POST(req, ctx as any);
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json).toMatchObject({
      error: "Transition not allowed",
      from_status: "LOCKED",
      to_status: "CONFIRMED",
    });

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("recovers activation when unlock is already satisfied and retrying without unlock succeeds", async () => {
    supabaseMock.__queuedResults.push(
      {
        data: {
          rollout_id: rolloutId,
          milestone_id: 2,
          status: "CONFIRMED",
          milestones: { code: "M2", order_index: 2 },
        },
        error: null,
      },
      {
        data: [
          { milestone_id: 1, status: "ACTIVATED", milestones: { order_index: 1 } },
          { milestone_id: 2, status: "CONFIRMED", milestones: { order_index: 2 } },
          { milestone_id: 3, status: "LOCKED", milestones: { order_index: 3 } },
        ],
        error: null,
      },
      {
        data: { status: "CONFIRMED" },
        error: null,
      },
      {
        data: { status: "IN_PROGRESS" },
        error: null,
      },
      {
        data: [
          { milestone_id: 1, status: "ACTIVATED", milestones: { order_index: 1 } },
          { milestone_id: 2, status: "ACTIVATED", milestones: { order_index: 2 } },
          { milestone_id: 3, status: "IN_PROGRESS", milestones: { order_index: 3 } },
        ],
        error: null,
      },
      {
        data: { code: "M3" },
        error: null,
      }
    );

    (supabaseMock.rpc as any)
      .mockResolvedValueOnce({
        data: null,
        error: { message: "unlock conflict" },
      })
      .mockResolvedValueOnce({
        data: [{ updated_milestone_id: 2, unlocked_milestone_id: null }] satisfies RpcRow[],
        error: null,
      });

    generateArtifactsForMilestone.mockResolvedValueOnce({
      generated: ["ROLLOUT_PLAN"],
      errors: [],
    });

    const mod = await import("./route");
    const { POST } = mod;

    const req = new Request(
      `http://localhost:3000/api/rollouts/${rolloutId}/milestones/2/transition`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to_status: "ACTIVATED" }),
      }
    );

    const ctx = {
      params: Promise.resolve({ rolloutId, milestoneId: "2" }),
    };

    const res = await POST(req, ctx as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      rollout_id: rolloutId,
      milestone_id: 2,
      from_status: "CONFIRMED",
      to_status: "ACTIVATED",
      unlocked_next_milestone_id: 3,
      artifacts_generated: ["ROLLOUT_PLAN"],
    });

    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(1, "osai_apply_milestone_transition", {
      p_rollout_id: rolloutId,
      p_milestone_id: 2,
      p_expected_from: "CONFIRMED",
      p_to: "ACTIVATED",
      p_next_milestone_id: 3,
    });

    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(2, "osai_apply_milestone_transition", {
      p_rollout_id: rolloutId,
      p_milestone_id: 2,
      p_expected_from: "CONFIRMED",
      p_to: "ACTIVATED",
      p_next_milestone_id: null,
    });
  });
});
