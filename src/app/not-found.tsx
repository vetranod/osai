import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "48px 24px" }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 64, fontWeight: 800, color: "var(--border-strong)", marginBottom: 8, lineHeight: 1 }}>
          404
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>
          Page not found
        </h1>
        <p style={{ fontSize: 14, color: "var(--foreground-muted)", marginBottom: 28, lineHeight: 1.6 }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          style={{
            fontSize: 14,
            padding: "9px 18px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--accent)",
            background: "var(--accent)",
            color: "#fff",
            textDecoration: "none",
            display: "inline-block",
            fontWeight: 600,
          }}
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
