"use server";

import { Resend } from "resend";
import { supabaseAdmin } from "@/server/supabaseAdmin";

export type ContactFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const firmName = (formData.get("firmName") as string | null)?.trim() ?? "";
  const inquiryType = (formData.get("inquiryType") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  // Basic validation
  if (!name || !email || !message) {
    return { status: "error", message: "Name, email, and message are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }
  if (message.length < 10) {
    return { status: "error", message: "Message is too short." };
  }

  // 1. Persist to Supabase
  const { error: dbError } = await supabaseAdmin
    .from("contact_submissions")
    .insert({
      name,
      email,
      firm_name: firmName || null,
      inquiry_type: inquiryType || null,
      message,
    });

  if (dbError) {
    console.error("[contact] Supabase insert error:", dbError.message);
    // Don't block submission over a DB error — still attempt email
  }

  // 2. Send notification email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("[contact] RESEND_API_KEY is not set");
    // We still count this as success if the DB write worked
    return { status: "success" };
  }

  const resend = new Resend(resendKey);
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Fulcral <contact@fulcral.org>";
  const toAddress = process.env.CONTACT_NOTIFICATION_EMAIL ?? "info@fulcral.org";

  const { error: emailError } = await resend.emails.send({
    from: fromAddress,
    to: toAddress,
    replyTo: email,
    subject: `New enquiry: ${inquiryType || "General"} — ${name}`,
    text: [
      `Name:         ${name}`,
      `Email:        ${email}`,
      `Firm:         ${firmName || "—"}`,
      `Inquiry type: ${inquiryType || "—"}`,
      ``,
      `Message:`,
      message,
      ``,
      `---`,
      `Submitted via fulcral.org/contact`,
    ].join("\n"),
  });

  if (emailError) {
    console.error("[contact] Resend error:", emailError.message);
    // Submission was saved to DB — don't surface email failure to user
  }

  return { status: "success" };
}
