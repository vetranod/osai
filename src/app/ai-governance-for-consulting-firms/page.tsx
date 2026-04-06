import type { Metadata } from "next";
import { GuidePage } from "@/app/_marketing/GuidePage";
import { getRelatedGuides } from "@/app/_marketing/guides";
import { buildPageMetadata } from "@/app/seo";

const path = "/ai-governance-for-consulting-firms";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Governance for Consulting Firms | Fulcral",
  description:
    "Learn how consulting firms can introduce AI with better delivery guardrails, review expectations, and rollout pacing without slowing teams to a halt.",
  path,
  keywords: [
    "AI governance for consulting firms",
    "consulting firm AI policy",
    "AI rollout consulting",
    "AI guardrails for consultants",
    "consulting AI governance framework",
  ],
});

export default function AiGovernanceForConsultingFirmsPage() {
  return (
    <GuidePage
      path={path}
      eyebrow="Industry Guide"
      title="AI Governance for Consulting Firms"
      intro="Consulting firms usually need AI governance that preserves delivery speed without letting client work, research, and deck production slide into inconsistent or unreviewed AI usage."
      heroMeta={["Delivery pressure", "Client-trust risk", "Fast-moving teams"]}
      snapshotLabel="Typical consulting-team concerns"
      snapshotRows={[
        {
          label: "Primary risk",
          value: "AI spreads through proposal writing, analysis support, and client deliverables before the firm defines what requires review.",
        },
        {
          label: "What helps",
          value: "A framework that distinguishes internal acceleration from client-facing output control.",
        },
        {
          label: "Output fit",
          value: "A staged rollout packet that keeps teams moving while giving leadership a real governance position.",
        },
      ]}
      challengeHeading="Why consulting teams need more than a loose AI policy"
      challengeIntro={[
        "Consulting firms often adopt AI faster than they formalize it. Analysts use it for synthesis, managers use it for draft refinement, and proposals start incorporating AI-assisted content before anyone has agreed on a review standard.",
        "That speed is understandable. The risk is that quality control and client trust expectations become team-by-team decisions instead of firm-level ones.",
      ]}
      challengeCards={[
        {
          title: "Client-facing inconsistency",
          text: "Some outputs are reviewed rigorously, others less so, and leadership has no stable way to see where AI is actually entering the delivery chain.",
        },
        {
          title: "Proposal and pitch drift",
          text: "Firms often use AI heavily in pre-sale work first, but without clear boundaries that can still affect quality, claims, and brand trust.",
        },
        {
          title: "No pacing model",
          text: "Teams want speed immediately, while leadership wants control. Without a rollout framework, those goals collide instead of being sequenced.",
        },
      ]}
      packetHeading="What a consulting-firm AI governance framework should establish"
      packetIntro={[
        "Good governance for consulting firms should not read like a blanket prohibition. It should identify where AI can accelerate work safely, where review depth increases, and how adoption expands without relying on ad hoc judgment.",
        "That is especially useful in firms where multiple teams, service lines, or client contexts operate at different levels of sensitivity.",
      ]}
      packetCards={[
        {
          title: "Workstream guardrails",
          text: "Clarifies which uses are safe for brainstorming or internal drafting and which need heavier controls for client delivery.",
        },
        {
          title: "Review ownership",
          text: "Makes review expectations explicit so managers and delivery leads are not inventing standards project by project.",
        },
        {
          title: "Adoption milestones",
          text: "Lets the firm move from exploratory use toward broader operational use only after earlier guardrails have been reviewed.",
        },
      ]}
      outcomeHeading="What effective AI governance gives a consulting team"
      outcomeItems={[
        "Faster internal work without pretending every use case carries the same risk.",
        "A cleaner distinction between internal acceleration and client-ready output.",
        "A delivery review standard leadership can defend across teams.",
        "A rollout structure that helps the firm scale AI use deliberately instead of reactively.",
      ]}
      faqHeading="Questions consulting leaders usually ask"
      faqItems={[
        {
          question: "Will governance slow consulting teams down too much?",
          answer:
            "Not if the framework is structured correctly. The point is to apply heavier review where the risk is higher, not to force the same standard on every internal use.",
        },
        {
          question: "Why not let each service line define its own AI rules?",
          answer:
            "Teams can adapt locally, but the firm still needs a shared baseline for quality, review, and client-facing expectations.",
        },
        {
          question: "What makes a framework better than a one-page AI policy?",
          answer:
            "A framework covers rollout posture, checkpoints, review structure, and guardrails. A policy alone usually describes rules without giving leadership a practical adoption model.",
        },
      ]}
      ctaTitle="Give fast-moving consulting teams a clearer AI operating model."
      ctaBody="Fulcral helps consulting firms define rollout pacing, guardrails, and review structure without collapsing everything into a vague generic AI policy."
      relatedLinks={getRelatedGuides(path)}
    />
  );
}
