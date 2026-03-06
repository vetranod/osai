import Link from "next/link";
import { absoluteUrl, SITE_NAME } from "@/app/seo";
import { guideLinks } from "@/app/_marketing/guides";
import type { Article, ArticleBlock } from "@/app/_content/articles";
import styles from "./article-page.module.css";

function renderBlock(block: ArticleBlock, index: number) {
  switch (block.type) {
    case "h2":
      return <h2 key={index} className={styles.articleH2}>{block.text}</h2>;
    case "h3":
      return <h3 key={index} className={styles.articleH3}>{block.text}</h3>;
    case "p":
      return <p key={index} className={styles.articleP}>{block.text}</p>;
    case "list":
      return (
        <ul key={index} className={styles.articleList}>
          {block.items.map((item) => (
            <li key={item} className={styles.articleListItem}>{item}</li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <div key={index} className={styles.articleCallout}>
          <p>{block.text}</p>
        </div>
      );
  }
}

type ArticlePageProps = {
  article: Article;
  relatedArticles: Article[];
};

export function ArticlePage({ article, relatedArticles }: ArticlePageProps) {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    url: absoluteUrl(`/resources/${article.slug}`),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/resources/${article.slug}`),
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
        name: "Resources",
        item: absoluteUrl("/resources"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: absoluteUrl(`/resources/${article.slug}`),
      },
    ],
  };

  const relatedGuides = article.relatedGuideHrefs
    .map((href) => guideLinks.find((g) => g.href === href))
    .filter((g): g is (typeof guideLinks)[number] => g !== undefined);

  const publishedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={styles.wrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/" className={styles.breadcrumbLink}>Home</Link>
        <span className={styles.breadcrumbSep}>›</span>
        <Link href="/resources" className={styles.breadcrumbLink}>Resources</Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span className={styles.breadcrumbCurrent}>{article.title}</span>
      </nav>

      <header className={styles.header}>
        <span className={styles.categoryChip}>{article.category}</span>
        <h1 className={styles.title}>{article.title}</h1>
        <p className={styles.intro}>{article.intro}</p>
        <div className={styles.meta}>
          <span className={styles.metaItem}>{publishedDate}</span>
          <span className={styles.metaDot} aria-hidden="true" />
          <span className={styles.metaItem}>{article.readingMinutes} min read</span>
        </div>
      </header>

      <div className={styles.layout}>
        <article className={styles.body}>
          {article.body.map((block, i) => renderBlock(block, i))}
        </article>
      </div>

      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>See what your governance framework looks like.</h2>
        <p className={styles.ctaBody}>
          Answer four questions about how your firm uses AI and get a structured governance packet in under a minute. No AI-generated policy text. The same deterministic process every time.
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

      {relatedArticles.length > 0 && (
        <section className={styles.relatedSection}>
          <span className={styles.relatedLabel}>Keep reading</span>
          <h2 className={styles.relatedHeading}>Related resources</h2>
          <div className={styles.relatedGrid}>
            {relatedArticles.map((related) => (
              <Link
                key={related.slug}
                href={`/resources/${related.slug}`}
                className={styles.relatedCard}
              >
                <span className={styles.relatedCategory}>{related.category}</span>
                <h3 className={styles.relatedTitle}>{related.title}</h3>
                <p className={styles.relatedText}>{related.description}</p>
                <span className={styles.relatedMeta}>{related.readingMinutes} min read</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {relatedGuides.length > 0 && (
        <section className={styles.relatedSection}>
          <span className={styles.relatedLabel}>Industry guides</span>
          <h2 className={styles.relatedHeading}>Explore by use case</h2>
          <div className={styles.relatedGrid}>
            {relatedGuides.map((guide) => (
              <Link key={guide.href} href={guide.href} className={styles.relatedCard}>
                <h3 className={styles.relatedTitle}>{guide.title}</h3>
                <p className={styles.relatedText}>{guide.text}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
