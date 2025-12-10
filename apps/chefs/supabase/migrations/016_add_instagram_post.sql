-- Migration: add_instagram_post
-- Adds featured_instagram_post column to chefs table for embedding Instagram posts

-- Add column for featured Instagram post URL
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS featured_instagram_post TEXT;

-- Add constraint to validate Instagram post URL format
-- Must be https://www.instagram.com/p/{POST_ID}/ or https://www.instagram.com/reel/{POST_ID}/
ALTER TABLE chefs ADD CONSTRAINT chefs_instagram_post_format 
  CHECK (
    featured_instagram_post IS NULL 
    OR featured_instagram_post ~* '^https://www\.instagram\.com/(p|reel)/[A-Za-z0-9_-]+/?$'
  );

-- Add index for quick lookups of chefs with featured posts
CREATE INDEX IF NOT EXISTS idx_chefs_instagram_post 
  ON chefs(featured_instagram_post) 
  WHERE featured_instagram_post IS NOT NULL;

-- Add comment
COMMENT ON COLUMN chefs.featured_instagram_post IS 
  'Instagram post URL to embed on chef page (e.g., https://www.instagram.com/p/ABC123/)';
