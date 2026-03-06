import { getServiceRoleSupabase } from "@/lib/supabase-server";

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
