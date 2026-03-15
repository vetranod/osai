"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  buildClientAuthHeaders,
  ensureServerSession,
  getClientAccessToken,
} from "@/lib/browser-auth-client";

import styles from "./packet.module.css";

function getErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  if ("message" in body && typeof body.message === "string") return body.message;
  if ("error" in body && typeof body.error === "string") return body.error;
  return fallback;
}

export function PrintActions({ rolloutId }: { rolloutId: string }) {
  const router = useRouter();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  async function handleBackToDashboard(): Promise<void> {
    if (isReturning) return;

    const nextPath = `/rollouts/${rolloutId}`;
    setIsReturning(true);

    try {
      const clientToken = await getClientAccessToken({ bridgeMode: "await" });
      const serverToken = await ensureServerSession({ attempts: 2, pauseMs: 150 });

      if (!clientToken && !serverToken) {
        window.location.assign(`/auth/continue?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      router.push(nextPath);
    } finally {
      setIsReturning(false);
    }
  }

  async function handleOpenPdf(): Promise<void> {
    if (isGeneratingPdf) return;

    const nextPath = `/rollouts/${rolloutId}/packet`;
    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
      pdfWindow.document.write(
        "<!doctype html><html><head><title>Generating PDF</title></head><body style=\"font-family: Inter, 'Segoe UI', Arial, sans-serif; padding: 32px; color: #18263a;\">Generating packet PDF...</body></html>"
      );
      pdfWindow.document.close();
    }

    setIsGeneratingPdf(true);

    try {
      let headers = await buildClientAuthHeaders(undefined, {
        bridgeMode: "background",
      });

      let response = await fetch(`/api/rollouts/${rolloutId}/packet/pdf`, {
        credentials: "include",
        cache: "no-store",
        headers,
      });

      if (response.status === 401) {
        const retryToken = await ensureServerSession({ attempts: 3, pauseMs: 200 });
        if (retryToken) {
          headers = await buildClientAuthHeaders(undefined, {
            preferServerToken: true,
          });
          response = await fetch(`/api/rollouts/${rolloutId}/packet/pdf`, {
            credentials: "include",
            cache: "no-store",
            headers,
          });
        }
      }

      if (response.status === 401) {
        pdfWindow?.close();
        window.location.assign(`/auth/continue?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(getErrorMessage(body, "Failed to generate packet PDF."));
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        const html = await response.text();
        if (pdfWindow) {
          pdfWindow.document.open();
          pdfWindow.document.write(html);
          pdfWindow.document.close();
        } else {
          const htmlBlob = new Blob([html], { type: "text/html" });
          const htmlUrl = URL.createObjectURL(htmlBlob);
          window.location.assign(htmlUrl);
          window.setTimeout(() => URL.revokeObjectURL(htmlUrl), 60_000);
        }
        return;
      }

      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);

      if (pdfWindow) {
        pdfWindow.location.replace(pdfUrl);
      } else {
        window.location.assign(pdfUrl);
      }

      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
    } catch (error) {
      pdfWindow?.close();
      window.alert(error instanceof Error ? error.message : "Failed to generate packet PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.printButton}
        onClick={() => void handleOpenPdf()}
        disabled={isGeneratingPdf}
      >
        {isGeneratingPdf ? "Generating PDF..." : "Open PDF"}
      </button>
      <button
        type="button"
        className={styles.backLink}
        onClick={() => void handleBackToDashboard()}
        disabled={isReturning}
      >
        {isReturning ? "Returning..." : "Back to dashboard"}
      </button>
    </div>
  );
}
