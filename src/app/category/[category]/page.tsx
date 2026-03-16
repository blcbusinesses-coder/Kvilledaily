import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getArticlesByCategory } from '@/lib/supabase';
import { SLUG_TO_CATEGORY, CATEGORIES } from '@/types';
import { ArticleCard } from '@/components/ArticleCard';
import { AdUnit } from '@/components/AdUnit';

export const revalidate = 3600;

interface Props {
  params: { category: string };
}

export async function generateStaticParams() {
  return CATEGORIES.map((cat) => ({
    category: cat.toLowerCase().replace(/\s+/g, '-'),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = SLUG_TO_CATEGORY[params.category];
  if (!category) return { title: 'Not Found' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kendallvilledaily.com';

  return {
    title: `${category} — Kendallville, Indiana`,
    description: `Latest ${category.toLowerCase()} news and updates from Kendallville and Noble County, Indiana.`,
    alternates: {
      canonical: `${siteUrl}/category/${params.category}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = SLUG_TO_CATEGORY[params.category];
  if (!category) notFound();

  const articles = await getArticlesByCategory(category, 24);

  return (
    <div>
      {/* Category header */}
      <div className="border-b-2 border-newsdark mb-6 pb-2">
        <h1 className="font-sans font-bold text-2xl uppercase tracking-widest text-newsdark">
          {category}
        </h1>
        <p className="text-sm text-gray-500 font-sans mt-1">
          Kendallville &amp; Noble County, Indiana
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Article list */}
        <div className="lg:col-span-3">
          {articles.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-400 text-lg font-serif">
                No {category.toLowerCase()} articles yet.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Check back after the next daily update at 6:00 AM.
              </p>
            </div>
          ) : (
            <>
              {/* Featured first article */}
              <div className="mb-6 pb-6 border-b border-newsborder">
                <ArticleCard article={articles[0]} variant="featured" />
              </div>

              {/* Grid for rest */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {articles.slice(1, 5).map((article) => (
                  <ArticleCard key={article.id} article={article} variant="featured" />
                ))}
              </div>

              {/* Ad */}
              <div className="my-4">
                <AdUnit slot={`category-${params.category}`} format="horizontal" className="h-[90px]" />
              </div>

              {/* Remaining as list */}
              {articles.length > 5 && (
                <div className="divide-y divide-newsborder">
                  {articles.slice(5).map((article) => (
                    <ArticleCard key={article.id} article={article} variant="default" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          <AdUnit slot="category-sidebar" format="square" className="h-[250px] w-full" />

          <div className="border border-newsborder p-4">
            <h3 className="font-sans font-bold text-sm uppercase tracking-widest mb-3 border-b pb-2">
              Other Sections
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Local News', href: '/category/local-news' },
                { label: 'Weather', href: '/category/weather' },
                { label: 'Sports', href: '/category/sports' },
                { label: 'Public Safety', href: '/category/public-safety' },
                { label: 'Community Events', href: '/category/community-events' },
                { label: 'Obituaries', href: '/category/obituaries' },
              ]
                .filter((item) => item.href !== `/category/${params.category}`)
                .map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="text-gray-700 hover:text-newsred transition-colors">
                      {item.label} →
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
