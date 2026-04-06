import type { Metadata } from "next";
import { buildPageMetadata } from "@/app/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Payment Processing | Fulcral",
  description: "Processing your Fulcral purchase and linking your rollout dashboard.",
  path: "/generate/success",
  noIndex: true,
});

export default function GenerateSuccessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
