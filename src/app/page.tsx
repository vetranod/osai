import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, buildPageMetadata, SITE_NAME } from "./seo";
import { articles } from "./_content/articles";
import styles from "./page.module.css";

const GUIDE_LINKS = [
  {
    href: "/ai-governance-for-law-firms",
    title: "AI Governance for Law Firms",
    text: "Clarify rollout boundaries and review expectations for confidentiality-heavy legal work.",
  },
  {
    href: "/ai-governance-for-consulting-firms",
    title: "AI Governance for Consulting Firms",
    text: "Balance delivery speed with stronger guardrails for client-facing consulting teams.",
  },
  {
    href: "/ai-policy-for-small-business",
    title: "AI Policy for Small Business",
    text: "Give smaller teams a practical AI operating position before ad hoc usage becomes the norm.",
  },
  {
    href: "/ai-governance-framework-vs-ai-policy",
    title: "AI Governance Framework vs AI Policy",
    text: "Understand why a rules document alone is not the same thing as a rollout framework.",
  },
] as const;

export const metadata: Metadata = buildPageMetadata({
  title: "AI Governance Framework for Small Teams | DeploySure",
  description:
    "Generate a structured AI governance framework with rollout pacing, review controls, usage guardrails, and a polished governance packet for your firm.",
  path: "/",
  keywords: [
    "AI governance framework",
    "AI policy for small business",
    "AI governance for law firms",
    "AI governance for consultants",
    "AI rollout plan",
    "AI guardrail policy",
  ],
});

function PacketPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? styles.packetCardCompact : styles.packetCard}>
      <div className={styles.packetHeader}>
        <div>
          <div className={styles.packetTitle}>AI Governance Framework</div>
          <div className={styles.packetMeta}>DeploySure - Confidential</div>
        </div>
        <div className={styles.packetBadge}>Structured Rollout</div>
      </div>

      <div className={styles.packetBody}>
        <div className={styles.packetRow}>
          <div className={styles.packetRowLabel}>Rollout Profile</div>
          <div className={styles.packetRowValue}>
            Balanced adoption posture with staged implementation.
          </div>
        </div>
        <div className={styles.packetRow}>
          <div className={styles.packetRowLabel}>Guardrail Policy</div>
          <div className={styles.packetRowValue}>
            Internal information permitted. Client data restricted.
          </div>
        </div>
        <div className={styles.packetRow}>
          <div className={styles.packetRowLabel}>Operational Guidelines</div>
          <div className={styles.packetRowValue}>
            Approved use cases and review procedures.
          </div>
        </div>
        <div className={styles.packetRow}>
          <div className={styles.packetRowLabel}>Milestone Rollout Plan</div>
          <div className={styles.packetRowValue}>
            Four structured phases with leadership checkpoints.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    description:
      "DeploySure helps professional teams generate a structured AI governance framework with rollout guardrails, review controls, and implementation milestones.",
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "150",
      availability: "https://schema.org/InStock",
      url: absoluteUrl("/generate"),
    },
  };

  return (
    <div className={styles.wrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroKicker}>DeploySure</span>
          <h1 className={styles.heroHeadline}>Deploy AI without losing control.</h1>
          <p className={styles.heroSubheadline}>
            Generate a structured AI governance framework for your firm in under a minute.
          </p>
          <p className={styles.heroDefinition}>
            Built for professional teams adopting AI tools without a clear rollout plan.
          </p>
          <div className={styles.heroActions}>
            <Link href="/generate" className={styles.ctaPrimary}>
              Generate your framework
            </Link>
            <Link href="/how-it-works" className={styles.ctaSecondary}>
              How it works
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <PacketPreview compact />
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>The problem</p>
        <h2 className={styles.sectionHeading}>Why AI adoption becomes chaotic</h2>
        <div className={styles.prose}>
          <p>
            AI adoption often begins informally. Someone discovers a tool that saves
            time. A colleague begins using it as well. Soon the tool spreads across
            the team.
          </p>
          <p>
            By the time leadership notices, the technology may already be embedded
            in critical workflows. Organizations then attempt to add structure after
            the technology is already operational. The system provides a way to
            introduce structure before AI adoption becomes unmanaged operational risk.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>System overview</p>
        <h2 className={styles.sectionHeading}>How the system works at a glance</h2>
        <div className={styles.diagram}>
          <div className={styles.diagramBlock}>
            <p className={styles.diagramBlockLabel}>Inputs</p>
            <ul className={styles.diagramList}>
              <li>Goal</li>
              <li>Adoption level</li>
              <li>Data sensitivity</li>
              <li>Leadership posture</li>
            </ul>
          </div>
          <div className={styles.diagramArrow}>
            <div className={styles.diagramArrowLine} />
            <div className={styles.diagramArrowHead} />
          </div>
          <div className={`${styles.diagramBlock} ${styles.diagramBlockAccent}`}>
            <p className={styles.diagramBlockLabel}>Decision Engine</p>
            <p className={styles.diagramBlockSub}>
              Deterministic model evaluates inputs and determines rollout posture
            </p>
          </div>
          <div className={styles.diagramArrow}>
            <div className={styles.diagramArrowLine} />
            <div className={styles.diagramArrowHead} />
          </div>
          <div className={styles.diagramBlock}>
            <p className={styles.diagramBlockLabel}>AI Governance Framework</p>
            <p className={styles.diagramBlockSub}>
              Rollout structure, guardrails, and governance documentation
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="framework-preview">
        <p className={styles.sectionLabel}>What you receive</p>
        <h2 className={styles.sectionHeading}>Your AI Governance Framework</h2>
        <div className={styles.frameworkSection}>
          <PacketPreview />
          <div className={styles.frameworkContent}>
            <p className={styles.frameworkText}>
              The system generates a structured AI Governance Packet that defines
              how AI tools should be introduced and governed within the organization.
            </p>
            <p className={styles.frameworkText}>
              This packet becomes the operational framework for rollout. It is
              built from pre-written, locked content and is not generated by AI.
            </p>

            <div className={styles.frameworkIncludes}>
              <p className={styles.frameworkIncludesTitle}>Your framework includes:</p>
              <ul className={styles.frameworkList}>
                <li>rollout pacing guidance</li>
                <li>guardrail policy recommendations</li>
                <li>operational usage guidelines</li>
                <li>milestone-based adoption structure</li>
              </ul>
            </div>

            <p className={styles.frameworkCredibility}>
              No AI-generated policy text. Every packet is produced by the same
              deterministic process. Inputs change the output. The process does not.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Audience</p>
        <h2 className={styles.sectionHeading}>Designed for small teams</h2>
        <p className={styles.forIntro}>
          The system is intended for organizations that want the productivity
          benefits of AI while maintaining operational control.
        </p>
        <div className={styles.forGrid}>
          <div className={styles.forItem}>Engineering firms</div>
          <div className={styles.forItem}>Consulting firms</div>
          <div className={styles.forItem}>Architecture studios</div>
          <div className={styles.forItem}>Law firms</div>
          <div className={styles.forItem}>Financial advisory teams</div>
          <div className={styles.forItem}>Professional agencies</div>
        </div>
        <p className={styles.forNote}>
          These firms often adopt AI organically without a formal rollout plan.
          DeploySure is best suited to teams with fewer than 25 employees and
          other small businesses that need rollout planning and governance structure.
        </p>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Guides</p>
        <h2 className={styles.sectionHeading}>Explore AI governance by use case</h2>
        <p className={styles.guidesIntro}>
          These public guides are designed to answer narrower search intent and help teams
          understand where a governance framework fits before they enter the builder.
        </p>
        <div className={styles.guideGrid}>
          {GUIDE_LINKS.map((guide) => (
            <Link key={guide.href} href={guide.href} className={styles.guideCard}>
              <h3 className={styles.guideCardTitle}>{guide.title}</h3>
              <p className={styles.guideCardText}>{guide.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Resources</p>
        <h2 className={styles.sectionHeading}>Practical reading on AI governance</h2>
        <p className={styles.guidesIntro}>
          Educational guides on frameworks, policy, risk classification, and rollout planning for teams that want to understand the subject before they build.
        </p>
        <div className={styles.resourceGrid}>
          {articles.slice(0, 4).map((article) => (
            <Link key={article.slug} href={`/resources/${article.slug}`} className={styles.resourceCard}>
              <span className={styles.resourceCategory}>{article.category}</span>
              <h3 className={styles.resourceCardTitle}>{article.title}</h3>
              <p className={styles.resourceCardText}>{article.description}</p>
              <span className={styles.resourceMeta}>{article.readingMinutes} min read</span>
            </Link>
          ))}
        </div>
        <div className={styles.resourcesFooter}>
          <Link href="/resources" className={styles.resourcesAllLink}>
            View all resources
          </Link>
        </div>
      </section>

      <section className={styles.bottomCta}>
        <p className={styles.bottomCtaKicker}>
          Define how AI operates in your firm before it defines itself.
        </p>
        <h2 className={styles.bottomCtaHeadline}>
          Create your AI governance framework in under a minute.
        </h2>
        <p className={styles.bottomCtaBody}>
          A clear operational framework for organizations that want to adopt AI responsibly.
        </p>
        <div className={styles.bottomCtaActions}>
          <Link href="/generate" className={styles.ctaPrimaryInverted}>
            Start framework builder
          </Link>
          <Link href="/how-it-works" className={styles.ctaSecondaryInverted}>
            How DeploySure Works
          </Link>
        </div>
      </section>
    </div>
  );
}
