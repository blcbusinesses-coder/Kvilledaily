import { createClient } from '@supabase/supabase-js';
import type { Article, PipelineLog } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client (for frontend reads) — cache: 'no-store' prevents Next.js
// from caching fetch responses, which would serve stale DB results.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
  },
});

// Service client (for server-side writes — pipeline, API routes)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey ?? supabaseAnonKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Article queries ─────────────────────────────────────────────────────────

export async function getArticles(limit = 20, offset = 0): Promise<Article[]> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) { console.error('getArticles error:', error.message); return []; }
    return data ?? [];
  } catch { return []; }
}

export async function getArticlesByCategory(
  category: string,
  limit = 20,
  offset = 0
): Promise<Article[]> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('is_published', true)
      .eq('category', category)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) { console.error('getArticlesByCategory error:', error.message); return []; }
    return data ?? [];
  } catch { return []; }
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error) return null;
    return data;
  } catch { return null; }
}

export async function getTodaysTopArticles(limit = 6): Promise<Article[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('is_published', true)
      .gte('published_at', today.toISOString())
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) { console.error('getTodaysTopArticles error:', error.message); return []; }

    if (!data || data.length === 0) {
      return getArticles(limit);
    }
    return data;
  } catch { return []; }
}

export async function getAllArticleSlugs(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('slug')
      .eq('is_published', true);

    if (error) return [];
    return (data ?? []).map((r) => r.slug);
  } catch { return []; }
}

export async function insertArticle(
  article: Omit<Article, 'id' | 'created_at'>
): Promise<Article> {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .insert(article)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function articleSlugExists(slug: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug);

  return (count ?? 0) > 0;
}

/**
 * Returns normalised titles of articles published in the last N days.
 * Used by the pipeline to skip items that are already covered.
 */
export async function getRecentArticleTitles(days = 3): Promise<Set<string>> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('title')
      .gte('published_at', since.toISOString());

    if (error || !data) return new Set();

    return new Set(
      data.map((r) => r.title.toLowerCase().replace(/\W+/g, ' ').trim())
    );
  } catch { return new Set(); }
}

/**
 * Returns title + excerpt for articles published in the last N days.
 * Used by the AI dedup step to detect same-event stories even when
 * the headline wording differs.
 */
export async function getRecentArticleSummaries(
  days = 7
): Promise<Array<{ title: string; excerpt: string }>> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('title, excerpt')
      .gte('published_at', since.toISOString())
      .order('published_at', { ascending: false })
      .limit(60);

    if (error || !data) return [];
    return data as Array<{ title: string; excerpt: string }>;
  } catch { return []; }
}

/**
 * Returns all hero_image_url values ever stored in articles.
 * Used by the pipeline to ensure images are never repeated across runs.
 */
export async function getUsedImageUrls(): Promise<Set<string>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('hero_image_url')
      .not('hero_image_url', 'is', null);

    if (error || !data) return new Set();
    return new Set(data.map((r) => r.hero_image_url).filter(Boolean));
  } catch { return new Set(); }
}

// ─── Pipeline log queries ────────────────────────────────────────────────────

export async function insertPipelineLog(
  log: Omit<PipelineLog, 'id' | 'created_at'>
): Promise<void> {
  await supabaseAdmin.from('pipeline_logs').insert(log);
}
