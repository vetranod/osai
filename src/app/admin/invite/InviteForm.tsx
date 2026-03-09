"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function InviteForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch("/api/admin/demo-invite", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.message ?? "Something went wrong.");
      } else {
        setStatus("success");
        setMessage(`Invite sent to ${data.email as string}`);
        setEmail("");
      }
    } catch {
      setStatus("error");
      setMessage("Network error — please try again.");
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", fontFamily: "inherit" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Send demo invite</h1>
      <p style={{ color: "#6b7280", marginBottom: 28, lineHeight: 1.5 }}>
        The recipient receives a magic-link email. When they click it they land directly in the
        demo wizard and can generate their governance packet — no payment required.
      </p>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "#374151" }}>
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prospect@example.com"
          required
          style={{
            display: "block",
            width: "100%",
            padding: "10px 12px",
            fontSize: 15,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            marginBottom: 12,
            boxSizing: "border-box",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          style={{
            padding: "10px 20px",
            background: "#111827",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 15,
            cursor: status === "loading" ? "not-allowed" : "pointer",
            opacity: status === "loading" ? 0.7 : 1,
          }}
        >
          {status === "loading" ? "Sending..." : "Send invite"}
        </button>
      </form>
      {message && (
        <p
          style={{
            marginTop: 16,
            fontSize: 14,
            color: status === "error" ? "#dc2626" : "#16a34a",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
