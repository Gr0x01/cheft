-- Migration: add_seo_page_fields
-- Purpose: Add fields required for SEO-optimized chef and restaurant pages
-- Related spec: memory-bank/projects/seo-pages-spec.md

-- ============================================
-- CHEF ENRICHMENT FIELDS
-- ============================================
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS notable_awards TEXT[];
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS cookbook_titles TEXT[];
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS youtube_channel TEXT;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS current_position TEXT;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS mentor TEXT;

-- ============================================
-- RESTAURANT ENRICHMENT FIELDS
-- ============================================
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS reservation_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS signature_dishes TEXT[];
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS michelin_stars INTEGER DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS year_opened INTEGER;
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
CREATE INDEX IF NOT EXISTS idx_chefs_instagram ON chefs(instagram_handle) WHERE instagram_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_michelin ON restaurants(michelin_stars DESC) WHERE michelin_stars > 0;
CREATE INDEX IF NOT EXISTS idx_restaurants_year_opened ON restaurants(year_opened DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_restaurants_city_state ON restaurants(city, state);
CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);

-- ============================================
-- CONSTRAINTS
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_michelin_stars_check'
  ) THEN
    ALTER TABLE restaurants ADD CONSTRAINT restaurants_michelin_stars_check 
      CHECK (michelin_stars IS NULL OR michelin_stars BETWEEN 0 AND 3);
  END IF;
END $$;

-- ============================================
-- POPULATE CITIES FROM EXISTING DATA
-- ============================================
INSERT INTO cities (name, state, country, slug, restaurant_count, chef_count)
SELECT 
  name,
  state,
  country,
  slug,
  SUM(restaurant_count)::INTEGER as restaurant_count,
  SUM(chef_count)::INTEGER as chef_count
FROM (
  SELECT 
    city as name,
    state,
    COALESCE(country, 'US') as country,
    LOWER(REGEXP_REPLACE(
      TRIM(city) || '-' || COALESCE(TRIM(state), ''),
      '[^a-zA-Z0-9]+', '-', 'g'
    )) as slug,
    COUNT(DISTINCT id) as restaurant_count,
    COUNT(DISTINCT chef_id) as chef_count
  FROM restaurants
  WHERE city IS NOT NULL AND city != ''
  GROUP BY city, state, country
) as city_data
GROUP BY slug, name, state, country
ON CONFLICT (slug) DO UPDATE SET
  restaurant_count = EXCLUDED.restaurant_count,
  chef_count = EXCLUDED.chef_count,
  updated_at = now();

-- ============================================
-- COLUMN COMMENTS
-- ============================================
COMMENT ON COLUMN chefs.social_links IS 'JSON object with social media URLs: {instagram, twitter, website, facebook}';
COMMENT ON COLUMN chefs.notable_awards IS 'Array of awards beyond James Beard status';
COMMENT ON COLUMN chefs.instagram_handle IS 'Instagram username without @';
COMMENT ON COLUMN chefs.cookbook_titles IS 'Array of published cookbook titles';
COMMENT ON COLUMN chefs.youtube_channel IS 'YouTube channel URL';
COMMENT ON COLUMN chefs.current_position IS 'Current position e.g. "Executive Chef at X"';
COMMENT ON COLUMN chefs.mentor IS 'Notable mentor e.g. "Trained under Thomas Keller"';

COMMENT ON COLUMN restaurants.description IS 'LLM-generated 2-3 sentence description';
COMMENT ON COLUMN restaurants.phone IS 'Restaurant phone number';
COMMENT ON COLUMN restaurants.reservation_url IS 'OpenTable/Resy/direct reservation link';
COMMENT ON COLUMN restaurants.signature_dishes IS 'Array of notable dishes for long-tail SEO';
COMMENT ON COLUMN restaurants.michelin_stars IS 'Michelin star rating (0-3)';
COMMENT ON COLUMN restaurants.year_opened IS 'Year restaurant opened';
COMMENT ON COLUMN restaurants.hours IS 'Operating hours JSON structure';
COMMENT ON COLUMN restaurants.vibe_tags IS 'Atmosphere tags like "date night", "family friendly"';
COMMENT ON COLUMN restaurants.dietary_options IS 'Dietary accommodation tags';
COMMENT ON COLUMN restaurants.awards IS 'Array of awards like "Best New Restaurant 2024"';
COMMENT ON COLUMN restaurants.gift_card_url IS 'Direct link to purchase gift cards';

COMMENT ON TABLE cities IS 'City landing pages for local SEO targeting';
