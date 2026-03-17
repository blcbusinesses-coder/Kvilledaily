import Anthropic from '@anthropic-ai/sdk';
import type { ArticleCategory, GeneratedArticle, ScrapedItem } from '@/types';
import { CATEGORY_SLUGS } from '@/types';
import slugify from 'slugify';
import { fetchPageImage } from './scrapers/imageUtils';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Image deduplication ──────────────────────────────────────────────────────
// Populated at the start of each pipeline run with all URLs already in the DB,
// then extended as each new article is assigned an image. Guarantees no image
// ever appears twice — not just within a run, but across all runs.
const usedImageUrls = new Set<string>();

/**
 * Call once per pipeline run: clear in-memory state then seed with every
 * hero_image_url already stored in Supabase.
 */
export function resetUsedImages(persistedUrls: Set<string> = new Set()) {
  usedImageUrls.clear();
  for (const url of persistedUrls) usedImageUrls.add(url);
}

// ─── Fallback image pool (used only when Unsplash is unavailable) ─────────────
const FALLBACK_IMAGES: Record<ArticleCategory, string[]> = {
  'Local News': [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&auto=format&fit=crop',
  ],
  'Weather': [
    'https://images.unsplash.com/photo-1561484930-998b6a7b22e8?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504608524841-42584120d693?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1530908295418-a12e326966ba?w=800&auto=format&fit=crop',
  ],
  'Sports': [
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop',
  ],
  'Public Safety': [
    'https://images.unsplash.com/photo-1575916115893-9c2e85c6d0f5?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1532094349884-543559c5b9d6?w=800&auto=format&fit=crop',
  ],
  'Community Events': [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
  ],
  'Obituaries': [
    'https://images.unsplash.com/photo-1473177104440-ffee2f376098?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1490750967868-88df5691cc97?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&auto=format&fit=crop',
  ],
};

/**
 * Resolve the best available hero image for an article.
 *
 * Priority:
 *   1. Real photo extracted by the scraper from the source page (imageUrl)
 *   2. og:image fetched from the article's sourceUrl (Google News, etc.)
 *   3. Unsplash Search API — relevant stock photo based on article title
 *   4. Static fallback pool per category
 *
 * Every chosen URL is recorded in usedImageUrls so it is never reused.
 */
async function getArticleImage(
  title: string,
  tags: string[],
  category: ArticleCategory,
  scrapedImageUrl?: string,
  sourceUrl?: string
): Promise<string> {

  // ── 1. Real photo from the scraper ────────────────────────────────────────
  if (scrapedImageUrl && !usedImageUrls.has(scrapedImageUrl)) {
    usedImageUrls.add(scrapedImageUrl);
    return scrapedImageUrl;
  }

  // ── 2. og:image from the article's source URL (covers Google News links) ──
  if (sourceUrl) {
    try {
      const ogImage = await fetchPageImage(sourceUrl);
      if (ogImage && !usedImageUrls.has(ogImage)) {
        usedImageUrls.add(ogImage);
        return ogImage;
      }
    } catch {
      // Fall through
    }
  }

  // ── 3. Unsplash Search API ────────────────────────────────────────────────
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (accessKey) {
    try {
      const stopWords = new Set([
        'a','an','the','and','or','but','in','on','at','to','for','of','with',
        'by','from','is','are','was','were','be','been','has','have','had',
        'will','would','could','should','may','might','new','local','kendallville',
        'indiana','noble','county',
      ]);
      const titleWords = title
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .split(' ')
        .filter((w) => w.length > 3 && !stopWords.has(w))
        .slice(0, 4);

      const query = titleWords.length > 0 ? titleWords.join(' ') : category.toLowerCase();

      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&orientation=landscape&content_filter=high`,
        { headers: { Authorization: `Client-ID ${accessKey}` } }
      );

      if (res.ok) {
        const data = await res.json() as { results: Array<{ urls: { regular: string } }> };
        const available = data.results.filter((r) => !usedImageUrls.has(r.urls.regular));
        if (available.length > 0) {
          const chosen = available[Math.floor(Math.random() * available.length)];
          usedImageUrls.add(chosen.urls.regular);
          return chosen.urls.regular;
        }
      }
    } catch {
      // Fall through to static pool
    }
  }

  // ── 4. Static fallback pool ───────────────────────────────────────────────
  const pool = FALLBACK_IMAGES[category];
  const unused = pool.filter((url) => !usedImageUrls.has(url));
  const chosen = (unused.length > 0 ? unused : pool)[
    Math.floor(Math.random() * (unused.length > 0 ? unused : pool).length)
  ];
  usedImageUrls.add(chosen);
  return chosen;
}

function makeSlug(title: string): string {
  return slugify(title, { lower: true, strict: true, trim: true }).slice(0, 80);
}

export async function generateArticle(
  item: ScrapedItem
): Promise<GeneratedArticle | null> {
  const prompt = `You are a journalist for Kendallville Daily, a local news website for Kendallville, Indiana (population ~9,000).

Your task: Transform the following raw source information into an original, well-written news article.

SOURCE NAME: ${item.source}
SOURCE URL: ${item.sourceUrl}
SUGGESTED CATEGORY: ${item.category}
RAW CONTENT:
${item.rawContent.slice(0, 4000)}

REQUIREMENTS:
1. Write an ORIGINAL article — do NOT reproduce the source text verbatim. Rewrite everything in your own words.
2. The article should be 250–450 words, written in clear, engaging journalistic style.
3. Use inverted pyramid structure (most important info first).
4. Include local context relevant to Kendallville / Noble County, Indiana residents.
5. Be factual — only include information from the source material.

Return your response as a JSON object with these exact keys:
{
  "title": "Compelling headline (max 80 chars)",
  "content": "Full article HTML (use <p> tags for paragraphs, <strong> for emphasis)",
  "excerpt": "One-sentence summary for previews (max 160 chars)",
  "category": "One of: Local News, Weather, Sports, Public Safety, Community Events, Obituaries",
  "metaTitle": "SEO title (max 60 chars, include Kendallville)",
  "metaDescription": "SEO description (max 155 chars)",
  "tags": ["tag1", "tag2", "tag3"]
}

Return ONLY valid JSON, no other text.`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      thinking: { type: 'enabled', budget_tokens: 1024 },
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;

    // Strip markdown code fences if present
    let raw = textBlock.text.trim();
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    const parsed = JSON.parse(raw);

    // Validate required fields
    if (!parsed.title || !parsed.content || !parsed.excerpt || !parsed.category) {
      return null;
    }

    const slug = makeSlug(parsed.title);

    return {
      title: parsed.title,
      slug,
      content: parsed.content,
      excerpt: parsed.excerpt,
      category: parsed.category as ArticleCategory,
      metaTitle: parsed.metaTitle ?? parsed.title,
      metaDescription: parsed.metaDescription ?? parsed.excerpt,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      heroImageUrl: await getArticleImage(
        parsed.title,
        Array.isArray(parsed.tags) ? parsed.tags : [],
        parsed.category as ArticleCategory,
        item.imageUrl,
        item.sourceUrl
      ),
      sourceUrl: item.sourceUrl,
      sourceName: item.source,
    };
  } catch (err) {
    console.error('Claude generation error:', err);
    return null;
  }
}

export async function isContentNewsworthy(rawContent: string): Promise<boolean> {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: `Is this content newsworthy for a local Kendallville, Indiana news website? Answer only YES or NO.\n\nContent: ${rawContent.slice(0, 500)}`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === 'text');
    return text?.type === 'text' && text.text.trim().toUpperCase().startsWith('YES');
  } catch {
    return true; // Default to include if check fails
  }
}
