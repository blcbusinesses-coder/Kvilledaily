import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Kendallville Daily';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kendallvilledaily.com';
const GOOGLE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION;
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Local News for Kendallville, Indiana`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Your trusted source for local news, weather, sports, and community events in Kendallville and Noble County, Indiana.',
  keywords: ['Kendallville', 'Indiana', 'Noble County', 'local news', 'weather', 'sports', 'East Noble'],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image' },
  verification: GOOGLE_VERIFICATION ? { google: GOOGLE_VERIFICATION } : {},
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        {/* Google AdSense script */}
        {ADSENSE_CLIENT && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
