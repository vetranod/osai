import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  async redirects() {
    return [
      { source: "/", destination: "https://www.fulcral.org/", permanent: true, has: [{ type: "host", value: "deploysure.com" }] },
      { source: "/how-it-works", destination: "https://www.fulcral.org/how-it-works", permanent: true, has: [{ type: "host", value: "deploysure.com" }] },
      { source: "/generate", destination: "https://www.fulcral.org/generate", permanent: true, has: [{ type: "host", value: "deploysure.com" }] },
      { source: "/resources", destination: "https://www.fulcral.org/resources", permanent: true, has: [{ type: "host", value: "deploysure.com" }] },
      { source: "/ai-governance-for-law-firms", destination: "https://www.fulcral.org/ai-governance-for-law-firms", permanent: true, has: [{ type: "host", value: "deploysure.com" }] },
      { source: "/ai-governance-for-consulting-firms", destination: "https://www.fulcral.org/ai-governance-for-consulting-firms", permanent: true, has: [{ type: "host", value: "deploysure.com" }] },
      { source: "/ai-policy-for-small-business", destination: "https://www.fulcral.org/ai-policy-for-small-business", permanent: true, has: [{ type: "host", value: "deploysure.com" }] },
      { source: "/ai-governance-framework-vs-ai-policy", destination: "https://www.fulcral.org/ai-governance-framework-vs-ai-policy", permanent: true, has: [{ type: "host", value: "deploysure.com" }] },
      { source: "/resources/what-an-ai-governance-framework-should-include", destination: "https://www.fulcral.org/resources/what-an-ai-governance-framework-should-include", permanent: true, has: [{ type: "host", value: "deploysure.com" }] },
      { source: "/resources/how-to-introduce-ai-at-a-small-firm", destination: "https://www.fulcral.org/resources/how-to-introduce-ai-at-a-small-firm", permanent: true, has: [{ type: "host", value: "deploysure.com" }] },
      { source: "/resources/ai-policy-vs-governance-framework", destination: "https://www.fulcral.org/resources/ai-policy-vs-governance-framework", permanent: true, has: [{ type: "host", value: "deploysure.com" }] },
      { source: "/resources/how-to-classify-ai-use-cases-by-risk", destination: "https://www.fulcral.org/resources/how-to-classify-ai-use-cases-by-risk", permanent: true, has: [{ type: "host", value: "deploysure.com" }] },
      { source: "/resources/when-ai-output-needs-human-review", destination: "https://www.fulcral.org/resources/when-ai-output-needs-human-review", permanent: true, has: [{ type: "host", value: "deploysure.com" }] },
    ];
  },
};

export default nextConfig;
