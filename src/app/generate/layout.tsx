import type { Metadata } from "next";
import { buildPageMetadata } from "@/app/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Generate Your AI Governance Framework | Fulcral",
  description:
    "Answer four questions and generate a structured AI governance framework with rollout pacing, guardrails, and review controls.",
  path: "/generate",
  keywords: [
    "generate AI policy",
    "AI governance generator",
    "AI rollout builder",
    "AI policy tool",
  ],
});

export default function GenerateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
