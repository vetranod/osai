"use server";

import { getServiceRoleSupabase } from "@/lib/supabase-server";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";

function getAdminEmail(): string {
  return (process.env.OSAI_ADMIN_EMAIL ?? "").trim().toLowerCase();
}

export type InviteResult =
  | { ok: true; email: string; note?: "existing_user" }
  | { ok: false; message: string };

export async function sendDemoInvite(email: string): Promise<InviteResult> {
  const supabase = await getSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { ok: false, message: "Authentication required." };
  }

  const adminEmail = getAdminEmail();
  if (!adminEmail || user.email.trim().toLowerCase() !== adminEmail) {
    return { ok: false, message: "Not authorized." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { ok: false, message: "Valid email required." };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.SITE_URL ?? "https://deploysure.com";
  const redirectTo = `${appUrl}/auth/callback?next=/demo/generate`;

  const admin = getServiceRoleSupabase();

  const { data: inviteData, error } = await admin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    { data: { demo_access: true }, redirectTo }
  );

  if (error) {
    // User already has an account — grant demo access and inform the admin.
    // Supabase returns a 422 / "already registered" error in this case.
    try {
      // Look up the existing user via the auth schema (requires service role).
      const { data: existingRow } = await admin
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .schema("auth" as any)
        .from("users")
        .select("id, app_metadata")
        .eq("email", normalizedEmail)
        .maybeSingle<{ id: string; app_metadata: Record<string, unknown> | null }>();

      if (existingRow?.id) {
        await admin.auth.admin.updateUserById(existingRow.id, {
          // Merge to avoid wiping any other existing app_metadata fields.
          app_metadata: { ...(existingRow.app_metadata ?? {}), demo_access: true },
        });
        return { ok: true, email: normalizedEmail, note: "existing_user" };
      }
    } catch {
      // Fall through to the original error if the lookup fails.
    }

    return { ok: false, message: error.message };
  }

  // New invited user — also stamp app_metadata (tamper-proof; only writable via service role).
  if (inviteData.user?.id) {
    await admin.auth.admin.updateUserById(inviteData.user.id, {
      app_metadata: { demo_access: true },
    });
  }

  return { ok: true, email: normalizedEmail };
}
