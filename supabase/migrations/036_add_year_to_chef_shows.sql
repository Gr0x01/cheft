-- Migration: Add year column to chef_shows for shows that use years instead of seasons
-- Examples: Guy's Grocery Games (2021), Tournament of Champions (2023)

ALTER TABLE chef_shows ADD COLUMN year INTEGER;

CREATE INDEX idx_chef_shows_year ON chef_shows(year) WHERE year IS NOT NULL;

COMMENT ON COLUMN chef_shows.year IS 'Year of appearance for shows that use years instead of numbered seasons (e.g., GGG 2021)';
