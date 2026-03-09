"use server";

import { createHmac, timingSafeEqual } from "crypto";
import { getServiceRoleSupabase } from "@/lib/supabase-server";

function verifyAdminProof(proof: string): boolean {
  const parts = (proof ?? "").split(".");
  if (parts.length !== 2) return false;
  const [tsStr, mac] = parts;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > 7200) return false;

  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.OSAI_ADMIN_EMAIL ?? "fallback";
  const expected = createHmac("sha256", secret)
    .update(`admin-invite:${ts}`)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export type InviteResult =
  | { ok: true; email: string; note?: "existing_user" }
  | { ok: false; message: string };

export async function sendDemoInvite(
  email: string,
  adminProof: string
): Promise<InviteResult> {
  try {
    if (!verifyAdminProof(adminProof)) {
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
      // If the user already has an account, Supabase rejects the invite.
      // Try to find and update them via listUsers instead.
      const isAlreadyRegistered =
        error.message.toLowerCase().includes("already") ||
        error.message.toLowerCase().includes("registered") ||
        (error as { status?: number }).status === 422;

      if (isAlreadyRegistered) {
        // Paginate through users to find by email (safe, no schema hacks needed).
        let foundId: string | null = null;
        let page = 1;
        outer: while (page <= 10) {
          const { data: listData } = await admin.auth.admin.listUsers({
            page,
            perPage: 50,
          });
          if (!listData?.users?.length) break;
          for (const u of listData.users) {
            if (u.email?.toLowerCase() === normalizedEmail) {
              foundId = u.id;
              break outer;
            }
          }
          if (listData.users.length < 50) break;
          page++;
        }

        if (foundId) {
          await admin.auth.admin.updateUserById(foundId, {
            app_metadata: { demo_access: true },
          });
          return { ok: true, email: normalizedEmail, note: "existing_user" };
        }
      }

      return { ok: false, message: error.message };
    }

    if (inviteData.user?.id) {
      await admin.auth.admin.updateUserById(inviteData.user.id, {
        app_metadata: { demo_access: true },
        email_confirm: true,
      });
    }

    return { ok: true, email: normalizedEmail };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Unexpected error. Please try again.",
    };
  }
}
