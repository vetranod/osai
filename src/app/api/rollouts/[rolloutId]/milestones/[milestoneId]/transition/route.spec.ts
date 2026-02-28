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
  const queryBuilder = {
    select: vi.fn(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };

  (queryBuilder.select as any).mockReturnValue(queryBuilder);
  
  const supabaseAdmin = {
    from: vi.fn(() => queryBuilder),
    rpc: vi.fn(),
    __queryBuilder: queryBuilder,
  };

  return supabaseAdmin;
}

const supabaseMock = buildSupabaseMock();

vi.mock("@/server/supabaseAdmin", () => {
  return {
    supabaseAdmin: supabaseMock,
  };
});

describe("POST /api/rollouts/:rolloutId/milestones/:milestoneId/transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});