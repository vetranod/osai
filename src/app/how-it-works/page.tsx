import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, buildPageMetadata } from "../seo";
import styles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "How AI Governance Framework Generation Works | Fulcral",
  description:
    "See how Fulcral evaluates AI rollout inputs, assigns governance posture, and produces a structured governance packet for professional teams.",
  path: "/how-it-works",
  keywords: [
    "how AI governance works",
    "AI rollout planning",
    "AI governance process",
    "deterministic AI governance",
  ],
});

export default function HowItWorksPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What inputs does Fulcral use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Fulcral evaluates the primary goal, current adoption level, data sensitivity, and leadership posture for the rollout.",
        },
      },
      {
        "@type": "Question",
        name: "What does the system produce?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "It produces a structured AI governance packet covering rollout posture, guardrails, review structure, milestone rollout planning, and policy guidance.",
        },
      },
      {
        "@type": "Question",
        name: "Who is Fulcral for?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Fulcral is designed for professional teams and small organizations that want to adopt AI without losing operational control.",
        },
      },
    ],
  };

  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "How Fulcral Works",
    url: absoluteUrl("/how-it-works"),
    description:
      "Overview of Fulcral's deterministic AI governance framework generation process.",
  };

  return (
    <div className={styles.wrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <section className={styles.hero}>
        <p className={styles.heroLabel}>How Fulcral Works</p>
        <h1 className={styles.heroTitle}>The methodology behind the framework.</h1>
        <p className={styles.heroBody}>
          Fulcral provides a structured system for organizations introducing
          AI tools into real workflows.
        </p>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>What the system is</p>
        <h2 className={styles.sectionHeading}>Structured AI rollout for professional teams</h2>
        <div className={styles.prose}>
          <p>
            The system evaluates several inputs about how AI will be used and
            produces a governance structure that defines rollout pacing, guardrails,
            and review practices.
          </p>
          <p>
            The result is a complete AI Governance Packet that provides a clear
            operational framework for AI adoption.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Process</p>
        <h2 className={styles.sectionHeading}>How rollout planning works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>01</div>
            <div>
              <h3 className={styles.stepTitle}>Provide rollout inputs</h3>
              <p className={styles.stepText}>
                The system asks four structured questions about how AI will be used.
              </p>
              <ul className={styles.stepList}>
                <li>Primary goal</li>
                <li>Adoption level</li>
                <li>Data sensitivity</li>
                <li>Leadership posture</li>
              </ul>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>02</div>
            <div>
              <h3 className={styles.stepTitle}>Decision model evaluation</h3>
              <p className={styles.stepText}>
                Inputs are evaluated using a deterministic decision model that
                determines rollout posture and guardrail strictness.
              </p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>03</div>
            <div>
              <h3 className={styles.stepTitle}>Governance packet creation</h3>
              <p className={styles.stepText}>
                The system produces a structured AI Governance Packet tailored
                to the organization&apos;s inputs and risk profile.
              </p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>04</div>
            <div>
              <h3 className={styles.stepTitle}>Milestone rollout</h3>
              <p className={styles.stepText}>
                Organizations introduce AI tools using a milestone based rollout
                structure with defined checkpoints and review gates.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Deliverable</p>
        <h2 className={styles.sectionHeading}>Governance packet contents</h2>
        <div className={styles.cards}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>AI Rollout Profile</h3>
            <p className={styles.cardText}>Defines rollout posture and adoption context.</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Guardrail Policy</h3>
            <p className={styles.cardText}>Defines acceptable AI usage within the organization.</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Rollout Milestones</h3>
            <p className={styles.cardText}>Defines how AI tools are introduced gradually with checkpoints.</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Review Structure</h3>
            <p className={styles.cardText}>Defines monitoring and oversight practices.</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Operational Guidance</h3>
            <p className={styles.cardText}>Recommendations for managing adoption across the organization.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Architecture</p>
        <h2 className={styles.sectionHeading}>System design principles</h2>
        <div className={styles.principles}>
          <div className={styles.principle}>Deterministic decision model</div>
          <div className={styles.principle}>No training on user data</div>
          <div className={styles.principle}>Structured governance outputs</div>
          <div className={styles.principle}>Operational rollout focus</div>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Example output</p>
        <h2 className={styles.sectionHeading}>Example governance packet</h2>
        <div className={styles.examplePacket}>
          <div className={styles.examplePacketHeader}>
            <div>
              <div className={styles.examplePacketTitle}>AI Governance Packet</div>
              <div className={styles.examplePacketOrg}>
                Example Organization • Consulting Firm • 35 employees
              </div>
            </div>
            <div className={styles.examplePacketBadge}>Structured Rollout</div>
          </div>
          <div className={styles.examplePacketBody}>
            <div className={styles.exampleRow}>
              <div className={styles.exampleRowLabel}>Rollout Profile</div>
              <div className={styles.exampleRowValue}>
                Moderate posture. Phased introduction. Internal use tools only.
              </div>
            </div>
            <div className={styles.exampleRow}>
              <div className={styles.exampleRowLabel}>Guardrail Policy</div>
              <div className={styles.exampleRowValue}>
                No client data in AI prompts. Review required before external delivery.
              </div>
            </div>
            <div className={styles.exampleRow}>
              <div className={styles.exampleRowLabel}>Milestone Plan</div>
              <div className={styles.exampleRowValue}>
                4 stages. 60 day initial review gate. Leadership sign-off required at stage 2.
              </div>
            </div>
            <div className={styles.exampleRow}>
              <div className={styles.exampleRowLabel}>Risk Summary</div>
              <div className={styles.exampleRowValue}>
                Moderate data sensitivity. Workflow dependency risk flagged.
              </div>
            </div>
            <div className={styles.exampleRow}>
              <div className={styles.exampleRowLabel}>Operational Guidance</div>
              <div className={styles.exampleRowValue}>
                Designate an AI lead. Document tool decisions. Quarterly review cadence.
              </div>
            </div>
          </div>
          <div className={styles.examplePacketFooter}>
            Each row above represents a full document, not a single line. The actual
            packet contains multiple structured documents with detailed subsections,
            classified usage rules, phased rollout plans with entry and exit criteria,
            and policy language. What is shown here is a summary of document titles only.
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Generate your framework.</h2>
        <p className={styles.ctaBody}>
          Use the framework builder to produce a structured AI governance framework for your firm.
        </p>
        <Link href="/generate" className={styles.ctaLink}>
          Generate your framework
        </Link>
      </section>
    </div>
  );
}
