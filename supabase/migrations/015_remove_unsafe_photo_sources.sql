-- Migration: Remove Unsafe Photo Sources
-- Date: 2025-12-03
-- Purpose: Remove Google Images and other unsafe photo sources from schema
-- Context: Legal compliance - only allow Wikipedia (CC-BY-SA) and manual uploads

-- Remove old photo_source constraint
ALTER TABLE chefs DROP CONSTRAINT IF EXISTS chefs_photo_source_check;

-- Add new constraint allowing only safe sources
ALTER TABLE chefs ADD CONSTRAINT chefs_photo_source_check 
  CHECK (photo_source IN ('wikipedia', 'manual'));

-- Clean up any legacy photo_source values (should be NULL after Phase 1 wipe)
-- This handles any edge cases where values weren't cleared
UPDATE chefs 
SET photo_source = NULL 
WHERE photo_source IN ('llm_search', 'tmdb', 'show_website', 'google_images')
  AND photo_source IS NOT NULL;

-- Add documentation comment
COMMENT ON COLUMN chefs.photo_source IS 
  'Source of chef photo: wikipedia (Wikimedia Commons CC-BY-SA license), manual (admin upload with press kit/editorial use), or NULL';

-- Verification query (optional - for manual testing)
-- SELECT photo_source, COUNT(*) as count 
-- FROM chefs 
-- GROUP BY photo_source
-- ORDER BY count DESC;
