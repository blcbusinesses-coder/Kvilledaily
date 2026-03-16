-- Kendallville Daily — Initial Database Schema
-- Run this in Supabase SQL Editor or via Supabase CLI

-- ── Articles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  content       TEXT NOT NULL,
  excerpt       TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN (
                  'Local News', 'Weather', 'Sports',
                  'Public Safety', 'Community Events', 'Obituaries'
                )),
  source_url    TEXT,
  source_name   TEXT,
  hero_image_url TEXT,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta_title    TEXT,
  meta_description TEXT,
  tags          TEXT[],
  is_published  BOOLEAN NOT NULL DEFAULT TRUE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category     ON articles (category);
CREATE INDEX IF NOT EXISTS idx_articles_slug         ON articles (slug);
CREATE INDEX IF NOT EXISTS idx_articles_is_published ON articles (is_published);

-- ── Pipeline Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date           DATE NOT NULL,
  articles_generated INTEGER NOT NULL DEFAULT 0,
  sources_scraped    TEXT[] NOT NULL DEFAULT '{}',
  errors             TEXT[] NOT NULL DEFAULT '{}',
  duration_seconds   INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_logs_run_date ON pipeline_logs (run_date DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Articles: public read, service-role write
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published articles"
  ON articles FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "Service role can insert articles"
  ON articles FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Service role can update articles"
  ON articles FOR UPDATE
  USING (TRUE);

-- Pipeline logs: service-role only
ALTER TABLE pipeline_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage pipeline logs"
  ON pipeline_logs FOR ALL
  USING (TRUE);

-- ── Helper function: upsert article by slug ───────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_article(
  p_title         TEXT,
  p_slug          TEXT,
  p_content       TEXT,
  p_excerpt       TEXT,
  p_category      TEXT,
  p_source_url    TEXT,
  p_source_name   TEXT,
  p_hero_image_url TEXT,
  p_published_at  TIMESTAMPTZ,
  p_meta_title    TEXT,
  p_meta_description TEXT,
  p_tags          TEXT[],
  p_is_published  BOOLEAN
) RETURNS articles AS $$
DECLARE
  result articles;
BEGIN
  INSERT INTO articles (
    title, slug, content, excerpt, category, source_url, source_name,
    hero_image_url, published_at, meta_title, meta_description, tags, is_published
  ) VALUES (
    p_title, p_slug, p_content, p_excerpt, p_category, p_source_url, p_source_name,
    p_hero_image_url, p_published_at, p_meta_title, p_meta_description, p_tags, p_is_published
  )
  ON CONFLICT (slug) DO UPDATE SET
    title            = EXCLUDED.title,
    content          = EXCLUDED.content,
    excerpt          = EXCLUDED.excerpt,
    meta_title       = EXCLUDED.meta_title,
    meta_description = EXCLUDED.meta_description
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
