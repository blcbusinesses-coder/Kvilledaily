import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';

/**
 * POST /api/run-pipeline
 * Triggered by Vercel Cron at 6:00 AM daily.
 * Also callable manually with the CRON_SECRET header.
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
    // Vercel also sends this header from its own cron system
    const cronHeader = req.headers.get('x-vercel-cron-signature');
    if (!cronHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  console.log('[Pipeline] Starting daily pipeline run...');

  try {
    const result = await runPipeline();
    return NextResponse.json({
      success: true,
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
