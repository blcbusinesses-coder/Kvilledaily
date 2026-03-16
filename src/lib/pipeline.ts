/**
 * Main content pipeline — scrapes sources, generates articles via Claude,
 * saves to Supabase, and logs results.
 */
import type { Article } from '@/types';
import { logger } from './logger';
import { runAllScrapers } from './scrapers';
import { generateArticle, isContentNewsworthy, resetUsedImages } from './claude';
import {
  insertArticle,
  articleSlugExists,
  insertPipelineLog,
  getRecentArticleTitles,
} from './supabase';

const MIN_ARTICLES = 5;
const MAX_ARTICLES = 10;

export interface PipelineResult {
  articlesGenerated: number;
  sourcesScraped: string[];
  errors: string[];
  durationSeconds: number;
}

async function makeUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await articleSlugExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    if (counter > 20) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

/** Normalise a title for duplicate comparison */
function normaliseTitle(title: string): string {
  return title.toLowerCase().replace(/\W+/g, ' ').trim();
}

export async function runPipeline(): Promise<PipelineResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let articlesGenerated = 0;

  // Reset image-use tracker for this run so no two articles share an image
  resetUsedImages();

  logger.section('Kendallville Daily — Daily Content Pipeline');
  logger.info(`Pipeline started at ${new Date().toISOString()}`);

  // ── Step 1: Scrape all sources ────────────────────────────────────────────
  logger.section('Step 1: Scraping Sources');
  const { items, sourcesSucceeded, sourcesFailed } = await runAllScrapers();

  if (sourcesFailed.length > 0) {
    errors.push(`Sources failed: ${sourcesFailed.join(', ')}`);
  }

  if (items.length === 0) {
    logger.warn('No items scraped — pipeline ending early');
    const duration = Math.round((Date.now() - startTime) / 1000);
    await insertPipelineLog({
      run_date: new Date().toISOString().split('T')[0],
      articles_generated: 0,
      sources_scraped: sourcesSucceeded,
      errors: [...errors, 'No items scraped'],
      duration_seconds: duration,
    });
    return { articlesGenerated: 0, sourcesScraped: sourcesSucceeded, errors, durationSeconds: duration };
  }

  // ── Step 2: Sort by recency, filter duplicates & newsworthy ──────────────
  logger.section('Step 2: Filtering & Prioritising by Recency');

  // Sort newest-first so today's news is always prioritised
  const sorted = [...items].sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  // Load titles already in the DB (last 3 days) to skip near-duplicate stories
  const existingTitles = await getRecentArticleTitles(3);
  logger.info(`Existing article titles in DB (last 3 days): ${existingTitles.size}`);

  // Cap to avoid processing too many (cost control), skipping already-published items
  const candidates = sorted
    .filter((item) => !existingTitles.has(normaliseTitle(item.title)))
    .slice(0, 30);

  logger.info(`Candidates after dedup filter: ${candidates.length}`);

  const newsworthy: typeof items = [];
  for (const item of candidates) {
    if (newsworthy.length >= MAX_ARTICLES * 2) break;
    const worthy = await isContentNewsworthy(item.rawContent);
    if (worthy) newsworthy.push(item);
  }

  logger.info(`Newsworthy items: ${newsworthy.length} / ${candidates.length}`);

  if (newsworthy.length === 0) {
    // Fall back to all candidates if filter is too aggressive
    newsworthy.push(...candidates.slice(0, MAX_ARTICLES));
  }

  // Prioritise variety across categories via round-robin
  const byCategory = new Map<string, typeof items>();
  for (const item of newsworthy) {
    const cat = item.category;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(item);
  }

  const prioritized: typeof items = [];
  const categories = Array.from(byCategory.keys());
  let i = 0;
  while (prioritized.length < Math.min(MAX_ARTICLES * 2, newsworthy.length)) {
    const cat = categories[i % categories.length];
    const catItems = byCategory.get(cat) ?? [];
    if (catItems.length > 0) {
      prioritized.push(catItems.shift()!);
    }
    i++;
    if (categories.every((c) => (byCategory.get(c)?.length ?? 0) === 0)) break;
  }

  // ── Step 3: Generate articles with Claude ────────────────────────────────
  logger.section('Step 3: Generating Articles with Claude');

  const generated: Article[] = [];

  for (const item of prioritized) {
    if (generated.length >= MAX_ARTICLES) break;

    try {
      logger.info(`Generating article for: "${item.title.slice(0, 60)}"`);
      const article = await generateArticle(item);

      if (!article) {
        logger.warn(`  ↳ Claude returned null for "${item.title.slice(0, 40)}"`);
        continue;
      }

      const uniqueSlug = await makeUniqueSlug(article.slug);

      await insertArticle({
        title: article.title,
        slug: uniqueSlug,
        content: article.content,
        excerpt: article.excerpt,
        category: article.category,
        source_url: article.sourceUrl,
        source_name: article.sourceName,
        hero_image_url: article.heroImageUrl,
        published_at: new Date().toISOString(),
        meta_title: article.metaTitle,
        meta_description: article.metaDescription,
        tags: article.tags,
        is_published: true,
      });

      articlesGenerated++;
      generated.push(article as unknown as Article);
      logger.info(`  ✓ Published: "${article.title}" [${article.category}]`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`  ✗ Failed: "${item.title.slice(0, 40)}"`, err);
      errors.push(`Article generation failed: ${msg.slice(0, 100)}`);
    }

    // Brief pause to respect API rate limits
    await new Promise((r) => setTimeout(r, 1500));
  }

  if (articlesGenerated < MIN_ARTICLES) {
    errors.push(`Only generated ${articlesGenerated}/${MIN_ARTICLES} minimum articles`);
  }

  // ── Step 4: Log results ───────────────────────────────────────────────────
  const durationSeconds = Math.round((Date.now() - startTime) / 1000);

  logger.section('Pipeline Complete');
  logger.info(`Articles generated: ${articlesGenerated}`);
  logger.info(`Sources scraped: ${sourcesSucceeded.join(', ')}`);
  logger.info(`Duration: ${durationSeconds}s`);
  if (errors.length > 0) {
    logger.warn(`Errors (${errors.length}): ${errors.join(' | ')}`);
  }

  await insertPipelineLog({
    run_date: new Date().toISOString().split('T')[0],
    articles_generated: articlesGenerated,
    sources_scraped: sourcesSucceeded,
    errors,
    duration_seconds: durationSeconds,
  });

  return { articlesGenerated, sourcesScraped: sourcesSucceeded, errors, durationSeconds };
}
