import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
const select = vi.fn(() => ({
  eq: vi.fn(() => ({
    order: vi.fn(() => ({
      limit: vi.fn(() => ({
        maybeSingle,
      })),
    })),
  })),
}));

const rolloutStateQuery = {
  select: vi.fn(),
  eq: vi.fn(),
};

const artifactsQuery = {
  select: vi.fn(),
  eq: vi.fn(),
};

const supabaseAdmin = {
  from: vi.fn((table: string) => {
    if (table === "rollout_milestone_state") return rolloutStateQuery;
    if (table === "artifacts") return artifactsQuery;
    throw new Error(`Unexpected table: ${table}`);
  }),
};

vi.mock("@/server/supabaseAdmin", () => ({ supabaseAdmin }));

const generateArtifactsForMilestone = vi.fn();
vi.mock("@/governance/artifacts/generateArtifactsForMilestone", () => ({
  generateArtifactsForMilestone,
}));

const requireRolloutAccess = vi.fn();
vi.mock("@/server/requestAuth", () => ({
  requireRolloutAccess,
}));

describe("POST /api/rollouts/:rolloutId/artifacts/regenerate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRolloutAccess.mockResolvedValue({
      ok: true,
      user: { id: "user-1" },
    });
    rolloutStateQuery.select.mockReturnValue(rolloutStateQuery);
    rolloutStateQuery.eq.mockResolvedValue({
      data: [
        {
          milestone_id: 3,
          status: "IN_PROGRESS",
          milestones: [{ code: "M3" }],
        },
      ],
      error: null,
    });
    artifactsQuery.select.mockReturnValue(artifactsQuery);
    artifactsQuery.eq.mockResolvedValue({
      data: [{ artifact_type: "PROFILE" }],
      error: null,
    });
    generateArtifactsForMilestone.mockResolvedValue({
      generated: ["ROLLOUT_PLAN"],
      errors: [],
    });
  });

  it("handles joined milestone metadata returned as an array", async () => {
    const mod = await import("./route");
    const req = new Request("http://localhost/api/rollouts/5b45ff74-4835-4f90-a95c-16187e1f6c01/artifacts/regenerate", {
      method: "POST",
    });

    const res = await mod.POST(req, {
      params: Promise.resolve({ rolloutId: "5b45ff74-4835-4f90-a95c-16187e1f6c01" }),
    });

    expect(res.status).toBe(200);
    expect(generateArtifactsForMilestone).toHaveBeenCalledWith(
      "5b45ff74-4835-4f90-a95c-16187e1f6c01",
      3,
      "M3",
      ["ROLLOUT_PLAN"]
    );
  });

  it("generates only missing artifact types for a milestone", async () => {
    artifactsQuery.eq.mockResolvedValue({
      data: [{ artifact_type: "PROFILE" }],
      error: null,
    });
    rolloutStateQuery.eq.mockResolvedValue({
      data: [
        {
          milestone_id: 1,
          status: "IN_PROGRESS",
          milestones: { code: "M1" },
        },
      ],
      error: null,
    });

    const mod = await import("./route");
    const req = new Request("http://localhost/api/rollouts/5b45ff74-4835-4f90-a95c-16187e1f6c01/artifacts/regenerate", {
      method: "POST",
    });

    await mod.POST(req, {
      params: Promise.resolve({ rolloutId: "5b45ff74-4835-4f90-a95c-16187e1f6c01" }),
    });

    expect(generateArtifactsForMilestone).toHaveBeenCalledWith(
      "5b45ff74-4835-4f90-a95c-16187e1f6c01",
      1,
      "M1",
      ["GUARDRAILS"]
    );
  });
});
