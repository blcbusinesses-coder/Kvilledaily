# 🗞 Kendallville Daily

**Fully automated local news website for Kendallville, Indiana (Noble County)**

Built with Next.js 14 · Tailwind CSS · Supabase · Claude AI · Vercel

---

## Overview

Kendallville Daily automatically scrapes 6 public sources every morning at 6 AM, rewrites the content into original articles using Claude AI, and publishes them to a newspaper-style website — with zero human input needed after initial setup.

---

## Features

| Feature | Details |
|---|---|
| **Content Pipeline** | 6 scrapers → Claude AI rewrite → Supabase DB → Published |
| **Daily automation** | Vercel Cron at 6:00 AM every day |
| **Article count** | 5–10 new articles per day |
| **Categories** | Local News, Weather, Sports, Public Safety, Community Events, Obituaries |
| **UI** | Newspaper-style, mobile responsive, dark header |
| **SEO** | Auto-generated meta titles, descriptions, sitemap.xml, robots.txt |
| **Ads** | Google AdSense in header, sidebar, between articles |
| **Donations** | Stripe Checkout "Support Local News" button |
| **Logging** | Daily log files + Supabase pipeline_logs table |

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude `claude-opus-4-6` for article generation
- **Hosting**: Vercel (with Cron Jobs)
- **Payments**: Stripe Checkout
- **Scrapers**: Axios + Cheerio + rss-parser

---

## Content Sources

| Source | Method | Category |
|---|---|---|
| National Weather Service | JSON API | Weather |
| Google News RSS | RSS Feed | All categories |
| Indiana State Police | RSS + HTML | Public Safety |
| City of Kendallville | HTML scraper | Local News |
| Noble County Government | HTML scraper | Local News |
| IHSAA / East Noble | RSS + HTML | Sports |

