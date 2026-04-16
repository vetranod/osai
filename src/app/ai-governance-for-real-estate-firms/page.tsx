import type { Metadata } from "next";
import { GuidePage } from "@/app/_marketing/GuidePage";
import { getRelatedGuides } from "@/app/_marketing/guides";
import { buildPageMetadata } from "@/app/seo";

const path = "/ai-governance-for-real-estate-firms";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Governance for Real Estate Firms | Fulcral",
  description:
    "See how real estate firms can set boundaries for AI-edited listing photos, virtual staging, and marketing content before misleading property imagery starts damaging trust.",
  path,
  keywords: [
    "AI governance for real estate firms",
    "real estate AI policy",
    "AI listing photo governance",
    "virtual staging AI policy",
    "real estate marketing AI guardrails",
  ],
});

export default function AiGovernanceForRealEstateFirmsPage() {
  return (
    <GuidePage
      path={path}
      eyebrow="Industry Guide"
      title="AI Governance for Real Estate Firms"
      intro="Real estate firms usually encounter AI governance first through marketing. Listing copy gets drafted faster. Photos get cleaned up. Empty rooms get virtually staged. None of that sounds especially dramatic until the listing starts presenting a version of the property that buyers do not actually encounter in person."
      heroMeta={["Listing-image pressure", "Consumer-trust risk", "Fast marketing cycles"]}
      snapshotLabel="What real estate teams are actually worried about"
      snapshotRows={[
        {
          label: "Primary risk",
          value: "Edited or generated property imagery makes the listing look materially better than the actual condition, layout, or setting.",
        },
        {
          label: "What helps",
          value: "Clear rules for photo edits, virtual staging disclosure, review checkpoints, and firm-wide standards for what a listing is allowed to suggest.",
        },
        {
          label: "What you get",
          value: "A governance structure that separates ordinary marketing assistance from misleading property representation.",
        },
      ]}
      challengeHeading="Why AI-generated property marketing becomes a governance issue quickly"
      challengeIntro={[
        "Real estate teams are under steady pressure to get listings up fast and make them look sharp. AI tools make that easier. A room can be brightened, decluttered, restaged, or subtly reshaped in very little time.",
        "That becomes a problem when the marketing starts drifting away from the property itself. Buyers treat listing images as representations of what they are going to see. When photos oversell the space, hide defects, or clean up a version of reality that does not exist, the reputational hit lands on the firm, not the software.",
      ]}
      challengeCards={[
        {
          title: "Listing reality drift",
          text: "Small edits compound. A brightened room becomes a larger-looking room. A decluttered space becomes a newer-looking finish. By the time the listing goes live, the photos may no longer represent what a buyer will walk into.",
        },
        {
          title: "Disclosure inconsistency",
          text: "One agent discloses virtual staging clearly. Another posts heavily edited images with no explanation. The firm inherits uneven standards and entirely preventable exposure.",
        },
        {
          title: "Brand damage travels fast",
          text: "When buyers feel misled, it rarely stays inside one transaction. It shows up in reviews, referrals, and how sellers start thinking about the firm's marketing.",
        },
      ]}
      packetHeading="What a governance framework should actually cover"
      packetIntro={[
        "A useful framework draws a clear line between ordinary presentation and misleading representation. That means practical standards for photos, virtual staging, listing descriptions, and who signs off before anything goes live.",
        "The main failure mode here is public. A listing asset goes out under the firm's name, gets shared widely, and creates a credibility problem the moment a buyer walks through the door.",
      ]}
      packetCards={[
        {
          title: "Image and staging guardrails",
          text: "Clarifies which edits are acceptable, which need disclosure, and which alterations cross a line.",
        },
        {
          title: "Approval checkpoints",
          text: "Defines who reviews listing photos, captions, and AI-assisted copy before anything publishes under the firm's brand.",
        },
        {
          title: "Escalation when something goes wrong",
          text: "Creates a path for pulling or correcting marketing quickly when a listing gets challenged.",
        },
      ]}
      outcomeHeading="What it looks like when this is working"
      outcomeItems={[
        "Agents understand the difference between routine enhancement, disclosed staging, and misrepresentation.",
        "Buyers are not left guessing how closely the listing reflects the actual property.",
        "The firm has one review standard instead of agent-by-agent judgment calls.",
        "Leadership can stand behind the firm's marketing practices if a complaint comes up.",
      ]}
      faqHeading="What firms usually ask first"
      faqItems={[
        {
          question: "Is virtual staging always a problem?",
          answer:
            "No. Virtual staging is a legitimate tool. The problem starts when there are no disclosure standards, no limit on how far the image can depart from reality, and no review before it goes live.",
        },
        {
          question: "Isn't this just a marketing issue?",
          answer:
            "Listing imagery sets buyer expectations and reflects directly on the firm's credibility. When marketing materially misleads people, the fallout reaches client relationships, reviews, and the firm's ability to hold agents to any consistent standard.",
        },
        {
          question: "What should always get a human review?",
          answer:
            "Any AI-assisted photo, rendering, or property description that could change how a buyer understands the condition, features, size, or livability of a property should be reviewed by a person before it publishes.",
        },
      ]}
      ctaTitle="Set the standard before your listings drift further than the properties they represent."
      ctaBody="Fulcral gives real estate firms the structure to govern AI-assisted marketing with image guardrails, review checkpoints, and standards your whole team can actually follow. If your agents are already using these tools, the question is not whether to govern them. It is whether you do it before or after something goes wrong."
      relatedLinks={getRelatedGuides(path)}
    />
  );
}
