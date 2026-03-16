import { Suspense } from 'react';
import { getTodaysTopArticles, getArticles } from '@/lib/supabase';
import { HeroArticle } from '@/components/HeroArticle';
import { ArticleCard } from '@/components/ArticleCard';
import { AdUnit } from '@/components/AdUnit';
import { WeatherWidget } from '@/components/WeatherWidget';

export const revalidate = 0; // Always fresh in dev; change to 3600 for production

export default async function HomePage() {
  const [topArticles, recentArticles] = await Promise.all([
    getTodaysTopArticles(6),
    getArticles(20),
  ]);

  const hero = topArticles[0] ?? recentArticles[0];
  const secondary = topArticles.slice(1, 3);
  const remaining = topArticles.slice(3);

  if (!hero) {
    return (
      <div className="py-24 text-center">
        <h2 className="font-serif text-3xl font-bold mb-4 text-newsdark">Welcome to Kendallville Daily</h2>
        <p className="text-gray-500 mb-2">The first batch of articles hasn't been generated yet.</p>
        <p className="text-gray-400 text-sm">
          Run <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">npm run pipeline</code> to generate
          today's articles, or wait for the automated 6 AM run.
        </p>
        <p className="text-gray-400 text-xs mt-4">
          Make sure you've run the Supabase SQL migration first — see README.md.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Breaking news bar */}
      {hero && (
        <div className="bg-newsred text-white py-1 px-3 mb-4 flex items-center gap-2 text-sm font-sans">
          <span className="font-bold uppercase tracking-widest text-xs bg-white text-newsred px-2 py-0.5">
            Latest
          </span>
          <span className="truncate">{hero.title}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-3">
          {/* Hero article */}
          {hero && (
            <section className="mb-6 pb-6 border-b-2 border-newsdark">
              <HeroArticle article={hero} />
            </section>
          )}

          {/* Secondary featured articles */}
          {secondary.length > 0 && (
            <section className="mb-6 pb-6 border-b border-newsborder">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {secondary.map((article) => (
                  <ArticleCard key={article.id} article={article} variant="featured" />
                ))}
              </div>
            </section>
          )}

          {/* Mid-page ad */}
          <div className="my-4">
            <AdUnit slot="mid-content" format="horizontal" className="h-[90px]" />
          </div>

          {/* Remaining top articles */}
          {remaining.length > 0 && (
            <section className="mb-6">
              <h2 className="font-sans font-bold text-sm uppercase tracking-widest border-b-2 border-newsdark pb-1 mb-4">
                More Top Stories
              </h2>
              <div className="divide-y divide-newsborder">
                {remaining.map((article) => (
                  <ArticleCard key={article.id} article={article} variant="default" />
                ))}
              </div>
            </section>
          )}

          {/* Recent articles list */}
          {recentArticles.length > 0 && (
            <section>
              <h2 className="font-sans font-bold text-sm uppercase tracking-widest border-b-2 border-newsdark pb-1 mb-4">
                Recent Stories
              </h2>
              <div className="divide-y divide-newsborder">
                {recentArticles
                  .filter((a) => !topArticles.some((t) => t.id === a.id))
                  .slice(0, 10)
                  .map((article) => (
                    <ArticleCard key={article.id} article={article} variant="default" />
                  ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          {/* Sidebar ad */}
          <AdUnit slot="sidebar-top" format="square" className="h-[250px] w-full" />

          {/* Weather widget */}
          <Suspense fallback={
            <div className="bg-sky-50 border border-sky-100 p-4 rounded animate-pulse h-32" />
          }>
            <WeatherWidget />
          </Suspense>

          {/* Section links */}
          <div className="border border-newsborder p-4">
            <h3 className="font-sans font-bold text-sm uppercase tracking-widest mb-3 border-b pb-2">
              Sections
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
                  <a
                    href={item.href}
                    className="flex items-center justify-between text-gray-700 hover:text-newsred transition-colors group"
                  >
                    <span>{item.label}</span>
                    <span className="text-gray-300 group-hover:text-newsred">→</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Second sidebar ad */}
          <AdUnit slot="sidebar-bottom" format="square" className="h-[250px] w-full" />
        </aside>
      </div>
    </div>
  );
}
