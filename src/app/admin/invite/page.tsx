import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import InviteForm from "./InviteForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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

  return <InviteForm />;
}
