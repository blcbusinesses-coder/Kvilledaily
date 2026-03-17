import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';
import { SLUG_TO_CATEGORY } from '@/types';
import type { ArticleCategory } from '@/types';

/**
 * GET/POST /api/run-pipeline?category=<slug>
 *
 * Triggered by Vercel Cron on a per-category schedule (see vercel.json).
 * Also callable manually:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://yourdomain.com/api/run-pipeline?category=sports
 *
 * If no category is supplied, all categories are run (legacy / manual full run).
 */
export async function GET(req: NextRequest) {
  return handlePipeline(req);
}

export async function POST(req: NextRequest) {
  return handlePipeline(req);
}

async function handlePipeline(req: NextRequest): Promise<NextResponse> {
  // Verify cron secret
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    const cronHeader = req.headers.get('x-vercel-cron-signature');
    if (!cronHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Read optional category slug from query string (e.g. ?category=local-news)
  const slug = req.nextUrl.searchParams.get('category') ?? '';
  const category: ArticleCategory | undefined = SLUG_TO_CATEGORY[slug] as ArticleCategory | undefined;

  console.log(`[Pipeline] Starting run — category: ${category ?? 'ALL'}`);

  try {
    const result = await runPipeline(category);
    return NextResponse.json({
      success: true,
      category: category ?? 'all',
      articlesGenerated: result.articlesGenerated,
      sourcesScraped: result.sourcesScraped,
      errors: result.errors,
      durationSeconds: result.durationSeconds,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Pipeline] Fatal error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
