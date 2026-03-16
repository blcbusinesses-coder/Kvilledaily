/**
 * Google News RSS scraper for "Kendallville Indiana" news.
 * Uses the public RSS feed — no API key required.
 */
import Parser from 'rss-parser';
import type { ScrapedItem, ArticleCategory } from '@/types';
import { logger } from '../logger';

const RSS_FEEDS = [
  'https://news.google.com/rss/search?q=Kendallville+Indiana&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=%22Noble+County%22+Indiana&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=%22East+Noble%22+Indiana+school&hl=en-US&gl=US&ceid=US:en',
];

function categorizeByKeywords(title: string, content: string): ArticleCategory {
  const text = `${title} ${content}`.toLowerCase();
  if (/weather|storm|snow|rain|flood|tornado|forecast|temperature|wind|fog/.test(text)) return 'Weather';
  if (/arrest|crime|sheriff|police|fire|accident|crash|drug|assault|robbery|theft|dui|death|fatal/.test(text)) return 'Public Safety';
  if (/football|basketball|baseball|softball|soccer|track|wrestling|tennis|golf|sports|game|score|tournament|ihsaa|east noble/.test(text)) return 'Sports';
  if (/obituar|died|passing|funeral|memorial|survived by/.test(text)) return 'Obituaries';
  if (/event|festival|fair|concert|community|volunteer|donation|charity|church|school|meeting/.test(text)) return 'Community Events';
  return 'Local News';
}

export async function scrapeGoogleNews(): Promise<ScrapedItem[]> {
  const parser = new Parser({
    customFields: {
      item: ['description', 'content:encoded'],
    },
  });

  const items: ScrapedItem[] = [];
  const seenTitles = new Set<string>();

  for (const feedUrl of RSS_FEEDS) {
    try {
      logger.info(`Scraping RSS: ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);

      for (const entry of feed.items.slice(0, 8)) {
        const title = entry.title ?? '';
        const description = (entry.contentSnippet ?? entry.content ?? entry.summary ?? '').slice(0, 1000);
        const link = entry.link ?? '';

        if (!title || seenTitles.has(title.toLowerCase())) continue;
        seenTitles.add(title.toLowerCase());

        // Filter: only include items mentioning Kendallville or Noble County
        const relevantKeywords = /kendallville|noble county|noble co\.|east noble/i;
        if (!relevantKeywords.test(title) && !relevantKeywords.test(description)) continue;

        const rawContent = `HEADLINE: ${title}\n\nSUMMARY: ${description}\n\nSOURCE: ${entry.creator ?? 'Unknown'}\nDATE: ${entry.pubDate ?? new Date().toISOString()}`;

        items.push({
          source: entry.creator ?? 'Google News',
          sourceUrl: link,
          title,
          rawContent,
          category: categorizeByKeywords(title, description),
          publishedAt: entry.pubDate ?? new Date().toISOString(),
        });
      }
    } catch (err) {
      logger.error(`Google News RSS failed for ${feedUrl}`, err);
    }
  }

  logger.info(`Google News: collected ${items.length} items`);
  return items;
}
