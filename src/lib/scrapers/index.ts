/**
 * Main scraper orchestrator — runs all scrapers and returns combined results.
 */
import type { ScrapedItem } from '@/types';
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

export async function runAllScrapers(): Promise<ScrapeResult> {
  const sourcesSucceeded: string[] = [];
  const sourcesFailed: string[] = [];
  const allItems: ScrapedItem[] = [];

  const scrapers: { name: string; fn: () => Promise<ScrapedItem[]> }[] = [
    { name: 'National Weather Service', fn: scrapeWeather },
    { name: 'Google News', fn: scrapeGoogleNews },
    { name: 'Indiana State Police', fn: scrapeISPBlotter },
    { name: 'City of Kendallville', fn: scrapeCityKendallville },
    { name: 'Noble County Government', fn: scrapeNobleCounty },
    { name: 'IHSAA / East Noble Sports', fn: scrapeIHSAA },
  ];

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
