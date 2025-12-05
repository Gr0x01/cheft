-- Update photo_source constraint to include show_website
ALTER TABLE chefs DROP CONSTRAINT IF EXISTS chefs_photo_source_check;

ALTER TABLE chefs ADD CONSTRAINT chefs_photo_source_check 
  CHECK (photo_source IS NULL OR photo_source IN ('wikipedia', 'tmdb', 'llm_search', 'show_website', 'manual'));

COMMENT ON COLUMN chefs.photo_source IS 'Source of photo: wikipedia, tmdb, llm_search, show_website, or manual';
