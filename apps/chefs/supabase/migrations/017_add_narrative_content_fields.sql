-- Add narrative content fields to chefs, restaurants, and cities tables
-- These fields will store LLM-generated narrative content for SEO enhancement

-- Chefs: Add career narrative (before/during/after show journey)
ALTER TABLE chefs ADD COLUMN career_narrative TEXT;
ALTER TABLE chefs ADD COLUMN narrative_generated_at TIMESTAMPTZ;

-- Restaurants: Add restaurant description narrative
ALTER TABLE restaurants ADD COLUMN restaurant_narrative TEXT;
ALTER TABLE restaurants ADD COLUMN narrative_generated_at TIMESTAMPTZ;

-- Cities: Add food scene overview narrative
ALTER TABLE cities ADD COLUMN city_narrative TEXT;
ALTER TABLE cities ADD COLUMN narrative_generated_at TIMESTAMPTZ;

-- Create index for querying entities without narratives
CREATE INDEX idx_chefs_narrative_missing ON chefs(narrative_generated_at) WHERE career_narrative IS NULL;
CREATE INDEX idx_restaurants_narrative_missing ON restaurants(narrative_generated_at) WHERE restaurant_narrative IS NULL;
CREATE INDEX idx_cities_narrative_missing ON cities(narrative_generated_at) WHERE city_narrative IS NULL;
