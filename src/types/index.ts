export type ArticleCategory =
  | 'Local News'
  | 'Weather'
  | 'Sports'
  | 'Public Safety'
  | 'Community Events'
  | 'Obituaries';

export const CATEGORIES: ArticleCategory[] = [
  'Local News',
  'Weather',
  'Sports',
  'Public Safety',
  'Community Events',
  'Obituaries',
];

export const CATEGORY_SLUGS: Record<ArticleCategory, string> = {
  'Local News': 'local-news',
  'Weather': 'weather',
  'Sports': 'sports',
  'Public Safety': 'public-safety',
  'Community Events': 'community-events',
  'Obituaries': 'obituaries',
};

export const SLUG_TO_CATEGORY: Record<string, ArticleCategory> = {
  'local-news': 'Local News',
  'weather': 'Weather',
  'sports': 'Sports',
  'public-safety': 'Public Safety',
  'community-events': 'Community Events',
  'obituaries': 'Obituaries',
};

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: ArticleCategory;
  source_url: string | null;
  source_name: string | null;
  hero_image_url: string | null;
  published_at: string;
  created_at: string;
  meta_title: string | null;
  meta_description: string | null;
  tags: string[] | null;
  is_published: boolean;
}

export interface ScrapedItem {
  source: string;
  sourceUrl: string;
  title: string;
  rawContent: string;
  category: ArticleCategory;
  publishedAt?: string;
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: ArticleCategory;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  heroImageUrl: string;
  sourceUrl: string;
  sourceName: string;
}

export interface PipelineLog {
  id: string;
  run_date: string;
  articles_generated: number;
  sources_scraped: string[];
  errors: string[];
  duration_seconds: number;
  created_at: string;
}

export interface WeatherData {
  temperature: number;
  temperatureUnit: string;
  unit: string;
  shortForecast: string;
  detailedForecast: string;
  windSpeed: string;
  windDirection: string;
  icon: string;
  name: string;
}
