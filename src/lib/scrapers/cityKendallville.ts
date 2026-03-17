/**
 * City of Kendallville official website scraper.
 * Scrapes public notices, news, and city announcements.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScrapedItem } from '@/types';
import { logger } from '../logger';
import { extractImageFromElement } from './imageUtils';

const BASE_URL = 'https://www.kendallville-in.gov';
const PAGES_TO_SCRAPE = [
  { url: `${BASE_URL}/news`, label: 'City News' },
  { url: `${BASE_URL}/calendar`, label: 'City Calendar' },
  { url: `${BASE_URL}/public-notices`, label: 'Public Notices' },
];

const HEADERS = {
  'User-Agent': 'KendallvilleDaily/1.0 (news aggregator; contact@kendallvilledaily.com)',
  'Accept': 'text/html,application/xhtml+xml',
};

export async function scrapeCityKendallville(): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];

  for (const page of PAGES_TO_SCRAPE) {
    try {
      logger.info(`Scraping City of Kendallville: ${page.url}`);
      const res = await axios.get(page.url, { headers: HEADERS, timeout: 12000 });
      const $ = cheerio.load(res.data);

      // Generic content extraction — works with most CivicPlus/government sites
      const articleSelectors = [
        '.news-item',
        '.alert-item',
        '.news-list-item',
        'article',
        '.content-item',
        '.list-item',
        'li.news',
      ];

      let found = false;
      for (const selector of articleSelectors) {
        const elements = $(selector);
        if (elements.length === 0) continue;

        found = true;
        elements.each((_, el) => {
          const title = $(el).find('h1, h2, h3, h4, .title, .headline').first().text().trim();
          const body = $(el).find('p, .body, .content, .description').text().trim();
          const link = $(el).find('a').attr('href');
          const date = $(el).find('time, .date, .posted').attr('datetime') ?? $(el).find('time, .date, .posted').text().trim();

          if (!title || title.length < 10) return;

          const rawContent = [
            `TITLE: ${title}`,
            date ? `DATE: ${date}` : '',
            `BODY: ${body.slice(0, 1500)}`,
            `SOURCE: ${page.label}`,
          ].filter(Boolean).join('\n\n');

          const href = link?.startsWith('http') ? link : `${BASE_URL}${link ?? ''}`;
          const imageUrl = extractImageFromElement(el, $, BASE_URL) ?? undefined;

          items.push({
            source: 'City of Kendallville',
            sourceUrl: href,
            title,
            rawContent,
            category: page.label === 'City Calendar' ? 'Community Events' : 'Local News',
            publishedAt: date || new Date().toISOString(),
            imageUrl,
          });
        });

        if (items.length > 0) break;
      }

      // Fallback: scrape main content area as a single news summary
      if (!found) {
        const mainText = $('main, .main-content, #content, .page-content').text().trim();
        if (mainText.length > 200) {
          items.push({
            source: 'City of Kendallville',
            sourceUrl: page.url,
            title: `City of Kendallville — ${page.label} Update`,
            rawContent: mainText.slice(0, 2000),
            category: 'Local News',
            publishedAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      logger.error(`City of Kendallville scraper failed for ${page.url}`, err);
    }
  }

  logger.info(`City of Kendallville: collected ${items.length} items`);
  return items;
}
