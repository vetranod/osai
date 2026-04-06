import type { Metadata } from "next";

const FALLBACK_SITE_URL = "https://fulcral.org";
export const SITE_NAME = "Fulcral";
export const DEFAULT_OG_TYPE = "website";

function normalizeUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getSiteUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (!envUrl) return FALLBACK_SITE_URL;
  if (envUrl.startsWith("http://") || envUrl.startsWith("https://")) {
    return normalizeUrl(envUrl);
  }

  return normalizeUrl(`https://${envUrl}`);
}

export function absoluteUrl(path = "/"): string {
  const siteUrl = getSiteUrl();
  return path === "/" ? siteUrl : `${siteUrl}${path}`;
}

export function getMetadataBase(): URL {
  return new URL(getSiteUrl());
}

type PageMetadataArgs = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function buildPageMetadata({
  title,
  description,
  path = "/",
  keywords,
  noIndex = false,
}: PageMetadataArgs): Metadata {
  const canonical = absoluteUrl(path);

  return {
    metadataBase: getMetadataBase(),
    title,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      type: DEFAULT_OG_TYPE,
      url: canonical,
      title,
      description,
      siteName: SITE_NAME,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}
