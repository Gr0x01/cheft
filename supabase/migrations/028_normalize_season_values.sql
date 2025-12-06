-- Migration: Normalize season values to simple numbers or years
-- Problem: Season values like "Season 9", "various (2005-2012)", "Season 15, Episode 1" break URLs
-- Solution: Normalize to simple format, preserve original in season_name for display

-- Step 1: Create normalization function
CREATE OR REPLACE FUNCTION normalize_season(season_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF season_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Extract season number from "Season 7, Episode 6, 2009" format (must be first)
  IF season_text ~ '^Season\s+\d+,' THEN
    season_text := REGEXP_REPLACE(season_text, '^Season\s+(\d+),.*', '\1', 'i');
    RETURN TRIM(season_text);
  END IF;
  
  -- Remove "Season" prefix (case-insensitive) and trim
  season_text := TRIM(REGEXP_REPLACE(season_text, '^Season\s+', '', 'i'));
  
  -- Remove "Episode" prefix and extract number
  season_text := TRIM(REGEXP_REPLACE(season_text, '^Episode\s+', '', 'i'));
  
  -- For "X (YYYY)" format, extract just the number (e.g., "6 (2025)" -> "6")
  IF season_text ~ '^\d+\s*\(\d{4}\)' THEN
    season_text := REGEXP_REPLACE(season_text, '^(\d+)\s*\(.*\)', '\1');
  END IF;
  
  -- Extract first number from formats like "15, Episode 1" or "6, Episode 12"
  IF season_text ~ '^\d+,.*' THEN
    season_text := REGEXP_REPLACE(season_text, '^(\d+),.*', '\1');
  END IF;
  
  -- For date formats like "March 8, 2018", extract year
  IF season_text ~ '^[A-Za-z]+\s+\d+,\s*\d{4}' THEN
    season_text := REGEXP_REPLACE(season_text, '^.*,\s*(\d{4}).*', '\1');
  END IF;
  
  -- For "various (YYYY-YYYY)" format, extract first year
  IF season_text ~ '^various\s*\(.*\)' THEN
    season_text := REGEXP_REPLACE(season_text, '^various\s*\((\d{4}).*\).*', '\1');
  END IF;
  
  -- For "YYYY, YYYY" format (multiple years), extract first year
  IF season_text ~ '^\d{4},\s*\d{4}' THEN
    season_text := REGEXP_REPLACE(season_text, '^(\d{4}),.*', '\1');
  END IF;
  
  -- Extract number from "Episode "Name" (YYYY)" format
  IF season_text ~ '".*"\s*\(\d{4}\)' THEN
    season_text := REGEXP_REPLACE(season_text, '.*\((\d{4})\).*', '\1');
  END IF;
  
  -- Extract year from any remaining "(YYYY)" format
  IF season_text ~ '\(\d{4}\)' THEN
    season_text := REGEXP_REPLACE(season_text, '.*\((\d{4})\).*', '\1');
  END IF;
  
  RETURN TRIM(season_text);
END;
$$;

-- Step 2: Preserve original season values in season_name where missing
UPDATE chef_shows
SET season_name = CASE
  WHEN season_name IS NULL OR season_name = '' THEN season
  ELSE season_name
END
WHERE season IS NOT NULL;

-- Step 3: Update season values to normalized format
UPDATE chef_shows
SET season = normalize_season(season)
WHERE season IS NOT NULL
  AND season != normalize_season(season);

-- Step 4: Create index on normalized season for better query performance
CREATE INDEX IF NOT EXISTS idx_chef_shows_season_normalized ON chef_shows(season) WHERE season IS NOT NULL;

-- Step 5: Add comment
COMMENT ON FUNCTION normalize_season(TEXT) IS 'Normalizes season values to simple numbers or years for URL-safe routing';

-- Validation query (run manually to check results):
-- SELECT DISTINCT 
--   season AS normalized, 
--   season_name AS original,
--   COUNT(*) as count
-- FROM chef_shows
-- WHERE season IS NOT NULL
-- GROUP BY season, season_name
-- ORDER BY season;
