import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getArticleBySlug, getAllArticleSlugs, getArticlesByCategory } from '@/lib/supabase';
import { CATEGORY_SLUGS, type ArticleCategory } from '@/types';
import { ArticleCard } from '@/components/ArticleCard';
import { AdUnit } from '@/components/AdUnit';

export const revalidate = 3600;

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) return { title: 'Article Not Found' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kendallvilledaily.com';

  return {
    title: article.meta_title ?? article.title,
    description: article.meta_description ?? article.excerpt,
    keywords: article.tags ?? [],
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `${siteUrl}/article/${article.slug}`,
      type: 'article',
      publishedTime: article.published_at,
      images: article.hero_image_url ? [{ url: article.hero_image_url }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: article.hero_image_url ? [article.hero_image_url] : [],
    },
    alternates: {
      canonical: `${siteUrl}/article/${article.slug}`,
    },
  };
}

const CATEGORY_COLORS: Record<ArticleCategory, string> = {
  'Local News': 'bg-blue-600',
  'Weather': 'bg-sky-500',
  'Sports': 'bg-green-600',
  'Public Safety': 'bg-red-600',
  'Community Events': 'bg-purple-600',
  'Obituaries': 'bg-gray-600',
};

function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function ArticlePage({ params }: Props) {
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();

  const related = await getArticlesByCategory(article.category, 4);
  const relatedFiltered = related.filter((a) => a.id !== article.id).slice(0, 3);

  const categorySlug = CATEGORY_SLUGS[article.category as ArticleCategory];
  const categoryColor = CATEGORY_COLORS[article.category as ArticleCategory] ?? 'bg-gray-600';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kendallvilledaily.com';
  const articleUrl = `${siteUrl}/article/${article.slug}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Article */}
      <article className="lg:col-span-3">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 font-sans mb-4 flex items-center gap-2">
          <Link href="/" className="hover:text-newsred">Home</Link>
          <span>/</span>
          <Link href={`/category/${categorySlug}`} className="hover:text-newsred">
            {article.category}
          </Link>
          <span>/</span>
          <span className="truncate">{article.title.slice(0, 40)}</span>
        </nav>

        {/* Category */}
        <Link href={`/category/${categorySlug}`}>
          <span className={`${categoryColor} text-white category-badge px-3 py-1 mb-4 inline-block`}>
            {article.category}
          </span>
        </Link>

        {/* Headline */}
        <h1 className="font-serif font-bold text-3xl md:text-4xl leading-tight text-newsdark mb-4 mt-2">
          {article.title}
        </h1>

        {/* Deck */}
        <p className="text-gray-600 text-lg leading-relaxed mb-4 font-serif italic">
          {article.excerpt}
        </p>

        {/* Byline / meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 font-sans border-t border-b border-newsborder py-3 mb-6">
          <span>
            <strong className="text-gray-700">Kendallville Daily</strong>
          </span>
          <span>{formatDateLong(article.published_at)}</span>
          {article.source_name && (
            <span>
              Source:{' '}
              {article.source_url ? (
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-newsred hover:underline"
                >
                  {article.source_name}
                </a>
              ) : (
                article.source_name
              )}
            </span>
          )}
        </div>

        {/* Hero image */}
        {article.hero_image_url && (
          <div className="relative w-full h-64 md:h-96 mb-6 overflow-hidden">
            <Image
              src={article.hero_image_url}
              alt={article.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 66vw"
            />
          </div>
        )}

        {/* Body — article HTML from Claude */}
        <div
          className="article-body text-base leading-relaxed"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-6 pt-4 border-t border-newsborder">
            <span className="text-xs text-gray-500 font-sans uppercase tracking-widest mr-2">Tags:</span>
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 mr-1 mb-1 font-sans"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Share */}
        <div className="mt-6 pt-4 border-t border-newsborder flex items-center gap-3">
          <span className="text-xs text-gray-500 font-sans uppercase tracking-widest">Share:</span>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(article.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-black text-white px-3 py-1 font-sans hover:bg-gray-800 transition-colors"
          >
            𝕏 / Twitter
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-blue-700 text-white px-3 py-1 font-sans hover:bg-blue-800 transition-colors"
          >
            Facebook
          </a>
        </div>

        {/* AI disclosure */}
        <div className="mt-6 bg-gray-50 border border-gray-200 p-4 text-xs text-gray-500 font-sans">
          <strong>Editorial Note:</strong> This article was written by AI based on publicly available
          information from {article.source_name ?? 'public sources'}. Always verify important information
          with official sources.
        </div>

        {/* Ad between articles */}
        <div className="my-6">
          <AdUnit slot="in-article" format="horizontal" className="h-[90px]" />
        </div>

        {/* Related articles */}
        {relatedFiltered.length > 0 && (
          <section>
            <h2 className="font-sans font-bold text-sm uppercase tracking-widest border-b-2 border-newsdark pb-1 mb-4">
              More {article.category}
            </h2>
            <div className="divide-y divide-newsborder">
              {relatedFiltered.map((a) => (
                <ArticleCard key={a.id} article={a} variant="compact" />
              ))}
            </div>
          </section>
        )}
      </article>

      {/* Sidebar */}
      <aside className="lg:col-span-1 space-y-6">
        <AdUnit slot="article-sidebar-top" format="square" className="h-[250px] w-full" />

        <div className="border border-newsborder p-4">
          <h3 className="font-sans font-bold text-sm uppercase tracking-widest mb-3 border-b pb-2">
            More Sections
          </h3>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'Local News', href: '/category/local-news' },
              { label: 'Weather', href: '/category/weather' },
              { label: 'Sports', href: '/category/sports' },
              { label: 'Public Safety', href: '/category/public-safety' },
              { label: 'Community Events', href: '/category/community-events' },
              { label: 'Obituaries', href: '/category/obituaries' },
            ].map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-gray-700 hover:text-newsred transition-colors">
                  {item.label} →
                </a>
              </li>
            ))}
          </ul>
        </div>

        <AdUnit slot="article-sidebar-bottom" format="square" className="h-[250px] w-full" />
      </aside>
    </div>
  );
}
