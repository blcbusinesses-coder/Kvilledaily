import { NextResponse } from 'next/server';
import { getArticles, getTodaysTopArticles } from '@/lib/supabase';

export async function GET() {
  const [top, recent] = await Promise.all([
    getTodaysTopArticles(6).catch((e) => ({ error: String(e) })),
    getArticles(20).catch((e) => ({ error: String(e) })),
  ]);
  return NextResponse.json({ top, recent });
}
