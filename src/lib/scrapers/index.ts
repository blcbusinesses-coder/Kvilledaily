/**
 * Main scraper orchestrator — runs all scrapers (or only those relevant to a
 * specific category) and returns combined, deduplicated results.
 */
import type { ScrapedItem, ArticleCategory } from '@/types';
import { logger } from '../logger';
import { scrapeWeather } from './weather';
import { scrapeGoogleNews } from './googleNews';
import { scrapeISPBlotter } from './ispBlotter';
import { scrapeCityKendallville } from './cityKendallville';
import { scrapeNobleCounty } from './nobleCounty';
import { scrapeIHSAA } from './ihsaa';

export interface ScrapeResult {
  items: ScrapedItem[];
  sourcesSucceeded: string[];
  sourcesFailed: string[];
}

/**
 * Which scrapers to run for each category.
 * Google News + city/county scrapers cover Local News, Community Events, and
 * Obituaries because their content spans those categories.
 */
const CATEGORY_SCRAPERS: Record<ArticleCategory, { name: string; fn: () => Promise<ScrapedItem[]> }[]> = {
  'Weather': [
    { name: 'National Weather Service', fn: scrapeWeather },
  ],
  'Public Safety': [
    { name: 'Indiana State Police', fn: scrapeISPBlotter },
    { name: 'Google News', fn: scrapeGoogleNews },
  ],
  'Local News': [
    { name: 'Google News', fn: scrapeGoogleNews },
    { name: 'City of Kendallville', fn: scrapeCityKendallville },
    { name: 'Noble County Government', fn: scrapeNobleCounty },
  ],
  'Community Events': [
    { name: 'City of Kendallville', fn: scrapeCityKendallville },
    { name: 'Noble County Government', fn: scrapeNobleCounty },
    { name: 'Google News', fn: scrapeGoogleNews },
  ],
  'Sports': [
    { name: 'IHSAA / East Noble Sports', fn: scrapeIHSAA },
    { name: 'Google News', fn: scrapeGoogleNews },
  ],
  'Obituaries': [
    { name: 'Google News', fn: scrapeGoogleNews },
  ],
};

/** All scrapers — used when no category is specified (manual full run). */
const ALL_SCRAPERS = [
  { name: 'National Weather Service', fn: scrapeWeather },
  { name: 'Google News', fn: scrapeGoogleNews },
  { name: 'Indiana State Police', fn: scrapeISPBlotter },
  { name: 'City of Kendallville', fn: scrapeCityKendallville },
  { name: 'Noble County Government', fn: scrapeNobleCounty },
  { name: 'IHSAA / East Noble Sports', fn: scrapeIHSAA },
];

async function runScrapers(
  scrapers: { name: string; fn: () => Promise<ScrapedItem[]> }[]
): Promise<ScrapeResult> {
  const sourcesSucceeded: string[] = [];
  const sourcesFailed: string[] = [];
  const allItems: ScrapedItem[] = [];

  for (const { name, fn } of scrapers) {
    try {
      logger.info(`Starting scraper: ${name}`);
      const items = await fn();
      allItems.push(...items);
      sourcesSucceeded.push(name);
      logger.info(`${name}: ✓ (${items.length} items)`);
    } catch (err) {
      logger.error(`Scraper failed: ${name}`, err);
      sourcesFailed.push(name);
    }
  }

  // Deduplicate by title similarity
  const seen = new Set<string>();
  const deduped = allItems.filter((item) => {
    const key = item.title.toLowerCase().replace(/\W+/g, ' ').trim().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  logger.info(`Total scraped items (after dedup): ${deduped.length}`);
  return { items: deduped, sourcesSucceeded, sourcesFailed };
}

/** Run only the scrapers relevant to a specific category. */
export async function runScrapersForCategory(category: ArticleCategory): Promise<ScrapeResult> {
  const scrapers = CATEGORY_SCRAPERS[category];
  logger.info(`Running ${scrapers.length} scraper(s) for category: ${category}`);
  return runScrapers(scrapers);
}

/** Run all scrapers (used for a manual full run with no category specified). */
export async function runAllScrapers(): Promise<ScrapeResult> {
  logger.info('Running all scrapers (no category filter)');
  return runScrapers(ALL_SCRAPERS);
}
