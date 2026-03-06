export const guideLinks = [
  {
    href: "/ai-governance-for-law-firms",
    title: "AI Governance for Law Firms",
    text: "How firms handling client-sensitive work can set rollout boundaries before informal AI use becomes exposure.",
  },
  {
    href: "/ai-governance-for-consulting-firms",
    title: "AI Governance for Consulting Firms",
    text: "A practical governance model for delivery teams balancing speed, client trust, and repeatable review standards.",
  },
  {
    href: "/ai-policy-for-small-business",
    title: "AI Policy for Small Business",
    text: "What smaller teams need from an AI policy before tools spread faster than leadership oversight.",
  },
  {
    href: "/ai-governance-framework-vs-ai-policy",
    title: "AI Governance Framework vs AI Policy",
    text: "Why a policy document alone is not the same thing as a rollout framework with checkpoints and ownership.",
  },
] as const;

export function getRelatedGuides(currentHref: string) {
  return guideLinks.filter((guide) => guide.href !== currentHref);
}
