import Link from "next/link";
import { absoluteUrl, SITE_NAME } from "@/app/seo";
import styles from "./guide-page.module.css";

type Card = {
  title: string;
  text: string;
};

type Faq = {
  question: string;
  answer: string;
};

type RelatedLink = {
  href: string;
  title: string;
  text: string;
};

type GuidePageProps = {
  path: string;
  eyebrow: string;
  title: string;
  intro: string;
  heroMeta: string[];
  snapshotLabel: string;
  snapshotRows: Array<{ label: string; value: string }>;
  challengeHeading: string;
  challengeIntro: string[];
  challengeCards: Card[];
  packetHeading: string;
  packetIntro: string[];
  packetCards: Card[];
  outcomeHeading: string;
  outcomeItems: string[];
  faqHeading: string;
  faqItems: Faq[];
  ctaTitle: string;
  ctaBody: string;
  relatedLinks: RelatedLink[];
};

export function GuidePage({
  path,
  eyebrow,
  title,
  intro,
  heroMeta,
  snapshotLabel,
  snapshotRows,
  challengeHeading,
  challengeIntro,
  challengeCards,
  packetHeading,
  packetIntro,
  packetCards,
  outcomeHeading,
  outcomeItems,
  faqHeading,
  faqItems,
  ctaTitle,
  ctaBody,
  relatedLinks,
}: GuidePageProps) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: absoluteUrl(path),
    description: intro,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: SITE_NAME,
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: absoluteUrl(path),
      },
    ],
  };

  return (
    <div className={styles.wrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.intro}>{intro}</p>
          <div className={styles.heroMeta}>
            {heroMeta.map((item) => (
              <span key={item} className={styles.metaChip}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <aside className={styles.heroCard}>
          <div className={styles.heroCardHeader}>
            <div>
              <div className={styles.heroCardTitle}>Governance Snapshot</div>
              <div className={styles.heroCardMeta}>{snapshotLabel}</div>
            </div>
            <div className={styles.heroCardBadge}>Search entry page</div>
          </div>
          <div className={styles.heroCardBody}>
            {snapshotRows.map((row) => (
              <div key={row.label} className={styles.heroCardRow}>
                <div className={styles.heroCardLabel}>{row.label}</div>
                <div className={styles.heroCardValue}>{row.value}</div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Where teams get stuck</span>
        <h2 className={styles.sectionHeading}>{challengeHeading}</h2>
        <div className={styles.prose}>
          {challengeIntro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className={styles.cardGrid} style={{ marginTop: 26 }}>
          {challengeCards.map((card) => (
            <div key={card.title} className={styles.card}>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardText}>{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>What the packet clarifies</span>
        <h2 className={styles.sectionHeading}>{packetHeading}</h2>
        <div className={styles.prose}>
          {packetIntro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className={styles.cardGrid} style={{ marginTop: 26 }}>
          {packetCards.map((card) => (
            <div key={card.title} className={styles.card}>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardText}>{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>What good looks like</span>
        <h2 className={styles.sectionHeading}>{outcomeHeading}</h2>
        <div className={styles.checklist}>
          {outcomeItems.map((item) => (
            <div key={item} className={styles.checkItem}>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Common questions</span>
        <h2 className={styles.sectionHeading}>{faqHeading}</h2>
        <div className={styles.faqList}>
          {faqItems.map((item) => (
            <div key={item.question} className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>{item.question}</h3>
              <p className={styles.faqAnswer}>{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>{ctaTitle}</h2>
        <p className={styles.ctaBody}>{ctaBody}</p>
        <div className={styles.ctaActions}>
          <Link href="/generate" className={styles.ctaPrimary}>
            Generate your framework
          </Link>
          <Link href="/how-it-works" className={styles.ctaSecondary}>
            Review the methodology
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Related guides</span>
        <h2 className={styles.sectionHeading}>Explore adjacent use cases</h2>
        <div className={styles.relatedGrid}>
          {relatedLinks.map((link) => (
            <Link key={link.href} href={link.href} className={styles.relatedCard}>
              <h3 className={styles.relatedTitle}>{link.title}</h3>
              <p className={styles.relatedText}>{link.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
