import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function isDemoEmailAllowed(email: string): boolean {
  const raw = process.env.OSAI_DEMO_ALLOWED_EMAILS ?? "";
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return process.env.VERCEL_ENV !== "production";
  return allowed.includes(email.trim().toLowerCase());
}

export default async function DemoGeneratePage() {
  const supabase = await getSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/demo/generate");
  }

  const hasDemoAccess =
    user.app_metadata?.demo_access === true ||
    (user.email ? isDemoEmailAllowed(user.email) : false);

  if (!hasDemoAccess) {
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
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Access not available</h1>
        <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
          This demo is available by invitation only. If you received an invitation email, make sure
          you clicked the link in that message to activate your access.
        </p>
      </div>
    );
  }

  redirect("/generate?demo=1");
}
