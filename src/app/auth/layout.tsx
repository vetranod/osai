import type { Metadata } from "next";
import { buildPageMetadata } from "@/app/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Authentication | Fulcral",
  description: "Secure authentication flow for Fulcral accounts.",
  path: "/auth",
  noIndex: true,
});

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
