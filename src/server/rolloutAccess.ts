import { getServiceRoleSupabase } from "@/lib/supabase-server";

export async function userCanAccessRollout(rolloutId: string, userId: string): Promise<boolean> {
  const supabase = getServiceRoleSupabase();
  const { data, error } = await supabase
    .from("rollouts")
    .select("id")
    .eq("id", rolloutId)
    .contains("decision_trace", { payment: { user_id: userId } })
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.id);
}
