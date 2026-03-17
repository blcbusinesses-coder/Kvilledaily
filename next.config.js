/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Allow any HTTPS image source — scrapers pull from dozens of domains
      // (ISP, city, county, news publishers, Unsplash, NWS, etc.)
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/sitemap.xml',
        headers: [{ key: 'Content-Type', value: 'application/xml' }],
      },
    ];
  },
};

module.exports = nextConfig;
