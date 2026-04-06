import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articles, getArticleBySlug, getRelatedArticles } from "@/app/_content/articles";
import { ArticlePage } from "@/app/_marketing/ArticlePage";
import { buildPageMetadata } from "@/app/seo";

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  return buildPageMetadata({
    title: `${article.title} | Fulcral`,
    description: article.description,
    path: `/resources/${article.slug}`,
    keywords: article.keywords,
  });
}

export default async function ResourceArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const relatedArticles = getRelatedArticles(article.slug, article.relatedSlugs);

  return <ArticlePage article={article} relatedArticles={relatedArticles} />;
}
