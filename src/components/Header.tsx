import Link from 'next/link';
import { CATEGORIES, CATEGORY_SLUGS } from '@/types';
import { AdUnit } from './AdUnit';

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

function getTodayFormatted(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function Header() {
  return (
    <header className="w-full">
      {/* Top leaderboard ad — only rendered when AdSense is configured */}
      {ADSENSE_CLIENT && (
        <div className="bg-gray-50 border-b border-newsborder py-2">
          <div className="max-w-7xl mx-auto px-4">
            <AdUnit slot="header-leaderboard" format="horizontal" className="h-[90px]" />
          </div>
        </div>
      )}

      {/* Masthead */}
      <div className="masthead-border py-4 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-sans text-gray-500 uppercase tracking-widest">
              {getTodayFormatted()}
            </span>
            <span className="text-xs font-sans text-gray-500 uppercase tracking-widest">
              Noble County, Indiana
            </span>
          </div>

          <div className="text-center">
            <Link href="/" className="no-underline">
              <h1
                className="font-serif font-bold text-newsdark tracking-tight leading-none"
                style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
              >
                Kendallville Daily
              </h1>
            </Link>
            <p className="text-xs font-sans text-gray-500 uppercase tracking-[0.3em] mt-1">
              Serving Kendallville &amp; Noble County Since 2024
            </p>
          </div>
        </div>
      </div>

      {/* Category navigation */}
      <nav className="bg-newsdark text-white">
        <div className="max-w-7xl mx-auto px-4">
          <ul className="flex flex-wrap justify-center gap-0 font-sans text-sm uppercase tracking-wider">
            <li>
              <Link
                href="/"
                className="inline-block px-3 py-2 hover:bg-newsred transition-colors"
              >
                Home
              </Link>
            </li>
            {CATEGORIES.map((cat) => (
              <li key={cat}>
                <Link
                  href={`/category/${CATEGORY_SLUGS[cat]}`}
                  className="inline-block px-3 py-2 hover:bg-newsred transition-colors whitespace-nowrap"
                >
                  {cat}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
