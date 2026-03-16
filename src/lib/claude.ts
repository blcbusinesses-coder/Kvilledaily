import Anthropic from '@anthropic-ai/sdk';
import type { ArticleCategory, GeneratedArticle, ScrapedItem } from '@/types';
import { CATEGORY_SLUGS } from '@/types';
import slugify from 'slugify';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Large image pool per category — prevents repeats across articles in same run
const CATEGORY_IMAGES: Record<ArticleCategory, string[]> = {
  'Local News': [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1573152958734-1922c188fba3?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1603796846097-bee99e4a601f?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1464746133101-a2c3f88e0dd9?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop',
  ],
  'Weather': [
    'https://images.unsplash.com/photo-1561484930-998b6a7b22e8?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504608524841-42584120d693?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1530908295418-a12e326966ba?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1594760467013-64ac2b80b7d3?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1559963110-71b394e7494d?w=800&auto=format&fit=crop',
  ],
  'Sports': [
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop',
  ],
  'Public Safety': [
    'https://images.unsplash.com/photo-1575916115893-9c2e85c6d0f5?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516715094483-75da7dee9758?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1612528443702-f6741f70a049?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1596394723269-b2cbca4e6313?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1532094349884-543559c5b9d6?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop',
  ],
  'Community Events': [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop',
  ],
  'Obituaries': [
    'https://images.unsplash.com/photo-1473177104440-ffee2f376098?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1490750967868-88df5691cc97?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504197832061-98fed9a6fcbd?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&auto=format&fit=crop',
  ],
};

// Tracks which images have been used in the current pipeline run
const usedImagesThisRun = new Set<string>();

/** Reset at the start of each pipeline run */
export function resetUsedImages() {
  usedImagesThisRun.clear();
}

/**
 * Picks an unused image for the category.
 * Falls back to any image if all have been used (shouldn't happen with 8 per category).
 */
function getCategoryImage(category: ArticleCategory): string {
  const images = CATEGORY_IMAGES[category];
  const unused = images.filter((url) => !usedImagesThisRun.has(url));
  const pool = unused.length > 0 ? unused : images;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  usedImagesThisRun.add(chosen);
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
      thinking: { type: 'adaptive' },
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
      heroImageUrl: getCategoryImage(parsed.category as ArticleCategory),
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
