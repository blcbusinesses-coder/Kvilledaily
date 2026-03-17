/**
 * Main content pipeline — scrapes sources, generates articles via Claude,
 * saves to Supabase, and logs results.
 *
 * When a category is supplied the pipeline runs only the relevant scrapers,
 * filters candidates to that category, and targets a smaller article count
 * (1–3 per scheduled run rather than 5–10 for a full run).
 */
import type { Article, ArticleCategory } from '@/types';
import { logger } from './logger';
import { runAllScrapers, runScrapersForCategory } from './scrapers';
import { generateArticle, isContentNewsworthy, resetUsedImages } from './claude';
import {
  insertArticle,
  articleSlugExists,
  insertPipelineLog,
  getRecentArticleTitles,
  getUsedImageUrls,
} from './supabase';

/** Articles to publish per category-specific run */
const CATEGORY_MAX: Partial<Record<ArticleCategory, number>> = {
  'Weather':          1,
  'Public Safety':    2,
  'Local News':       3,
  'Community Events': 2,
  'Sports':           2,
  'Obituaries':       1,
};

/** Fallbacks for a full (no-category) manual run */
const FULL_RUN_MIN = 5;
const FULL_RUN_MAX = 10;

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

function normaliseTitle(title: string): string {
  return title.toLowerCase().replace(/\W+/g, ' ').trim();
}

export async function runPipeline(category?: ArticleCategory): Promise<PipelineResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let articlesGenerated = 0;

  const maxArticles = category ? (CATEGORY_MAX[category] ?? 2) : FULL_RUN_MAX;
  const minArticles = category ? 1 : FULL_RUN_MIN;

  // Load all previously used image URLs from DB so images are never repeated
  const persistedImageUrls = await getUsedImageUrls();
  resetUsedImages(persistedImageUrls);
  logger.info(`Loaded ${persistedImageUrls.size} previously-used image URLs for deduplication`);

  logger.section(`Kendallville Daily — Pipeline: ${category ?? 'ALL CATEGORIES'}`);
  logger.info(`Pipeline started at ${new Date().toISOString()}`);

  // ── Step 1: Scrape relevant sources ──────────────────────────────────────
  logger.section('Step 1: Scraping Sources');
  const { items, sourcesSucceeded, sourcesFailed } = category
    ? await runScrapersForCategory(category)
    : await runAllScrapers();

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

  // ── Step 2: Filter to the target category, deduplicate, rank ─────────────
  logger.section('Step 2: Filtering & Prioritising');

  // When running for a specific category, keep only items in that category
  const categoryFiltered = category
    ? items.filter((item) => item.category === category)
    : items;

  logger.info(`Items matching category filter: ${categoryFiltered.length} / ${items.length}`);

  // Sort newest-first
  const sorted = [...categoryFiltered].sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  // Skip titles already published in the last 3 days
  const existingTitles = await getRecentArticleTitles(3);
  logger.info(`Existing titles in DB (last 3 days): ${existingTitles.size}`);

  const candidates = sorted
    .filter((item) => !existingTitles.has(normaliseTitle(item.title)))
    .slice(0, 30);

  logger.info(`Candidates after dedup filter: ${candidates.length}`);

  const newsworthy: typeof items = [];
  for (const item of candidates) {
    if (newsworthy.length >= maxArticles * 2) break;
    const worthy = await isContentNewsworthy(item.rawContent);
    if (worthy) newsworthy.push(item);
  }

  logger.info(`Newsworthy items: ${newsworthy.length} / ${candidates.length}`);

  if (newsworthy.length === 0) {
    newsworthy.push(...candidates.slice(0, maxArticles));
  }

  // For full runs: round-robin across categories for variety
  let prioritized: typeof items;
  if (category) {
    prioritized = newsworthy.slice(0, maxArticles);
  } else {
    const byCategory = new Map<string, typeof items>();
    for (const item of newsworthy) {
      const cat = item.category;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(item);
    }
    prioritized = [];
    const cats = Array.from(byCategory.keys());
    let i = 0;
    while (prioritized.length < Math.min(maxArticles * 2, newsworthy.length)) {
      const cat = cats[i % cats.length];
      const catItems = byCategory.get(cat) ?? [];
      if (catItems.length > 0) prioritized.push(catItems.shift()!);
      i++;
      if (cats.every((c) => (byCategory.get(c)?.length ?? 0) === 0)) break;
    }
  }

  // ── Step 3: Generate articles with Claude ────────────────────────────────
  logger.section('Step 3: Generating Articles with Claude');

  const generated: Article[] = [];

  for (const item of prioritized) {
    if (generated.length >= maxArticles) break;

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

  if (articlesGenerated < minArticles) {
    errors.push(`Only generated ${articlesGenerated}/${minArticles} minimum articles`);
  }

  // ── Step 4: Log results ───────────────────────────────────────────────────
  const durationSeconds = Math.round((Date.now() - startTime) / 1000);

  logger.section('Pipeline Complete');
  logger.info(`Category: ${category ?? 'ALL'}`);
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
