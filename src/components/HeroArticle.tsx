import Link from 'next/link';
import Image from 'next/image';
import type { Article, ArticleCategory } from '@/types';
import { CATEGORY_SLUGS } from '@/types';

const CATEGORY_COLORS: Record<ArticleCategory, string> = {
  'Local News': 'bg-blue-600',
  'Weather': 'bg-sky-500',
  'Sports': 'bg-green-600',
  'Public Safety': 'bg-red-600',
  'Community Events': 'bg-purple-600',
  'Obituaries': 'bg-gray-600',
};

interface HeroArticleProps {
  article: Article;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function HeroArticle({ article }: HeroArticleProps) {
  const categoryColor = CATEGORY_COLORS[article.category as ArticleCategory] ?? 'bg-gray-600';
  const categorySlug = CATEGORY_SLUGS[article.category as ArticleCategory] ?? 'local-news';

  return (
    <article className="group relative">
      {/* Hero image */}
      <div className="relative w-full h-72 md:h-96 overflow-hidden mb-4">
        {article.hero_image_url ? (
          <Image
            src={article.hero_image_url}
            alt={article.title}
            fill
            priority
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 66vw"
          />
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Category badge on image */}
        <div className="absolute bottom-4 left-4">
          <Link href={`/category/${categorySlug}`}>
            <span className={`${categoryColor} text-white category-badge px-3 py-1`}>
              {article.category}
            </span>
          </Link>
        </div>
      </div>

      {/* Headline */}
      <h1
        className="font-serif font-bold leading-tight mb-3 text-newsdark"
        style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
      >
        <Link href={`/article/${article.slug}`} className="hover:text-newsred transition-colors">
          {article.title}
        </Link>
      </h1>

      {/* Excerpt */}
      <p className="text-gray-600 text-base leading-relaxed mb-3">
        {article.excerpt}
      </p>

      {/* Byline */}
      <div className="flex items-center gap-2 text-sm text-gray-500 font-sans border-t border-newsborder pt-3">
        <span>{formatDate(article.published_at)}</span>
        {article.source_name && (
          <>
            <span>·</span>
            <span>Source: {article.source_name}</span>
          </>
        )}
        <span className="ml-auto">
          <Link
            href={`/article/${article.slug}`}
            className="text-newsred hover:underline font-bold text-xs uppercase tracking-wide"
          >
            Read More →
          </Link>
        </span>
      </div>
    </article>
  );
}
