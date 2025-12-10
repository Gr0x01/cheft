-- Add SEO description fields to shows table
-- These fields store LLM-generated descriptions for show and season pages

-- Add show-level description (2-3 sentences about the show's format, history, impact)
ALTER TABLE shows ADD COLUMN description TEXT;

-- Add season-specific descriptions as JSONB (keyed by season number/name)
-- Example: {"1": "First season set in San Francisco...", "2": "Season 2 in Los Angeles..."}
ALTER TABLE shows ADD COLUMN season_descriptions JSONB DEFAULT '{}'::jsonb;

-- Track when SEO content was generated
ALTER TABLE shows ADD COLUMN seo_generated_at TIMESTAMPTZ;

-- Create index for querying shows without SEO descriptions
CREATE INDEX idx_shows_seo_missing ON shows(seo_generated_at) WHERE description IS NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN shows.description IS 'LLM-generated 2-3 sentence overview of the show for SEO metadata';
COMMENT ON COLUMN shows.season_descriptions IS 'JSONB map of season identifiers to their SEO descriptions, e.g. {"4": "Chicago season crowned Stephanie Izard..."}';
