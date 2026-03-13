import { notFound, redirect } from "next/navigation";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import { getServiceRoleSupabase } from "@/lib/supabase-server";
import { userCanAccessRollout } from "@/server/rolloutAccess";
import RolloutDashboardClient from "./RolloutDashboardClient";

type MilestoneStatus =
  | "LOCKED"
  | "IN_PROGRESS"
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "ACTIVATED"
  | "PAUSED"
  | "INVALIDATED";

type MilestoneCode = "M1" | "M2" | "M3" | "M4";
type ArtifactType = "PROFILE" | "GUARDRAILS" | "REVIEW_MODEL" | "ROLLOUT_PLAN" | "POLICY";

type Milestone = {
  milestone_id: number;
  code: MilestoneCode;
  order_index: number;
  status: MilestoneStatus;
};

type Artifact = {
  artifact_type: ArtifactType;
  generated: boolean;
  id: string | null;
  version: number | null;
  content_json: Record<string, unknown> | null;
  content_markdown: string | null;
  unlocked_by_milestone_id: number | null;
  created_at: string | null;
};

type RolloutMeta = {
  id: string;
  primary_goal: string;
  adoption_state: string;
  sensitivity_anchor: string;
  leadership_posture: string;
  rollout_mode: string;
  sensitivity_tier: string;
  needs_stabilization: boolean;
  initiative_lead_name: string | null;
  initiative_lead_title: string | null;
  approving_authority_name: string | null;
  approving_authority_title: string | null;
  created_at: string | null;
  status: string | null;
  archived_at: string | null;
  archive_restart_used_at: string | null;
};

const ARTIFACT_TYPE_ORDER: ArtifactType[] = [
  "PROFILE",
  "GUARDRAILS",
  "REVIEW_MODEL",
  "ROLLOUT_PLAN",
  "POLICY",
];

async function loadInitialDashboardData(rolloutId: string): Promise<{
  milestones: Milestone[];
  artifacts: Artifact[];
  rolloutMeta: RolloutMeta;
}> {
  const supabase = getServiceRoleSupabase();

  const [rolloutRes, milestoneStateRes, artifactRowsRes] = await Promise.all([
    supabase
      .from("rollouts")
      .select(
        "id, primary_goal, adoption_state, sensitivity_anchor, leadership_posture, " +
        "rollout_mode, sensitivity_tier, needs_stabilization, " +
        "initiative_lead_name, initiative_lead_title, " +
        "approving_authority_name, approving_authority_title, " +
        "created_at, status, archived_at, archive_restart_used_at"
      )
      .eq("id", rolloutId)
      .single(),
    supabase
      .from("rollout_milestone_state")
      .select("milestone_id, status")
      .eq("rollout_id", rolloutId),
    supabase
      .from("artifacts")
      .select("id, artifact_type, version, content_json, created_at")
      .eq("rollout_id", rolloutId)
      .order("artifact_type", { ascending: true })
      .order("version", { ascending: false }),
  ]);

  if (rolloutRes.error || !rolloutRes.data) {
    notFound();
  }
  if (milestoneStateRes.error) {
    throw new Error(`Failed to fetch milestone state: ${milestoneStateRes.error.message}`);
  }
  if (artifactRowsRes.error) {
    throw new Error(`Failed to fetch artifacts: ${artifactRowsRes.error.message}`);
  }

  const rolloutRow = rolloutRes.data as unknown as RolloutMeta;

  const milestoneIds = Array.from(
    new Set((milestoneStateRes.data ?? []).map((row) => row.milestone_id).filter((id) => Number.isInteger(id)))
  );

  const milestoneMetaById = new Map<number, { code: MilestoneCode; order_index: number }>();
  if (milestoneIds.length > 0) {
    const milestoneMetaRes = await supabase
      .from("milestones")
      .select("id, code, order_index")
      .in("id", milestoneIds);

    if (milestoneMetaRes.error) {
      throw new Error(`Failed to fetch milestone metadata: ${milestoneMetaRes.error.message}`);
    }

    for (const row of milestoneMetaRes.data ?? []) {
      if (
        typeof row.id === "number" &&
        typeof row.code === "string" &&
        typeof row.order_index === "number"
      ) {
        milestoneMetaById.set(row.id, {
          code: row.code as MilestoneCode,
          order_index: row.order_index,
        });
      }
    }
  }

  const milestones: Milestone[] = (milestoneStateRes.data ?? [])
    .map((row) => {
      const meta = milestoneMetaById.get(row.milestone_id);
      return {
        milestone_id: row.milestone_id,
        code: meta?.code ?? "M1",
        order_index: meta?.order_index ?? 0,
        status: row.status as MilestoneStatus,
      };
    })
    .sort((a, b) => a.order_index - b.order_index);

  const latestByType = new Map<string, (typeof artifactRowsRes.data)[number]>();
  for (const row of artifactRowsRes.data ?? []) {
    if (!latestByType.has(row.artifact_type)) {
      latestByType.set(row.artifact_type, row);
    }
  }

  const artifacts: Artifact[] = ARTIFACT_TYPE_ORDER.map((type) => {
    const row = latestByType.get(type);
    return {
      artifact_type: type,
      generated: Boolean(row),
      id: row?.id ?? null,
      version: row?.version ?? null,
      content_json: (row?.content_json as Record<string, unknown> | null | undefined) ?? null,
      content_markdown: null,
      unlocked_by_milestone_id: null,
      created_at: row?.created_at ?? null,
    };
  });

  const rolloutMeta: RolloutMeta = {
    id: rolloutRow.id,
    primary_goal: rolloutRow.primary_goal,
    adoption_state: rolloutRow.adoption_state,
    sensitivity_anchor: rolloutRow.sensitivity_anchor,
    leadership_posture: rolloutRow.leadership_posture,
    rollout_mode: rolloutRow.rollout_mode,
    sensitivity_tier: rolloutRow.sensitivity_tier,
    needs_stabilization: rolloutRow.needs_stabilization,
    initiative_lead_name: rolloutRow.initiative_lead_name,
    initiative_lead_title: rolloutRow.initiative_lead_title,
    approving_authority_name: rolloutRow.approving_authority_name,
    approving_authority_title: rolloutRow.approving_authority_title,
    created_at: rolloutRow.created_at,
    status: rolloutRow.status,
    archived_at: rolloutRow.archived_at,
    archive_restart_used_at: rolloutRow.archive_restart_used_at,
  };

  return {
    milestones,
    artifacts,
    rolloutMeta,
  };
}

export default async function RolloutDashboardPage({
  params,
}: {
  params: Promise<{ rolloutId: string }>;
}) {
  const { rolloutId } = await params;
  const nextPath = `/rollouts/${rolloutId}`;

  const auth = await getSupabaseServerAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}&auth_error=session_required`);
  }

  const allowed = await userCanAccessRollout(rolloutId, user.id);
  if (!allowed) {
    notFound();
  }

  const initialData = await loadInitialDashboardData(rolloutId);

  return (
    <RolloutDashboardClient
      rolloutId={rolloutId}
      initialMilestones={initialData.milestones}
      initialArtifacts={initialData.artifacts}
      initialRolloutMeta={initialData.rolloutMeta}
      initialReclassifications={[]}
    />
  );
}
