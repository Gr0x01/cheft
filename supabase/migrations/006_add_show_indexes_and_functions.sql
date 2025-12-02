-- Migration: Add indexes and optimized functions for show/season queries
-- Purpose: Fix N+1 query performance issues identified in code review

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Critical: Show slug lookups (used in all show pages)
CREATE INDEX IF NOT EXISTS idx_shows_slug ON shows(slug);

-- High: Combined show + season lookups (season pages)
CREATE INDEX IF NOT EXISTS idx_chef_shows_show_season ON chef_shows(show_id, season);

-- High: Season filtering (used in season queries)
CREATE INDEX IF NOT EXISTS idx_chef_shows_season ON chef_shows(season) WHERE season IS NOT NULL;

-- High: Restaurant count queries (show statistics)
CREATE INDEX IF NOT EXISTS idx_restaurants_chef_public ON restaurants(chef_id, is_public);

-- ============================================
-- OPTIMIZED POSTGRESQL FUNCTIONS
-- ============================================

-- Function: Get all shows with aggregated chef and restaurant counts
-- Replaces N+1 query pattern (25 queries -> 1 query)
CREATE OR REPLACE FUNCTION get_shows_with_counts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  network TEXT,
  created_at TIMESTAMPTZ,
  chef_count BIGINT,
  restaurant_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.slug,
    s.network,
    s.created_at,
    COALESCE(cs.chef_count, 0) as chef_count,
    COALESCE(rc.restaurant_count, 0) as restaurant_count
  FROM shows s
  LEFT JOIN (
    SELECT 
      show_id,
      COUNT(DISTINCT chef_id) as chef_count
    FROM chef_shows 
    GROUP BY show_id
  ) cs ON s.id = cs.show_id
  LEFT JOIN (
    SELECT 
      cs.show_id,
      COUNT(DISTINCT r.id) as restaurant_count
    FROM chef_shows cs
    JOIN restaurants r ON cs.chef_id = r.chef_id
    WHERE r.is_public = true
    GROUP BY cs.show_id
  ) rc ON s.id = rc.show_id
  WHERE COALESCE(cs.chef_count, 0) > 0
  ORDER BY s.name;
END;
$$;

-- Function: Get show with chef counts (optimized for show detail page)
-- Reduces N+1 queries when fetching show with all chefs
CREATE OR REPLACE FUNCTION get_show_with_chef_counts(p_show_slug TEXT)
RETURNS TABLE (
  show_id UUID,
  show_name TEXT,
  show_slug TEXT,
  show_network TEXT,
  show_created_at TIMESTAMPTZ,
  chef_show_id UUID,
  chef_id UUID,
  chef_name TEXT,
  chef_slug TEXT,
  chef_photo_url TEXT,
  chef_mini_bio TEXT,
  season TEXT,
  season_name TEXT,
  result TEXT,
  is_primary BOOLEAN,
  restaurant_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as show_id,
    s.name as show_name,
    s.slug as show_slug,
    s.network as show_network,
    s.created_at as show_created_at,
    cs.id as chef_show_id,
    c.id as chef_id,
    c.name as chef_name,
    c.slug as chef_slug,
    c.photo_url as chef_photo_url,
    c.mini_bio as chef_mini_bio,
    cs.season,
    cs.season_name,
    cs.result,
    cs.is_primary,
    COALESCE(rc.restaurant_count, 0) as restaurant_count
  FROM shows s
  JOIN chef_shows cs ON s.id = cs.show_id
  JOIN chefs c ON cs.chef_id = c.id
  LEFT JOIN (
    SELECT 
      chef_id,
      COUNT(*) as restaurant_count
    FROM restaurants
    WHERE is_public = true
    GROUP BY chef_id
  ) rc ON c.id = rc.chef_id
  WHERE s.slug = p_show_slug
  ORDER BY 
    CASE cs.result
      WHEN 'winner' THEN 1
      WHEN 'finalist' THEN 2
      WHEN 'judge' THEN 3
      WHEN 'contestant' THEN 4
      ELSE 5
    END,
    cs.season,
    c.name;
END;
$$;

-- Function: Get all unique seasons for a show (optimized for season listing)
CREATE OR REPLACE FUNCTION get_show_seasons(p_show_slug TEXT)
RETURNS TABLE (
  season TEXT,
  season_name TEXT,
  chef_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.season,
    MAX(cs.season_name) as season_name,
    COUNT(DISTINCT cs.chef_id) as chef_count
  FROM chef_shows cs
  JOIN shows s ON cs.show_id = s.id
  WHERE s.slug = p_show_slug
    AND cs.season IS NOT NULL
  GROUP BY cs.season
  ORDER BY cs.season;
END;
$$;

-- Function: Get specific show season with chefs and restaurants (optimized for season detail page)
CREATE OR REPLACE FUNCTION get_show_season_data(p_show_slug TEXT, p_season_number TEXT)
RETURNS TABLE (
  show_id UUID,
  show_name TEXT,
  show_slug TEXT,
  show_network TEXT,
  show_created_at TIMESTAMPTZ,
  season TEXT,
  season_name TEXT,
  chef_show_id UUID,
  chef_id UUID,
  chef_name TEXT,
  chef_slug TEXT,
  chef_photo_url TEXT,
  chef_mini_bio TEXT,
  result TEXT,
  is_primary BOOLEAN,
  restaurant_id UUID,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  restaurant_city TEXT,
  restaurant_state TEXT,
  restaurant_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as show_id,
    s.name as show_name,
    s.slug as show_slug,
    s.network as show_network,
    s.created_at as show_created_at,
    cs.season,
    cs.season_name,
    cs.id as chef_show_id,
    c.id as chef_id,
    c.name as chef_name,
    c.slug as chef_slug,
    c.photo_url as chef_photo_url,
    c.mini_bio as chef_mini_bio,
    cs.result,
    cs.is_primary,
    r.id as restaurant_id,
    r.name as restaurant_name,
    r.slug as restaurant_slug,
    r.city as restaurant_city,
    r.state as restaurant_state,
    r.status as restaurant_status
  FROM shows s
  JOIN chef_shows cs ON s.id = cs.show_id
  JOIN chefs c ON cs.chef_id = c.id
  LEFT JOIN restaurants r ON c.id = r.chef_id AND r.is_public = true
  WHERE s.slug = p_show_slug
    AND cs.season = p_season_number
  ORDER BY 
    CASE cs.result
      WHEN 'winner' THEN 1
      WHEN 'finalist' THEN 2
      WHEN 'judge' THEN 3
      WHEN 'contestant' THEN 4
      ELSE 5
    END,
    c.name,
    r.name;
END;
$$;

-- Function: Get all seasons for sitemap (single query instead of N+1)
CREATE OR REPLACE FUNCTION get_all_show_seasons_for_sitemap()
RETURNS TABLE (
  show_slug TEXT,
  season TEXT,
  show_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    s.slug as show_slug,
    cs.season,
    s.created_at as show_created_at
  FROM chef_shows cs
  JOIN shows s ON cs.show_id = s.id
  WHERE cs.season IS NOT NULL
  ORDER BY s.slug, cs.season;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Allow anonymous users to call these functions (read-only, safe)
GRANT EXECUTE ON FUNCTION get_shows_with_counts() TO anon;
GRANT EXECUTE ON FUNCTION get_show_with_chef_counts(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_show_seasons(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_show_season_data(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_all_show_seasons_for_sitemap() TO anon;
