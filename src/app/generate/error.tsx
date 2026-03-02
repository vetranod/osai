"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GenerateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GenerateError]", error);
  }, [error]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "48px 24px" }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: "var(--danger)", marginBottom: 16 }}>!</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: "var(--foreground-muted)", marginBottom: 28, lineHeight: 1.6 }}>
          There was a problem loading the rollout designer. Your inputs have not been saved.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={reset}
            style={{
              fontSize: 14,
              padding: "9px 18px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{
              fontSize: 14,
              padding: "9px 18px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border-strong)",
              background: "transparent",
              color: "var(--foreground-muted)",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
