import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/app/_content/articles";
import { buildPageMetadata, absoluteUrl, SITE_NAME } from "@/app/seo";
import styles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Governance Resources | Fulcral",
  description:
    "Practical guides on AI governance, policy, risk classification, and rollout planning for professional teams adopting AI tools.",
  path: "/resources",
  keywords: [
    "ai governance resources",
    "ai governance guides",
    "ai policy resources",
    "ai governance articles",
    "ai rollout guidance",
  ],
});

const categories = Array.from(new Set(articles.map((a) => a.category)));

export default function ResourcesPage() {
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
        name: "Resources",
        item: absoluteUrl("/resources"),
      },
    ],
  };

  return (
    <div className={styles.wrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section className={styles.header}>
        <span className={styles.eyebrow}>Resources</span>
        <h1 className={styles.title}>AI Governance Guides</h1>
        <p className={styles.intro}>
          Practical reading on AI governance, policy structure, risk classification, and rollout planning. Written for professional teams, not enterprise compliance departments.
        </p>
      </section>

      {categories.map((category) => {
        const categoryArticles = articles.filter((a) => a.category === category);
        return (
          <section key={category} className={styles.categorySection}>
            <h2 className={styles.categoryHeading}>{category}</h2>
            <div className={styles.articleGrid}>
              {categoryArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/resources/${article.slug}`}
                  className={styles.articleCard}
                >
                  <span className={styles.cardCategory}>{article.category}</span>
                  <h3 className={styles.cardTitle}>{article.title}</h3>
                  <p className={styles.cardDescription}>{article.description}</p>
                  <span className={styles.cardMeta}>{article.readingMinutes} min read</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Ready to build your governance framework?</h2>
        <p className={styles.ctaBody}>
          Four questions. Under a minute. A structured AI governance packet your team can actually use.
        </p>
        <div className={styles.ctaActions}>
          <Link href="/generate" className={styles.ctaPrimary}>
            Generate your framework
          </Link>
          <Link href="/how-it-works" className={styles.ctaSecondary}>
            How it works
          </Link>
        </div>
      </section>
    </div>
  );
}
