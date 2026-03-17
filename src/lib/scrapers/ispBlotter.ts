/**
 * Indiana State Police press release scraper for Noble County.
 * Scrapes the ISP newsroom RSS feed, filtering for Noble County incidents.
 */
import Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScrapedItem } from '@/types';
import { logger } from '../logger';
import { extractImageFromHtml } from './imageUtils';

const ISP_RSS = 'https://www.in.gov/isp/news/feed/';
const ISP_NEWSROOM = 'https://www.in.gov/isp/news/';

const NOBLE_COUNTY_KEYWORDS = /noble county|kendallville|albion|ligonier|wolcottville|rome city|wawaka|syracuse/i;

const HEADERS = {
  'User-Agent': 'KendallvilleDaily/1.0 (contact@kendallvilledaily.com)',
};

async function fetchArticleData(url: string): Promise<{ text: string; imageUrl: string | null }> {
  try {
    const res = await axios.get<string>(url, { headers: HEADERS, timeout: 10000 });
    const html = res.data as string;
    const $ = cheerio.load(html);
    const text = $('article, .news-content, .press-release, main, .content')
      .text().replace(/\s+/g, ' ').trim().slice(0, 2000);
    const imageUrl = extractImageFromHtml(html, 'https://www.in.gov');
    return { text, imageUrl };
  } catch {
    return { text: '', imageUrl: null };
  }
}

export async function scrapeISPBlotter(): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = [];
  const parser = new Parser();

  try {
    logger.info('Scraping Indiana State Police RSS...');
    const feed = await parser.parseURL(ISP_RSS);

    for (const entry of feed.items.slice(0, 20)) {
      const title = entry.title ?? '';
      const description = entry.contentSnippet ?? entry.content ?? '';
      const link = entry.link ?? '';

      // Filter to Noble County relevant incidents
      if (!NOBLE_COUNTY_KEYWORDS.test(title) && !NOBLE_COUNTY_KEYWORDS.test(description)) {
        continue;
      }

      // Fetch full article if link available — also grabs og:image in same request
      let body = description;
      let imageUrl: string | undefined;
      if (link) {
        const { text, imageUrl: img } = await fetchArticleData(link);
        if (text.length > body.length) body = text;
        if (img) imageUrl = img;
      }

      items.push({
        source: 'Indiana State Police',
        sourceUrl: link || ISP_NEWSROOM,
        title,
        rawContent: `PRESS RELEASE: ${title}\n\nDATE: ${entry.pubDate ?? ''}\n\nDETAILS: ${body}`,
        category: 'Public Safety',
        publishedAt: entry.pubDate ?? new Date().toISOString(),
        imageUrl,
      });
    }
  } catch (err) {
    // RSS may not exist; try scraping the newsroom directly
    logger.warn('ISP RSS failed, trying direct scrape...');
    try {
      const res = await axios.get(ISP_NEWSROOM, { headers: HEADERS, timeout: 12000 });
      const $ = cheerio.load(res.data);

      $('article, .news-item, li.press-release').each((_, el) => {
        const title = $(el).find('h1, h2, h3, a').first().text().trim();
        const body = $(el).text().trim();
        const link = $(el).find('a').attr('href') ?? '';

        if (!title || !NOBLE_COUNTY_KEYWORDS.test(`${title} ${body}`)) return;

        items.push({
          source: 'Indiana State Police',
          sourceUrl: link.startsWith('http') ? link : `https://www.in.gov${link}`,
          title,
          rawContent: `PRESS RELEASE: ${title}\n\n${body.slice(0, 1500)}`,
          category: 'Public Safety',
          publishedAt: new Date().toISOString(),
        });
      });
    } catch (err2) {
      logger.error('ISP scraper completely failed', err2);
    }
  }

  logger.info(`ISP Blotter: collected ${items.length} items`);
  return items;
}
