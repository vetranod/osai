import { getServiceRoleSupabase } from "@/lib/supabase-server";

export type UserRolloutSummary = {
  id: string;
  status: string | null;
  archived_at: string | null;
  archive_restart_used_at: string | null;
};

export async function findLatestRolloutForUser(userId: string): Promise<UserRolloutSummary | null> {
  const supabase = getServiceRoleSupabase();
  const { data, error } = await supabase
    .from("rollouts")
    .select("id, status, archived_at, archive_restart_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data?.length) return null;

  const active = data.find((row) => row.archived_at === null && row.status !== "ARCHIVED");
  if (active) {
    return {
      id: active.id,
      status: active.status ?? null,
      archived_at: active.archived_at ?? null,
      archive_restart_used_at: active.archive_restart_used_at ?? null,
    };
  }

  const latest = data[0];
  return latest
    ? {
        id: latest.id,
        status: latest.status ?? null,
        archived_at: latest.archived_at ?? null,
        archive_restart_used_at: latest.archive_restart_used_at ?? null,
      }
    : null;
}

export async function userCanAccessRollout(rolloutId: string, userId: string): Promise<boolean> {
  const supabase = getServiceRoleSupabase();
  const { data, error } = await supabase
    .from("rollouts")
    .select("id, user_id, decision_trace")
    .eq("id", rolloutId)
    .maybeSingle();

  if (error) return false;
  if (!data?.id) return false;

  if (data.user_id === userId) return true;

  const traceUserId =
    data.decision_trace &&
    typeof data.decision_trace === "object" &&
    "payment" in data.decision_trace &&
    data.decision_trace.payment &&
    typeof data.decision_trace.payment === "object" &&
    "user_id" in data.decision_trace.payment
      ? data.decision_trace.payment.user_id
      : null;

  return traceUserId === userId;
}
