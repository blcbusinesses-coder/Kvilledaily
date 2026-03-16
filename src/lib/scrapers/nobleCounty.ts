/**
 * Noble County, Indiana government website scraper.
 * Scrapes county announcements, board meetings, and public notices.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScrapedItem } from '@/types';
import { logger } from '../logger';

const BASE_URL = 'https://www.nobleco.org';
const PAGES = [
  { url: `${BASE_URL}/news`, label: 'County News' },
  { url: `${BASE_URL}/calendar`, label: 'County Events' },
  { url: `${BASE_URL}/county-council`, label: 'County Council' },
  { url: `${BASE_URL}/board-of-commissioners`, label: 'Commissioners' },
];

const HEADERS = {
  'User-Agent': 'KendallvilleDaily/1.0 (contact@kendallvilledaily.com)',
  'Accept': 'text/html',
};

async function scrapeGenericGovPage(
  url: string,
  sourceName: string
): Promise<ScrapedItem[]> {
  const res = await axios.get(url, { headers: HEADERS, timeout: 12000 });
  const $ = cheerio.load(res.data);
  const items: ScrapedItem[] = [];

  // Try multiple common CMS selectors
  const containers = $('article, .news-item, .alert, .list-item, .entry, .post, li.item').toArray();

  for (const el of containers.slice(0, 6)) {
    const title = $(el).find('h1, h2, h3, h4, a.title, .title').first().text().trim();
    const body = $(el).text().replace(/\s+/g, ' ').trim();
    const link = $(el).find('a').attr('href') ?? '';
    const date = $(el).find('time, .date').first().attr('datetime') ?? $(el).find('time, .date').text().trim();

    if (!title || title.length < 8) continue;

    const href = link.startsWith('http') ? link : `${BASE_URL}${link}`;

    items.push({
      source: `Noble County — ${sourceName}`,
      sourceUrl: href || url,
      title,
      rawContent: `TITLE: ${title}\n\nDATE: ${date}\n\nCONTENT: ${body.slice(0, 1500)}`,
      category: sourceName.includes('Event') || sourceName.includes('Calendar') ? 'Community Events' : 'Local News',
      publishedAt: date || new Date().toISOString(),
    });
  }

  // Fallback to page summary
  if (items.length === 0) {
    const mainContent = $('main, .main-content, #content').text().replace(/\s+/g, ' ').trim();
    if (mainContent.length > 200) {
      items.push({
        source: `Noble County — ${sourceName}`,
        sourceUrl: url,
        title: `Noble County ${sourceName} Update`,
        rawContent: mainContent.slice(0, 2000),
        category: 'Local News',
        publishedAt: new Date().toISOString(),
      });
    }
  }

  return items;
}

export async function scrapeNobleCounty(): Promise<ScrapedItem[]> {
  const all: ScrapedItem[] = [];

  for (const page of PAGES) {
    try {
      logger.info(`Scraping Noble County: ${page.url}`);
      const items = await scrapeGenericGovPage(page.url, page.label);
      all.push(...items);
    } catch (err) {
      logger.error(`Noble County scraper failed for ${page.url}`, err);
    }
  }

  logger.info(`Noble County: collected ${all.length} items`);
  return all;
}
