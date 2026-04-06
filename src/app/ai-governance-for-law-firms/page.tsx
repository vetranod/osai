import type { Metadata } from "next";
import { GuidePage } from "@/app/_marketing/GuidePage";
import { getRelatedGuides } from "@/app/_marketing/guides";
import { buildPageMetadata } from "@/app/seo";

const path = "/ai-governance-for-law-firms";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Governance for Law Firms | Fulcral",
  description:
    "See how law firms can introduce AI with clearer guardrails, review structure, and rollout checkpoints before client-sensitive workflows drift out of control.",
  path,
  keywords: [
    "AI governance for law firms",
    "law firm AI policy",
    "legal AI guardrails",
    "AI rollout for law firms",
    "AI policy for attorneys",
  ],
});

export default function AiGovernanceForLawFirmsPage() {
  return (
    <GuidePage
      path={path}
      eyebrow="Industry Guide"
      title="AI Governance for Law Firms"
      intro="Law firms do not usually need more enthusiasm for AI. They need clearer boundaries for where it can be used, who reviews outputs, and how adoption stays compatible with confidentiality, client trust, and real legal work."
      heroMeta={["Client-sensitive workflows", "Confidentiality pressure", "Higher review expectations"]}
      snapshotLabel="Typical legal-team concerns"
      snapshotRows={[
        {
          label: "Primary risk",
          value: "Unstructured AI use against confidential or client-sensitive work without a documented control model.",
        },
        {
          label: "What helps",
          value: "Usage boundaries, review checkpoints, ownership assignments, and staged adoption before workflow dependence sets in.",
        },
        {
          label: "Output fit",
          value: "A governance packet that can guide internal rollout decisions without pretending to replace legal judgment.",
        },
      ]}
      challengeHeading="Why informal AI use creates pressure inside firms"
      challengeIntro={[
        "In many firms, AI adoption starts with drafting, summarizing, brainstorming, or internal research support. The problem is not that these experiments happen. The problem is that they often spread before leadership defines what is permitted, what requires review, and what should remain human-only.",
        "For firms handling client work, the gap between 'people are trying tools' and 'the firm has a real AI operating position' matters more than it does in most industries.",
      ]}
      challengeCards={[
        {
          title: "Confidentiality drift",
          text: "People often understand that sensitive material matters, but not exactly where the line sits for prompts, uploads, summaries, or redrafting client material.",
        },
        {
          title: "Inconsistent review",
          text: "One attorney may inspect every output closely while another treats AI assistance like a drafting shortcut. That inconsistency is where risk compounds.",
        },
        {
          title: "No rollout posture",
          text: "Without a staged adoption plan, the firm ends up with isolated tool use, unclear ownership, and no practical governance path for expanding safely.",
        },
      ]}
      packetHeading="What an AI governance framework should clarify for a law firm"
      packetIntro={[
        "A law-firm-ready governance framework should do more than say 'be careful with AI.' It should separate safe use cases from restricted ones, define review expectations, and make it obvious who owns the rollout decisions.",
        "That is where a structured packet is more useful than a loose policy memo. It turns leadership posture into operating rules instead of leaving interpretation to each individual user.",
      ]}
      packetCards={[
        {
          title: "Usage guardrails",
          text: "Clarifies which tasks are acceptable for AI support, which require supervision, and which should stay human-only.",
        },
        {
          title: "Review standard",
          text: "Defines whether outputs are lightly checked, formally reviewed, or escalated before client-facing use.",
        },
        {
          title: "Milestone rollout",
          text: "Lets the firm expand from lower-risk uses toward broader adoption only after the earlier stages have actually been reviewed.",
        },
      ]}
      outcomeHeading="What firms usually want once governance is actually working"
      outcomeItems={[
        "A clear statement of where AI helps the firm and where it does not belong.",
        "A repeatable review expectation for drafts, summaries, and client-adjacent work.",
        "A documented rollout owner instead of scattered experimentation.",
        "A governance packet leadership can point to when questions arise.",
      ]}
      faqHeading="Questions firms usually ask first"
      faqItems={[
        {
          question: "Does a law firm need a full AI policy before anyone experiments?",
          answer:
            "Not necessarily a long policy, but it does need a defined governance position quickly. Once experiments begin touching real work, ambiguity becomes the problem.",
        },
        {
          question: "Is an internal AI policy enough on its own?",
          answer:
            "Usually no. A policy explains rules, but firms also need rollout pacing, review structure, and checkpoint-based adoption if they want real operating control.",
        },
        {
          question: "Why is staged rollout useful for legal teams?",
          answer:
            "Because not every use case carries the same sensitivity. Lower-risk internal work can often be governed differently from client-facing or confidentiality-heavy tasks.",
        },
      ]}
      ctaTitle="Define the firm’s AI operating position before tool use defines it for you."
      ctaBody="DeploySure helps law firms turn AI rollout questions into a structured governance framework with usage guardrails, review expectations, and milestone-based adoption."
      relatedLinks={getRelatedGuides(path)}
    />
  );
}
