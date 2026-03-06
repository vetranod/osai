import type { MetadataRoute } from "next";
import { getSiteUrl } from "./seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/generate",
          "/how-it-works",
          "/ai-governance-for-law-firms",
          "/ai-governance-for-consulting-firms",
          "/ai-policy-for-small-business",
          "/ai-governance-framework-vs-ai-policy",
        ],
        disallow: ["/api/", "/rollouts/", "/auth/", "/login", "/generate/success"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
