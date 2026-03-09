import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createHmac } from "crypto";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import InviteForm from "./InviteForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Generate a short-lived HMAC proof that the page was rendered by an
 * authenticated admin. The server action verifies this instead of
 * re-checking Supabase cookies (which may not survive to form submission).
 */
function generateAdminProof(): string {
  const ts = Math.floor(Date.now() / 1000);
  // Use the service role key as the HMAC secret (long, random, server-only).
  // Fall back to OSAI_ADMIN_EMAIL if the key isn't available.
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.OSAI_ADMIN_EMAIL ?? "fallback";
  const mac = createHmac("sha256", secret)
    .update(`admin-invite:${ts}`)
    .digest("hex");
  return `${ts}.${mac}`;
}

export default async function AdminInvitePage() {
  const supabase = await getSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/invite");
  }

  const adminEmail = (process.env.OSAI_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!adminEmail || user.email?.trim().toLowerCase() !== adminEmail) {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: "120px auto",
          padding: "0 24px",
          textAlign: "center",
          fontFamily: "inherit",
        }}
      >
        <p style={{ color: "#6b7280" }}>Not authorized.</p>
      </div>
    );
  }

  // Proof is valid for 2 hours. The server action verifies it without
  // needing Supabase cookies to still be present at submission time.
  const adminProof = generateAdminProof();

  return <InviteForm adminProof={adminProof} />;
}
