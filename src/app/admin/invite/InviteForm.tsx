"use client";

import { useState, useTransition } from "react";
import { sendDemoInvite } from "./actions";

export default function InviteForm({ adminProof }: { adminProof: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "existing" | "error">("idle");
  const [sentEmail, setSentEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await sendDemoInvite(email, adminProof);
      if (result.ok) {
        setSentEmail(result.email);
        setStatus(result.note === "existing_user" ? "existing" : "success");
        setEmail("");
      } else {
        setErrorMsg(result.message);
        setStatus("error");
      }
    });
  }

  return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", fontFamily: "inherit" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Send demo invite</h1>
      <p style={{ color: "#6b7280", marginBottom: 28, lineHeight: 1.5 }}>
        The recipient receives a magic-link email. When they click it they land directly in the
        demo wizard and can generate their governance packet — no payment required.
      </p>
      <form onSubmit={handleSubmit}>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 6,
            color: "#374151",
          }}
        >
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
          disabled={isPending}
          style={{
            padding: "10px 20px",
            background: "#111827",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 15,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Sending…" : "Send invite"}
        </button>
      </form>

      {status === "success" && (
        <p style={{ marginTop: 16, fontSize: 14, color: "#16a34a" }}>
          ✓ Invite sent to <strong>{sentEmail}</strong>. They will receive a magic link to the
          demo wizard.
        </p>
      )}

      {status === "existing" && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            background: "#fefce8",
            border: "1px solid #fde68a",
            borderRadius: 6,
            fontSize: 14,
            color: "#713f12",
          }}
        >
          <strong>{sentEmail}</strong> already has an account — demo access has been granted.
          Ask them to sign in and visit{" "}
          <a href="/demo/generate" style={{ color: "#92400e" }}>
            fulcral.org/demo/generate
          </a>
          .
        </div>
      )}

      {status === "error" && (
        <p style={{ marginTop: 16, fontSize: 14, color: "#dc2626" }}>{errorMsg}</p>
      )}
    </div>
  );
}
