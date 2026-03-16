import Link from 'next/link';
import { CATEGORIES, CATEGORY_SLUGS } from '@/types';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-newsdark text-white mt-12">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h2 className="font-serif text-2xl font-bold mb-2">Kendallville Daily</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your trusted source for local news, weather, sports, and community
              events in Kendallville and Noble County, Indiana.
            </p>
            <p className="text-gray-500 text-xs mt-3">
              Powered by AI — reviewed for accuracy
            </p>
          </div>

          {/* Sections */}
          <div>
            <h3 className="font-sans font-bold uppercase tracking-widest text-sm mb-3 text-gray-300">
              Sections
            </h3>
            <ul className="space-y-1">
              {CATEGORIES.map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/category/${CATEGORY_SLUGS[cat]}`}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="font-sans font-bold uppercase tracking-widest text-sm mb-3 text-gray-300">
              About
            </h3>
            <ul className="space-y-1 text-sm text-gray-400">
              <li>Kendallville, Indiana 46755</li>
              <li>Noble County</li>
              <li className="mt-3">
                <Link href="/sitemap.xml" className="hover:text-white transition-colors">
                  Sitemap
                </Link>
              </li>
              <li>
                <a href="mailto:contact@kendallvilledaily.com" className="hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-700 mt-8 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-500">
          <p>© {year} Kendallville Daily. All rights reserved.</p>
          <p>
            Content generated with AI and sourced from public records.
            Articles are informational — always verify with official sources.
          </p>
        </div>
      </div>
    </footer>
  );
}
