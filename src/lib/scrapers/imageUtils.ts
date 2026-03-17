/**
 * Shared image-extraction utilities used by all scrapers.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

const UA = 'KendallvilleDaily/1.0 (contact@kendallvilledaily.com)';

/** Patterns that identify non-content images (logos, icons, etc.) */
const SKIP_PATTERN = /logo|icon|avatar|banner|sprite|badge|flag|placeholder|pixel|tracking|blank/i;

/**
 * Fetch a URL and return the best available image (og:image → twitter:image → first content <img>).
 * Returns null on any error or if no image is found.
 */
export async function fetchPageImage(url: string, baseUrl = ''): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await axios.get<string>(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      timeout: 8000,
      maxRedirects: 5,
    });
    return extractImageFromHtml(res.data as string, baseUrl);
  } catch {
    return null;
  }
}

/**
 * Extract the best image URL from raw HTML.
 * Priority: og:image meta → twitter:image meta → first meaningful <img> tag.
 */
export function extractImageFromHtml(html: string, baseUrl = ''): string | null {
  const $ = cheerio.load(html);

  // 1. OG / Twitter meta tags
  const meta =
    $('meta[property="og:image"]').attr('content') ??
    $('meta[property="og:image:url"]').attr('content') ??
    $('meta[name="twitter:image"]').attr('content') ??
    $('meta[name="twitter:image:src"]').attr('content');

  if (meta) return resolveUrl(meta, baseUrl);

  // 2. First meaningful <img> in the page body (skips logos/icons)
  let found: string | null = null;
  $('article img, .content img, .news img, main img, img').each((_, el) => {
    if (found) return;
    const src = $(el).attr('src') ?? $(el).attr('data-src') ?? '';
    const alt = $(el).attr('alt') ?? '';
    if (!src || src.startsWith('data:')) return;
    if (SKIP_PATTERN.test(src + alt)) return;
    const w = parseInt($(el).attr('width') ?? '0', 10);
    const h = parseInt($(el).attr('height') ?? '0', 10);
    if ((w > 0 && w < 120) || (h > 0 && h < 120)) return;
    found = resolveUrl(src, baseUrl);
  });
  return found;
}

/**
 * Extract the best image from a Cheerio element (article card, list item, etc.)
 * without making any additional HTTP requests.
 */
export function extractImageFromElement(
  el: AnyNode,
  $: cheerio.CheerioAPI,
  baseUrl = ''
): string | null {
  const imgs = $(el).find('img');
  let found: string | null = null;
  imgs.each((_, img) => {
    if (found) return;
    const src = $(img).attr('src') ?? $(img).attr('data-src') ?? '';
    const alt = $(img).attr('alt') ?? '';
    if (!src || src.startsWith('data:')) return;
    if (SKIP_PATTERN.test(src + alt)) return;
    const w = parseInt($(img).attr('width') ?? '0', 10);
    const h = parseInt($(img).attr('height') ?? '0', 10);
    if ((w > 0 && w < 120) || (h > 0 && h < 120)) return;
    found = resolveUrl(src, baseUrl);
  });
  return found;
}

function resolveUrl(src: string, baseUrl: string): string | null {
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('//')) return `https:${src}`;
  if (src.startsWith('/') && baseUrl) return `${baseUrl}${src}`;
  return null;
}
