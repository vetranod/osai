import type { Metadata } from "next";
import { buildPageMetadata } from "@/app/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Rollout Dashboard | DeploySure",
  description: "Authenticated rollout dashboards and governance packets.",
  path: "/rollouts",
  noIndex: true,
});

export default function RolloutsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
