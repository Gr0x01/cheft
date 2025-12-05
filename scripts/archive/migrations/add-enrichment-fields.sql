-- Add enrichment fields to chefs and restaurants tables
-- Phase 5: Media enrichment support for photos and Google Places data

-- Chef photo fields
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS photo_source TEXT;

-- Add constraint for photo_source values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chefs_photo_source_check'
  ) THEN
    ALTER TABLE chefs ADD CONSTRAINT chefs_photo_source_check 
      CHECK (photo_source IS NULL OR photo_source IN ('wikipedia', 'tmdb', 'llm_search', 'manual'));
  END IF;
END $$;

-- Restaurant Google Places fields
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_rating NUMERIC(2,1);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_review_count INTEGER;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_price_level INTEGER;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS photo_urls TEXT[];
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;

-- Add constraint for google_price_level (0=free, 1=inexpensive, 2=moderate, 3=expensive, 4=very expensive)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_google_price_level_check'
  ) THEN
    ALTER TABLE restaurants ADD CONSTRAINT restaurants_google_price_level_check 
      CHECK (google_price_level IS NULL OR google_price_level BETWEEN 0 AND 4);
  END IF;
END $$;

-- Add constraint for google_rating (1.0 to 5.0)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_google_rating_check'
  ) THEN
    ALTER TABLE restaurants ADD CONSTRAINT restaurants_google_rating_check 
      CHECK (google_rating IS NULL OR google_rating BETWEEN 1.0 AND 5.0);
  END IF;
END $$;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_chefs_photo_url ON chefs(photo_url) WHERE photo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON restaurants(google_place_id) WHERE google_place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_google_rating ON restaurants(google_rating) WHERE google_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_last_enriched ON restaurants(last_enriched_at);

-- Comment on columns for documentation
COMMENT ON COLUMN chefs.photo_url IS 'URL to chef headshot photo';
COMMENT ON COLUMN chefs.photo_source IS 'Source of photo: wikipedia, tmdb, llm_search, or manual';
COMMENT ON COLUMN restaurants.google_place_id IS 'Google Places API place ID for this restaurant';
COMMENT ON COLUMN restaurants.google_rating IS 'Google Maps rating (1.0-5.0)';
COMMENT ON COLUMN restaurants.google_review_count IS 'Total number of Google reviews';
COMMENT ON COLUMN restaurants.google_price_level IS 'Google price level (0=free to 4=very expensive)';
COMMENT ON COLUMN restaurants.photo_urls IS 'Array of photo URLs from Google Places';
COMMENT ON COLUMN restaurants.last_enriched_at IS 'Timestamp of last Google Places enrichment';
