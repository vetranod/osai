import type { Metadata } from "next";
import { GuidePage } from "@/app/_marketing/GuidePage";
import { getRelatedGuides } from "@/app/_marketing/guides";
import { buildPageMetadata } from "@/app/seo";

const path = "/ai-governance-framework-vs-ai-policy";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Governance Framework vs AI Policy | Fulcral",
  description:
    "Understand the difference between an AI policy and a broader AI governance framework, and why many teams need both to control rollout safely.",
  path,
  keywords: [
    "AI governance framework vs AI policy",
    "AI policy vs governance",
    "AI governance framework",
    "AI policy difference",
    "AI rollout framework",
  ],
});

export default function AiGovernanceFrameworkVsAiPolicyPage() {
  return (
    <GuidePage
      path={path}
      eyebrow="Comparison Guide"
      title="AI Governance Framework vs AI Policy"
      intro="An AI policy and an AI governance framework are related, but they are not the same thing. A policy tells people the rules. A framework tells the organization how adoption is evaluated, paced, reviewed, and owned."
      heroMeta={["Policy is one document", "Framework is the operating model", "Most teams eventually need both"]}
      snapshotLabel="Where teams usually get confused"
      snapshotRows={[
        {
          label: "Policy",
          value: "Defines what is allowed, restricted, or prohibited in written form.",
        },
        {
          label: "Framework",
          value: "Defines rollout posture, milestones, review depth, and governance ownership around those rules.",
        },
        {
          label: "Practical outcome",
          value: "A team with only a policy may still have no clear plan for how AI use expands safely.",
        },
      ]}
      challengeHeading="Why teams conflate the two"
      challengeIntro={[
        "When organizations first start formalizing AI use, they often ask for a policy. That makes sense because a policy is visible, easy to describe, and feels complete.",
        "The problem is that a policy alone does not answer several operational questions: how fast should AI adoption move, what level of review applies to different work, and what happens when the organization’s risk posture changes?",
      ]}
      challengeCards={[
        {
          title: "A policy says the rules",
          text: "It tells users what is permitted and what is restricted, but it may not explain how the organization should sequence adoption.",
        },
        {
          title: "A framework sets the posture",
          text: "It determines rollout pacing, guardrail strictness, review expectations, and milestone checkpoints before policy language is activated.",
        },
        {
          title: "Operations still need both",
          text: "A framework without policy can be abstract. A policy without framework can be static and operationally thin.",
        },
      ]}
      packetHeading="What the broader framework adds beyond a policy document"
      packetIntro={[
        "A governance framework gives leadership a decision model, not just a rule sheet. It lets the organization define where it is starting, what sensitivity level applies, and how adoption progresses over time.",
        "That is what makes the final packet more than a template. It ties policy language to rollout context, review depth, and milestone-based implementation.",
      ]}
      packetCards={[
        {
          title: "Rollout mode",
          text: "Explains whether adoption should be controlled, phased, or otherwise paced based on the organization’s current inputs.",
        },
        {
          title: "Review model",
          text: "Clarifies how much human review different outputs need before they are trusted or delivered.",
        },
        {
          title: "Milestone structure",
          text: "Creates checkpoints so teams do not expand use blindly after the first successful experiment.",
        },
      ]}
      outcomeHeading="How to think about the distinction in practice"
      outcomeItems={[
        "If you only need rules, you are thinking about policy.",
        "If you also need rollout pace, ownership, and review structure, you are thinking about governance.",
        "If AI use is already spreading, the framework question usually becomes urgent first.",
        "The strongest end state is a policy backed by a real rollout framework.",
      ]}
      faqHeading="Questions teams ask when choosing between the two"
      faqItems={[
        {
          question: "Can an organization start with just an AI policy?",
          answer:
            "Yes, but that only covers part of the problem. Once adoption expands, leadership usually also needs a framework for rollout pace, review, and milestone control.",
        },
        {
          question: "Is a framework more complicated than a policy?",
          answer:
            "It is broader, not necessarily harder. The framework is the operating model that explains how the policy should be implemented and expanded.",
        },
        {
          question: "Why does DeploySure emphasize a packet instead of one document?",
          answer:
            "Because most teams need multiple governance components working together: rollout posture, guardrails, review expectations, milestone planning, and policy language.",
        },
      ]}
      ctaTitle="Move beyond a document-only view of AI governance."
      ctaBody="DeploySure helps teams turn AI policy questions into a broader governance framework with rollout logic, guardrails, and milestone-based control."
      relatedLinks={getRelatedGuides(path)}
    />
  );
}
