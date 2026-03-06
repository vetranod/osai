import { beforeEach, describe, expect, it, vi } from "vitest";

const rolloutId = "5b45ff74-4835-4f90-a95c-16187e1f6c01";
const reclassId = "82f46335-1be9-4737-a42f-2ca0f9127157";
const requireRolloutAccess = vi.fn();

vi.mock("@/server/requestAuth", () => ({
  requireRolloutAccess,
}));

function createRolloutsBuilder(status = "ACTIVE") {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { status }, error: null })),
      })),
    })),
  };
}

function createEventBuilder(event: unknown) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: event, error: null })),
        })),
      })),
    })),
  };
}

describe("POST /api/rollouts/:rolloutId/reclassifications/:reclassId/apply", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireRolloutAccess.mockResolvedValue({
      ok: true,
      user: { id: "user-1" },
    });
  });

  it("applies through the DB RPC when milestone adjustments are required", async () => {
    const rollouts = createRolloutsBuilder();
    const reclassifications = createEventBuilder({
      id: reclassId,
      rollout_id: rolloutId,
      status: "PROPOSED",
      acknowledged_at: "2026-03-02T10:00:00.000Z",
      acknowledged_by: "Leadership",
      is_loosening: false,
      apply_allowed: true,
      milestone_impacts: [
        {
          milestone_code: "M3",
          current_status: "ACTIVATED",
          recommended_action: "INVALIDATED",
          reason: "Rollout plan changed.",
          changed_fields: ["rollout_mode"],
        },
      ],
      changed_fields: ["leadership_posture"],
      prior_snapshot: null,
      proposed_outputs: null,
      computed_outputs: null,
    });

    const rpc = vi.fn(async () => ({ error: null }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "rollouts") return rollouts;
        if (table === "reclassification_events") return reclassifications;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc,
    };

    vi.doMock("@/lib/supabase-server", () => ({
      getServiceRoleSupabase: () => supabase,
    }));

    const mod = await import("./route");
    const req = new Request(`http://localhost/api/rollouts/${rolloutId}/reclassifications/${reclassId}/apply`, {
      method: "POST",
    });

    const res = await mod.POST(req, {
      params: Promise.resolve({ rolloutId, reclassId }),
    } as any);

    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("osai_apply_reclassification_proposal", {
      p_rollout_id: rolloutId,
      p_reclassification_id: reclassId,
    });
  });

  it("applies when no milestone adjustments are required", async () => {
    const rollouts = createRolloutsBuilder();
    const reclassifications = createEventBuilder({
      id: reclassId,
      rollout_id: rolloutId,
      status: "PROPOSED",
      acknowledged_at: "2026-03-02T10:00:00.000Z",
      acknowledged_by: "Leadership",
      is_loosening: false,
      apply_allowed: true,
      milestone_impacts: [
        {
          milestone_code: "M4",
          current_status: "LOCKED",
          recommended_action: "NONE",
          reason: "No reached milestone requires a state adjustment.",
          changed_fields: ["policy_tone"],
        },
      ],
      changed_fields: [],
      prior_snapshot: null,
      proposed_outputs: null,
      computed_outputs: null,
    });

    const rpc = vi.fn(async () => ({ error: null }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "rollouts") return rollouts;
        if (table === "reclassification_events") return reclassifications;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc,
    };

    vi.doMock("@/lib/supabase-server", () => ({
      getServiceRoleSupabase: () => supabase,
    }));

    const mod = await import("./route");
    const req = new Request(`http://localhost/api/rollouts/${rolloutId}/reclassifications/${reclassId}/apply`, {
      method: "POST",
    });

    const res = await mod.POST(req, {
      params: Promise.resolve({ rolloutId, reclassId }),
    } as any);

    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("osai_apply_reclassification_proposal", {
      p_rollout_id: rolloutId,
      p_reclassification_id: reclassId,
    });
  });

  it("surfaces stale milestone-state failures from the DB function clearly", async () => {
    const rollouts = createRolloutsBuilder();
    const reclassifications = createEventBuilder({
      id: reclassId,
      rollout_id: rolloutId,
      status: "PROPOSED",
      acknowledged_at: "2026-03-02T10:00:00.000Z",
      acknowledged_by: "Leadership",
      is_loosening: false,
      apply_allowed: true,
      milestone_impacts: [
        {
          milestone_code: "M4",
          current_status: "LOCKED",
          recommended_action: "NONE",
          reason: "No reached milestone requires a state adjustment.",
          changed_fields: ["policy_tone"],
        },
      ],
      changed_fields: [],
      prior_snapshot: null,
      proposed_outputs: null,
      computed_outputs: null,
    });

    const rpc = vi.fn(async () => ({
      error: {
        message: "Cannot apply: milestone M3 changed since proposal was reviewed (expected CONFIRMED, found ACTIVATED)",
      },
    }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "rollouts") return rollouts;
        if (table === "reclassification_events") return reclassifications;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc,
    };

    vi.doMock("@/lib/supabase-server", () => ({
      getServiceRoleSupabase: () => supabase,
    }));

    const mod = await import("./route");
    const req = new Request(`http://localhost/api/rollouts/${rolloutId}/reclassifications/${reclassId}/apply`, {
      method: "POST",
    });

    const res = await mod.POST(req, {
      params: Promise.resolve({ rolloutId, reclassId }),
    } as any);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("Cannot apply: rollout milestone state changed after leadership reviewed this proposal");
    expect(json.details).toContain("changed since proposal was reviewed");
  });
});
