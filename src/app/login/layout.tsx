import type { Metadata } from "next";
import { buildPageMetadata } from "@/app/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Sign In | Fulcral",
  description: "Sign in to access your Fulcral framework builder and rollout dashboards.",
  path: "/login",
  noIndex: true,
});

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
