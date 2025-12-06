-- Add unique constraint to prevent duplicate TV show appearances
-- Migration: 022_add_chef_shows_unique_constraint.sql

-- First, remove any existing duplicates (keep oldest record for each combination)
-- Using created_at to determine which record to keep (earliest one)
DELETE FROM chef_shows a
USING chef_shows b
WHERE a.id > b.id
  AND a.chef_id = b.chef_id
  AND a.show_id = b.show_id
  AND COALESCE(a.season, '') = COALESCE(b.season, '');

-- Add unique constraint
ALTER TABLE chef_shows
ADD CONSTRAINT chef_shows_unique_appearance 
UNIQUE (chef_id, show_id, season);

-- Create index to support the constraint
CREATE INDEX IF NOT EXISTS idx_chef_shows_unique ON chef_shows(chef_id, show_id, season);
