/**
 * East Noble High School sports scraper.
 * Scrapes from IHSAA and the East Noble school district website.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import type { ScrapedItem } from '@/types';
import { logger } from '../logger';
import { extractImageFromElement } from './imageUtils';

const HEADERS = {
  'User-Agent': 'KendallvilleDaily/1.0 (contact@kendallvilledaily.com)',
};

const SOURCES = [
  // East Noble Community School Corporation
  { url: 'https://www.eastnoble.k12.in.us/athletics', label: 'East Noble Athletics' },
  // IHSAA searches for East Noble
  { url: 'https://www.ihsaa.org/search?q=east+noble', label: 'IHSAA' },
  // MaxPreps for East Noble (public sports data)
  { url: 'https://www.maxpreps.com/indiana/albion/east-noble-knights/', label: 'MaxPreps East Noble' },
];

const SPORTS_RSS = [
  'https://news.google.com/rss/search?q=%22East+Noble%22+Indiana+sports&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=%22East+Noble+Knights%22&hl=en-US&gl=US&ceid=US:en',
];

async function scrapeSchoolAthletics(url: string, label: string): Promise<ScrapedItem[]> {
  const res = await axios.get(url, { headers: HEADERS, timeout: 12000 });
  const $ = cheerio.load(res.data);
  const items: ScrapedItem[] = [];

  const containers = $('article, .news-item, .score, .result, .event, .game, li.item').toArray();

  for (const el of containers.slice(0, 6)) {
    const title = $(el).find('h1, h2, h3, h4, a').first().text().trim();
    const body = $(el).text().replace(/\s+/g, ' ').trim();
    const link = $(el).find('a').attr('href') ?? '';

    if (!title || title.length < 8) continue;

    const href = link.startsWith('http') ? link : `${new URL(url).origin}${link}`;
    const imageUrl = extractImageFromElement(el, $, new URL(url).origin) ?? undefined;

    items.push({
      source: label,
      sourceUrl: href || url,
      title,
      rawContent: `SPORTS UPDATE — ${label}\n\nTITLE: ${title}\n\nDETAILS: ${body.slice(0, 1200)}`,
      category: 'Sports',
      imageUrl,
    });
  }

  return items;
}

export async function scrapeIHSAA(): Promise<ScrapedItem[]> {
  const all: ScrapedItem[] = [];
  const parser = new Parser();

  // 1. Scrape Google News RSS for East Noble sports
  for (const feedUrl of SPORTS_RSS) {
    try {
      logger.info(`Scraping sports RSS: ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);

      for (const entry of feed.items.slice(0, 5)) {
        const title = entry.title ?? '';
        const body = entry.contentSnippet ?? entry.content ?? '';
        if (!title) continue;

        all.push({
          source: 'IHSAA / East Noble Sports',
          sourceUrl: entry.link ?? '',
          title,
          rawContent: `SPORTS NEWS: ${title}\n\nDATE: ${entry.pubDate ?? ''}\n\nSUMMARY: ${body.slice(0, 1000)}`,
          category: 'Sports',
          publishedAt: entry.pubDate ?? new Date().toISOString(),
        });
      }
    } catch (err) {
      logger.warn(`Sports RSS failed: ${feedUrl}`);
    }
  }

  // 2. Try school district site
  for (const src of SOURCES) {
    try {
      logger.info(`Scraping: ${src.url}`);
      const items = await scrapeSchoolAthletics(src.url, src.label);
      all.push(...items);
    } catch (err) {
      logger.warn(`Sports scraper failed for ${src.url}`);
    }
  }

  // Deduplicate by title
  const seen = new Set<string>();
  const deduped = all.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  logger.info(`IHSAA/Sports: collected ${deduped.length} items`);
  return deduped;
}
