-- Migration: michelin_reference_table
-- Purpose: Create reference table for Michelin starred restaurants with auto-sync

CREATE TABLE IF NOT EXISTS michelin_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT DEFAULT 'USA',
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 3),
  cuisine TEXT,
  wikipedia_url TEXT,
  last_verified DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, city)
);

CREATE INDEX IF NOT EXISTS idx_michelin_restaurants_city_state ON michelin_restaurants(city, state);
CREATE INDEX IF NOT EXISTS idx_michelin_restaurants_stars ON michelin_restaurants(stars DESC);

-- Sync function: exact name match, flexible city/state matching
CREATE OR REPLACE FUNCTION sync_all_michelin_stars()
RETURNS TABLE(restaurant_name TEXT, michelin_name TEXT, city TEXT, stars INTEGER) AS $$
BEGIN
  RETURN QUERY
  UPDATE restaurants r
  SET michelin_stars = m.stars, updated_at = NOW()
  FROM michelin_restaurants m
  WHERE r.michelin_stars IS DISTINCT FROM m.stars
    AND LOWER(TRIM(r.name)) = LOWER(TRIM(m.name))
    AND (
      LOWER(TRIM(r.city)) = LOWER(TRIM(m.city))
      OR LOWER(TRIM(r.city)) LIKE '%' || LOWER(TRIM(m.city)) || '%'
      OR LOWER(TRIM(m.city)) LIKE '%' || LOWER(TRIM(r.city)) || '%'
      OR (m.state IS NOT NULL AND r.state IS NOT NULL AND (
        LOWER(TRIM(r.state)) = LOWER(TRIM(m.state))
        OR (LOWER(r.state) = 'ny' AND LOWER(m.state) = 'new york')
        OR (LOWER(r.state) = 'ca' AND LOWER(m.state) = 'california')
        OR (LOWER(r.state) = 'il' AND LOWER(m.state) = 'illinois')
        OR (LOWER(r.state) = 'fl' AND LOWER(m.state) = 'florida')
        OR (LOWER(r.state) = 'tx' AND LOWER(m.state) = 'texas')
        OR (LOWER(r.state) = 'co' AND LOWER(m.state) = 'colorado')
        OR (LOWER(r.state) = 'ga' AND LOWER(m.state) = 'georgia')
        OR (LOWER(r.state) = 'dc' AND LOWER(m.state) = 'district of columbia')
      ))
    )
  RETURNING r.name, m.name, r.city, m.stars;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-sync on insert/update
CREATE OR REPLACE FUNCTION sync_michelin_to_restaurants()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE restaurants r
  SET michelin_stars = NEW.stars, updated_at = NOW()
  WHERE LOWER(TRIM(r.name)) = LOWER(TRIM(NEW.name))
    AND r.michelin_stars IS DISTINCT FROM NEW.stars
    AND (
      LOWER(TRIM(r.city)) = LOWER(TRIM(NEW.city))
      OR LOWER(TRIM(r.city)) LIKE '%' || LOWER(TRIM(NEW.city)) || '%'
      OR LOWER(TRIM(NEW.city)) LIKE '%' || LOWER(TRIM(r.city)) || '%'
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_michelin ON michelin_restaurants;
CREATE TRIGGER trigger_sync_michelin
  AFTER INSERT OR UPDATE ON michelin_restaurants
  FOR EACH ROW EXECUTE FUNCTION sync_michelin_to_restaurants();
