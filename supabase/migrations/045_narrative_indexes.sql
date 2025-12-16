-- Add indexes to support narrative queries and backfill operations
-- These indexes optimize queries that filter by narrative existence and timestamps

-- Index for finding chefs without narratives (for backfill)
CREATE INDEX IF NOT EXISTS idx_chefs_narrative_null
ON chefs(id)
WHERE career_narrative IS NULL;

-- Index for finding chefs by narrative generation timestamp (for refresh operations)
CREATE INDEX IF NOT EXISTS idx_chefs_narrative_generated_at
ON chefs(narrative_generated_at);

-- Index for finding restaurants without narratives (for backfill)
CREATE INDEX IF NOT EXISTS idx_restaurants_narrative_null
ON restaurants(id)
WHERE is_public = true AND status = 'open' AND restaurant_narrative IS NULL;

-- Index for finding restaurants that need narrative updates
-- Useful for periodic refresh of stale narratives
CREATE INDEX IF NOT EXISTS idx_restaurants_updated_at_public
ON restaurants(updated_at)
WHERE is_public = true AND status = 'open';

COMMENT ON INDEX idx_chefs_narrative_null IS 'Optimizes backfill queries for chefs missing career_narrative';
COMMENT ON INDEX idx_chefs_narrative_generated_at IS 'Supports refresh queries by narrative age';
COMMENT ON INDEX idx_restaurants_narrative_null IS 'Optimizes backfill queries for restaurants missing restaurant_narrative';
COMMENT ON INDEX idx_restaurants_updated_at_public IS 'Supports refresh queries for public open restaurants';
