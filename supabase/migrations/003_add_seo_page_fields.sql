-- Migration: add_seo_page_fields
-- Adds enrichment fields for SEO-optimized chef and restaurant pages

-- ============================================
-- CHEF ENRICHMENT FIELDS
-- ============================================
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS notable_awards TEXT[];
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS cookbook_titles TEXT[];
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS youtube_channel TEXT;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS "current_role" TEXT;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS mentor TEXT;

-- ============================================
-- RESTAURANT ENRICHMENT FIELDS
-- ============================================
-- Core (P0) - some may exist from Places enrichment
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_review_count INTEGER;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_photos JSONB DEFAULT '[]';

-- SEO & Discovery (P1)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS reservation_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS signature_dishes TEXT[];
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS michelin_stars INTEGER DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS year_opened INTEGER;

-- Nice to Have (P2)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hours JSONB;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS vibe_tags TEXT[];
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS dietary_options TEXT[];
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS awards TEXT[];
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS gift_card_url TEXT;

-- ============================================
-- CITIES TABLE (for landing pages)
-- ============================================
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT,
  country TEXT DEFAULT 'US',
  slug TEXT UNIQUE NOT NULL,
  restaurant_count INTEGER DEFAULT 0,
  chef_count INTEGER DEFAULT 0,
  hero_image_url TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chefs_photo ON chefs(photo_url) WHERE photo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chefs_instagram ON chefs(instagram_handle) WHERE instagram_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_google_rating ON restaurants(google_rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_restaurants_michelin ON restaurants(michelin_stars DESC) WHERE michelin_stars > 0;
CREATE INDEX IF NOT EXISTS idx_restaurants_year_opened ON restaurants(year_opened DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_restaurants_city_state ON restaurants(city, state);
CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);

-- ============================================
-- POPULATE CITIES FROM EXISTING DATA
-- ============================================
WITH city_data AS (
  SELECT 
    city,
    state,
    country,
    LOWER(REGEXP_REPLACE(city || '-' || COALESCE(state, ''), '[^a-zA-Z0-9]+', '-', 'g')) as slug,
    COUNT(DISTINCT id) as restaurant_count,
    COUNT(DISTINCT chef_id) as chef_count,
    ROW_NUMBER() OVER (PARTITION BY LOWER(REGEXP_REPLACE(city || '-' || COALESCE(state, ''), '[^a-zA-Z0-9]+', '-', 'g')) ORDER BY COUNT(DISTINCT id) DESC) as rn
  FROM restaurants
  WHERE is_public = true
  GROUP BY city, state, country
)
INSERT INTO cities (name, state, country, slug, restaurant_count, chef_count)
SELECT 
  city,
  state,
  country,
  slug,
  restaurant_count,
  chef_count
FROM city_data
WHERE rn = 1
ON CONFLICT (slug) DO UPDATE SET
  restaurant_count = EXCLUDED.restaurant_count,
  chef_count = EXCLUDED.chef_count,
  updated_at = now();
