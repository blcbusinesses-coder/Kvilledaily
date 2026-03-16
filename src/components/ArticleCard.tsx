import Link from 'next/link';
import Image from 'next/image';
import type { Article, ArticleCategory } from '@/types';
import { CATEGORY_SLUGS } from '@/types';

const CATEGORY_COLORS: Record<ArticleCategory, string> = {
  'Local News': 'bg-blue-100 text-blue-800',
  'Weather': 'bg-sky-100 text-sky-800',
  'Sports': 'bg-green-100 text-green-800',
  'Public Safety': 'bg-red-100 text-red-800',
  'Community Events': 'bg-purple-100 text-purple-800',
  'Obituaries': 'bg-gray-100 text-gray-700',
};

interface ArticleCardProps {
  article: Article;
  variant?: 'default' | 'compact' | 'featured';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ArticleCard({ article, variant = 'default' }: ArticleCardProps) {
  const categoryColor = CATEGORY_COLORS[article.category as ArticleCategory] ?? 'bg-gray-100 text-gray-700';
  const categorySlug = CATEGORY_SLUGS[article.category as ArticleCategory] ?? 'local-news';
  const articleUrl = `/article/${article.slug}`;

  if (variant === 'compact') {
    return (
      <article className="py-3">
        <Link href={`/category/${categorySlug}`}>
          <span className={`category-badge ${categoryColor} mb-1`}>
            {article.category}
          </span>
        </Link>
        <h3 className="font-serif font-bold text-base leading-tight mb-1">
          <Link href={articleUrl} className="hover:text-newsred transition-colors">
            {article.title}
          </Link>
        </h3>
        <p className="text-xs text-gray-500 font-sans">{formatDate(article.published_at)}</p>
      </article>
    );
  }

  if (variant === 'featured') {
    return (
      <article className="group">
        {article.hero_image_url && (
          <div className="relative w-full h-64 mb-3 overflow-hidden">
            <Image
              src={article.hero_image_url}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}
        <Link href={`/category/${categorySlug}`}>
          <span className={`category-badge ${categoryColor} mb-2`}>
            {article.category}
          </span>
        </Link>
        <h2 className="font-serif font-bold text-2xl leading-tight mb-2 mt-1">
          <Link href={articleUrl} className="hover:text-newsred transition-colors">
            {article.title}
          </Link>
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-2">{article.excerpt}</p>
        <p className="text-xs text-gray-400 font-sans">
          {formatDate(article.published_at)}
          {article.source_name && ` · ${article.source_name}`}
        </p>
      </article>
    );
  }

  // Default card
  return (
    <article className="group flex gap-3 py-4">
      {article.hero_image_url && (
        <div className="relative flex-shrink-0 w-24 h-20 overflow-hidden">
          <Image
            src={article.hero_image_url}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="96px"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <Link href={`/category/${categorySlug}`}>
          <span className={`category-badge ${categoryColor} mb-1`}>
            {article.category}
          </span>
        </Link>
        <h3 className="font-serif font-bold text-base leading-tight mb-1">
          <Link href={articleUrl} className="hover:text-newsred transition-colors line-clamp-2">
            {article.title}
          </Link>
        </h3>
        <p className="text-gray-600 text-xs leading-relaxed line-clamp-2 mb-1">
          {article.excerpt}
        </p>
        <p className="text-xs text-gray-400 font-sans">{formatDate(article.published_at)}</p>
      </div>
    </article>
  );
}
