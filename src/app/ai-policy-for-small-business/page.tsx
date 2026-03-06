import type { Metadata } from "next";
import { GuidePage } from "@/app/_marketing/GuidePage";
import { getRelatedGuides } from "@/app/_marketing/guides";
import { buildPageMetadata } from "@/app/seo";

const path = "/ai-policy-for-small-business";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Policy for Small Business | DeploySure",
  description:
    "A practical look at what small businesses actually need from an AI policy, and why many teams need a broader governance framework instead of a document alone.",
  path,
  keywords: [
    "AI policy for small business",
    "small business AI policy",
    "AI governance for small business",
    "small team AI policy",
    "AI rollout policy",
  ],
});

export default function AiPolicyForSmallBusinessPage() {
  return (
    <GuidePage
      path={path}
      eyebrow="Small Team Guide"
      title="AI Policy for Small Business"
      intro="Most small businesses do not need a heavyweight governance program. They do need a clear operating position on how AI is used, where it is limited, and who owns the rollout before tool adoption gets ahead of the business."
      heroMeta={["Smaller teams", "Fewer formal layers", "Need clarity without bureaucracy"]}
      snapshotLabel="Typical small-business concerns"
      snapshotRows={[
        {
          label: "Primary risk",
          value: "AI use spreads informally across a small team before anyone defines what is allowed or who reviews outputs.",
        },
        {
          label: "What helps",
          value: "A practical governance framework that is clear enough to follow without becoming administrative drag.",
        },
        {
          label: "Output fit",
          value: "A policy-backed packet with rollout pacing, usage boundaries, and review guidance sized for a smaller organization.",
        },
      ]}
      challengeHeading="Why small businesses still need AI structure"
      challengeIntro={[
        "Small teams often assume governance is only for enterprises. In practice, smaller businesses are often more vulnerable to informal tool adoption because they have fewer layers of review and less time to unwind bad habits once they spread.",
        "The goal is not to overbuild process. The goal is to make sure the business has a usable operating model before AI becomes a default workflow shortcut.",
      ]}
      challengeCards={[
        {
          title: "Everyone uses tools differently",
          text: "Without guidance, one employee may use AI for low-risk internal support while another uses it in client or customer-facing work with no shared standard.",
        },
        {
          title: "Leadership notices late",
          text: "AI often becomes embedded in day-to-day work before owners or managers have decided what the business is comfortable with.",
        },
        {
          title: "Policies stay too generic",
          text: "Many small businesses download a template, but the result does not explain rollout pacing, review depth, or actual use boundaries.",
        },
      ]}
      packetHeading="What a useful AI policy should include for a small business"
      packetIntro={[
        "For smaller teams, the best policy is usually the one that can actually be followed. That means keeping it specific enough to guide behavior, but structured enough to help leadership decide how adoption expands over time.",
        "In practice, that often means pairing policy language with a lightweight governance framework rather than treating the document as the whole solution.",
      ]}
      packetCards={[
        {
          title: "Allowed vs restricted uses",
          text: "Makes it clear which types of work can use AI freely, which require oversight, and which stay off limits.",
        },
        {
          title: "Review expectations",
          text: "Defines when someone else should check the output and when individual users can proceed on their own.",
        },
        {
          title: "Rollout ownership",
          text: "Ensures one person or role is accountable for how the business expands AI use over time.",
        },
      ]}
      outcomeHeading="What smaller teams usually want from the finished framework"
      outcomeItems={[
        "A simple AI operating position employees can understand quickly.",
        "Enough structure to reduce misuse without introducing enterprise-style overhead.",
        "A clear review rule for higher-stakes output.",
        "A packet leadership can revisit as AI use expands.",
      ]}
      faqHeading="Questions small-business owners often ask"
      faqItems={[
        {
          question: "Can a small business just use an AI policy template?",
          answer:
            "A template can be a starting point, but many businesses need more than a document. They also need rollout posture, review expectations, and use-case boundaries matched to how the team actually works.",
        },
        {
          question: "How formal does the policy need to be?",
          answer:
            "It should be formal enough to set expectations clearly, but not so heavy that no one follows it. Practical clarity matters more than length.",
        },
        {
          question: "Why include rollout pacing at all?",
          answer:
            "Because the business does not need to decide everything at once. A staged rollout makes it easier to expand AI use after lower-risk use cases are already working under clear rules.",
        },
      ]}
      ctaTitle="Give your team a practical AI operating model before habits set in."
      ctaBody="DeploySure helps small businesses move beyond a generic template and define an AI policy with rollout guardrails, ownership, and review standards."
      relatedLinks={getRelatedGuides(path)}
    />
  );
}