> **Note**: Facebook public groups scraping is not included due to Facebook's strict bot detection. Google News RSS provides excellent local coverage as an alternative.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
# Edit .env.local and fill in all values
```

Required variables:
- `ANTHROPIC_API_KEY` — Get from [console.anthropic.com](https://console.anthropic.com)
- `NEXT_PUBLIC_SUPABASE_URL` — From your Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — From Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — From Supabase project settings → Service Role
- `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — From [dashboard.stripe.com](https://dashboard.stripe.com)
- `NEXT_PUBLIC_ADSENSE_CLIENT_ID` — From Google AdSense (optional, shows placeholders until configured)
- `CRON_SECRET` — Any random string (e.g., `openssl rand -hex 32`)

### 3. Set up the database

Open your Supabase project → SQL Editor → paste the contents of:

```
supabase/migrations/001_initial.sql
```

Click **Run**.

### 4. Run the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 5. Test the pipeline manually

```bash
npm run pipeline
```

This will scrape all sources, generate articles with Claude, and insert them into Supabase.

---

## Deployment (Vercel)

### 1. Deploy to Vercel

```bash
npx vercel --prod
```

Or connect your GitHub repo at [vercel.com/new](https://vercel.com/new).

### 2. Add environment variables

In Vercel Dashboard → Settings → Environment Variables, add all variables from `.env.local`.

### 3. Enable cron jobs

The `vercel.json` file already configures the daily cron:

```json
{
  "crons": [
    {
      "path": "/api/run-pipeline",
      "schedule": "0 6 * * *"
    }
  ]
}
```

This fires at **6:00 AM UTC** every day. Adjust the schedule as needed.
Vercel automatically sends an `x-vercel-cron-signature` header — no additional setup needed.

### 4. Submit sitemap to Google

After deploying, visit Google Search Console and submit:
```
https://yourdomain.com/sitemap.xml
```

---

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (header, footer, AdSense)
│   │   ├── page.tsx                # Homepage
│   │   ├── article/[slug]/page.tsx # Individual article page
│   │   ├── category/[cat]/page.tsx # Category listing page
│   │   ├── sitemap.ts              # Dynamic sitemap.xml
│   │   ├── robots.ts               # robots.txt
│   │   └── api/
│   │       ├── run-pipeline/       # Cron endpoint
│   │       └── create-donation-session/ # Stripe checkout
│   ├── components/
│   │   ├── Header.tsx              # Masthead + nav
│   │   ├── Footer.tsx              # Footer + donation CTA
│   │   ├── HeroArticle.tsx         # Large featured article
│   │   ├── ArticleCard.tsx         # Article cards (3 variants)
│   │   ├── AdUnit.tsx              # AdSense + fallback placeholder
│   │   ├── DonationButton.tsx      # Stripe donation button
│   │   └── WeatherWidget.tsx       # Live NWS weather
│   ├── lib/
│   │   ├── claude.ts               # Claude API integration
│   │   ├── supabase.ts             # Database queries
│   │   ├── pipeline.ts             # Main pipeline orchestrator
│   │   ├── logger.ts               # File + console logging
│   │   └── scrapers/
│   │       ├── index.ts            # Scraper orchestrator
│   │       ├── weather.ts          # NWS API
│   │       ├── googleNews.ts       # Google News RSS
│   │       ├── ispBlotter.ts       # Indiana State Police
│   │       ├── cityKendallville.ts # City of Kendallville
│   │       ├── nobleCounty.ts      # Noble County government
│   │       └── ihsaa.ts            # East Noble sports
│   └── types/index.ts              # TypeScript types
├── scripts/
│   ├── run-pipeline.ts             # npm run pipeline
│   └── init-db.ts                  # npm run init-db
├── supabase/migrations/
│   └── 001_initial.sql             # Database schema
├── vercel.json                     # Cron job configuration
└── logs/                           # Daily log files (auto-created)
```

---

## Customization

### Change the city/region
Search for "Kendallville" and "Noble County" across `src/lib/scrapers/` and update.
The NWS coordinates in `weather.ts` should also be updated (`41.4381,-85.2649`).

### Add more sources
Create a new file in `src/lib/scrapers/`, export a `scrapeXxx(): Promise<ScrapedItem[]>` function, and add it to `src/lib/scrapers/index.ts`.

### Change posting frequency
Edit `vercel.json` cron schedule. Standard cron syntax applies.

### Adjust article count
Edit `MIN_ARTICLES` and `MAX_ARTICLES` in `src/lib/pipeline.ts`.

---

## Monetization

### Google AdSense
1. Apply at [adsense.google.com](https://adsense.google.com)
2. Add your client ID to `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
3. Replace placeholder slot IDs in `AdUnit` component calls

Ad placements:
- **Header leaderboard** (728×90)
- **Mid-content** (728×90)
- **Sidebar top** (300×250)
- **Sidebar bottom** (300×250)
- **In-article** (728×90)

### Stripe Donations
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Customize the donation amount in `src/app/api/create-donation-session/route.ts`

---

## Monitoring

- **Log files**: `logs/pipeline-YYYY-MM-DD.log` (auto-created)
- **Database logs**: `pipeline_logs` table in Supabase
- **Vercel**: Functions tab shows cron execution logs

---

## Legal & Ethical Notes

- All articles are **rewritten by Claude AI** — not copied verbatim
- Content is sourced from **publicly available** government sites, RSS feeds, and APIs
- AI disclosure is shown on every article
- Scrapers include proper `User-Agent` headers identifying the bot
- The site respects robots.txt conventions for all scraped sources
- Obituaries content should be handled with particular sensitivity

---

## Cost Estimates (Monthly)

| Service | Est. Cost |
|---|---|
| Claude API (~300 articles/month) | ~$3–8 |
| Supabase (free tier) | $0 |
| Vercel (free tier) | $0 |
| Stripe (2.9% + 30¢ per donation) | Variable |

Total operating cost: **~$3–10/month** + Stripe fees on donations.
