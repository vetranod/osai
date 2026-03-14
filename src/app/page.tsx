import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, buildPageMetadata, SITE_NAME } from "./seo";
import { articles } from "./_content/articles";
import { guideLinks } from "./_marketing/guides";
import styles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Governance Framework for Small Teams | DeploySure",
  description:
    "Generate a structured AI governance framework for your small professional team in under a minute with rollout pacing, guardrails, and a polished governance packet.",
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

function StructureMotif({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? styles.structureMotifCompact : styles.structureMotif} aria-hidden="true">
      <span className={styles.structureCell} />
      <span className={styles.structureCell} />
      <span className={`${styles.structureCell} ${styles.structureCellAccent}`} />
      <span className={styles.structureCell} />
    </div>
  );
}

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
            Generate a structured AI governance framework for your small team in under a minute.
          </p>
          <p className={styles.heroDefinition}>
            Built for small professional teams adopting AI tools without a clear rollout plan.
          </p>
          <div className={styles.heroActions}>
            <Link href="/generate" className={styles.ctaPrimary}>
              Create your framework
            </Link>
            <p className={styles.heroCtaNote}>No AI-written policy text.</p>
          </div>
          <p className={styles.heroProof}>
            Designed with small professional teams in mind, from engineering firms to law practices and agencies.
          </p>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.heroVisualFrame}>
            <div className={styles.heroVisualLead}>
              <StructureMotif compact />
              <span className={styles.heroVisualCaption}>
                Structured rollout logic for small-team adoption.
              </span>
            </div>
            <PacketPreview compact />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>The problem</p>
        <h2 className={styles.sectionHeading}>Why AI adoption becomes chaotic</h2>
        <div className={styles.prose}>
          <p>
            AI adoption usually follows the same pattern when there is no rollout structure.
          </p>
        </div>
        <div className={styles.problemList}>
          <div className={styles.problemItem}>
            <span className={styles.problemItemTitle}>Discovery</span>
            <span className={styles.problemItemText}>Someone finds a tool that saves time.</span>
          </div>
          <div className={styles.problemItem}>
            <span className={styles.problemItemTitle}>Spread</span>
            <span className={styles.problemItemText}>A colleague starts using it too, and the behavior becomes normal.</span>
          </div>
          <div className={styles.problemItem}>
            <span className={styles.problemItemTitle}>Dependence</span>
            <span className={styles.problemItemText}>The tool reaches real workflows before anyone defines the rules.</span>
          </div>
          <div className={styles.problemItem}>
            <span className={styles.problemItemTitle}>Late control</span>
            <span className={styles.problemItemText}>Leadership tries to add structure only after AI use is already operational.</span>
          </div>
        </div>
        <p className={styles.problemOutro}>
          DeploySure gives small teams a way to introduce structure before AI use becomes unmanaged operational risk.
        </p>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>System overview</p>
        <h2 className={styles.sectionHeading}>How the system works at a glance</h2>
        <div className={styles.diagram}>
          <div className={styles.diagramBlock}>
            <p className={styles.diagramBlockLabel}>Inputs</p>
            <ul className={styles.diagramList}>
              <li>Goal: what AI should achieve</li>
              <li>Adoption level: how widely tools are already used</li>
              <li>Data sensitivity: what information is in play</li>
              <li>Leadership posture: how tightly rollout should be controlled</li>
            </ul>
          </div>
          <div className={styles.diagramArrow}>
            <div className={styles.diagramArrowLine} />
            <div className={styles.diagramArrowHead} />
          </div>
          <div className={`${styles.diagramBlock} ${styles.diagramBlockAccent}`}>
            <p className={styles.diagramBlockLabel}>Decision Engine</p>
            <p className={styles.diagramBlockSub}>
              Deterministic model turns those inputs into rollout posture, guardrails, and review expectations.
            </p>
          </div>
          <div className={styles.diagramArrow}>
            <div className={styles.diagramArrowLine} />
            <div className={styles.diagramArrowHead} />
          </div>
          <div className={styles.diagramBlock}>
            <p className={styles.diagramBlockLabel}>AI Governance Framework</p>
            <p className={styles.diagramBlockSub}>
              A ready-to-use framework with rollout guidance, policy boundaries, and milestone checkpoints.
            </p>
          </div>
        </div>
        <div className={styles.sectionSupportRow}>
          <StructureMotif compact />
          <p className={styles.sectionSupport}>
            Small teams answer a few questions and get a clear, ready-to-use rollout framework instead of a blank page.
          </p>
        </div>
      </section>

      <section className={styles.section} id="framework-preview">
        <p className={styles.sectionLabel}>What you receive</p>
        <h2 className={styles.sectionHeading}>Your AI Governance Framework</h2>
        <div className={styles.frameworkSection}>
          <PacketPreview />
          <div className={styles.frameworkContent}>
            <p className={styles.frameworkText}>
              The packet gives a small team one clear operating position instead of scattered decisions across people and workflows.
            </p>

            <div className={styles.frameworkIncludes}>
              <p className={styles.frameworkIncludesTitle}>Your framework includes:</p>
              <div className={styles.frameworkFeature}>
                <p className={styles.frameworkFeatureTitle}>Rollout Profile</p>
                <p className={styles.frameworkFeatureText}>
                  Helps leadership decide how quickly AI should expand and where controls should tighten first.
                </p>
              </div>
              <div className={styles.frameworkFeature}>
                <p className={styles.frameworkFeatureTitle}>Guardrail Policy</p>
                <p className={styles.frameworkFeatureText}>
                  Clarifies what work can use AI, what needs review, and what should stay restricted.
                </p>
              </div>
              <div className={styles.frameworkFeature}>
                <p className={styles.frameworkFeatureTitle}>Operational Guidelines</p>
                <p className={styles.frameworkFeatureText}>
                  Gives the team a practical standard for everyday use instead of relying on individual judgment.
                </p>
              </div>
              <div className={styles.frameworkFeature}>
                <p className={styles.frameworkFeatureTitle}>Milestone Rollout Plan</p>
                <p className={styles.frameworkFeatureText}>
                  Shows how to expand adoption in stages instead of letting tool use spread by drift.
                </p>
              </div>
            </div>

            <div className={styles.frameworkCallout}>
              <StructureMotif compact />
              <p className={styles.frameworkCredibility}>
                No AI-generated policy text. Every packet is produced by the same deterministic process. Inputs change the output. The process does not.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Audience</p>
        <h2 className={styles.sectionHeading}>Designed for small teams</h2>
        <p className={styles.forIntro}>
          Built for small professional firms and small businesses that want AI productivity without losing operational control.
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
          Best suited to teams with fewer than 25 employees and other small businesses that need rollout planning and governance structure.
        </p>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Guides</p>
        <h2 className={styles.sectionHeading}>Explore AI governance by use case</h2>
        <p className={styles.guidesIntro}>
          These guides help small teams understand where a governance framework fits before they enter the builder.
        </p>
        <div className={styles.guideGrid}>
          {guideLinks.map((guide) => (
            <Link key={guide.href} href={guide.href} className={styles.guideCard}>
              <h3 className={styles.guideCardTitle}>{guide.title}</h3>
              <p className={styles.guideCardText}>{guide.text}</p>
              <span className={styles.guideMeta}>{guide.readMinutes} min guide</span>
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
          Create your framework in under a minute.
        </h2>
        <p className={styles.bottomCtaBody}>
          Generate a structured AI governance framework for your small team before AI use becomes unmanaged operational risk.
        </p>
        <div className={styles.bottomCtaActions}>
          <Link href="/generate" className={styles.ctaPrimaryInverted}>
            Create your framework
          </Link>
          <Link href="/how-it-works" className={styles.ctaSecondaryInverted}>
            How DeploySure Works
          </Link>
        </div>
      </section>
    </div>
  );
}
