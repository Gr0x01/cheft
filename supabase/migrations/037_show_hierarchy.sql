-- Migration: Add show hierarchy support
-- Purpose: Enable parent/child relationships between shows (core → variants/named_seasons)
--          and visibility control for incomplete shows

-- ============================================
-- NEW COLUMNS
-- ============================================

-- Parent show reference (for variants and named seasons)
ALTER TABLE shows ADD COLUMN parent_show_id UUID REFERENCES shows(id);

-- Show classification type
ALTER TABLE shows ADD COLUMN show_type TEXT CHECK (show_type IN ('core', 'spinoff', 'variant', 'named_season'));

-- Visibility control (new shows default to non-public until admin approves)
ALTER TABLE shows ADD COLUMN is_public BOOLEAN DEFAULT false;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_shows_parent ON shows(parent_show_id);
CREATE INDEX idx_shows_type ON shows(show_type);
CREATE INDEX idx_shows_public ON shows(is_public);

-- ============================================
-- UPDATED RPC FUNCTIONS
-- ============================================

-- Function: Get all shows with aggregated chef and restaurant counts
-- UPDATED: Only returns public shows with no parent, aggregates child counts
CREATE OR REPLACE FUNCTION get_shows_with_counts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  network TEXT,
  created_at TIMESTAMPTZ,
  show_type TEXT,
  chef_count BIGINT,
  restaurant_count BIGINT,
  child_count BIGINT
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
    s.show_type,
    COALESCE(counts.chef_count, 0) as chef_count,
    COALESCE(counts.restaurant_count, 0) as restaurant_count,
    COALESCE(child_stats.child_count, 0) as child_count
  FROM shows s
  LEFT JOIN (
    -- Aggregate chefs from this show AND all child shows
    SELECT 
      parent.id as show_id,
      COUNT(DISTINCT cs.chef_id) as chef_count,
      COUNT(DISTINCT r.id) as restaurant_count
    FROM shows parent
    LEFT JOIN shows child ON child.parent_show_id = parent.id
    LEFT JOIN chef_shows cs ON cs.show_id = parent.id OR cs.show_id = child.id
    LEFT JOIN restaurants r ON cs.chef_id = r.chef_id AND r.is_public = true
    GROUP BY parent.id
  ) counts ON s.id = counts.show_id
  LEFT JOIN (
    -- Count direct children
    SELECT parent_show_id, COUNT(*) as child_count
    FROM shows
    WHERE parent_show_id IS NOT NULL
    GROUP BY parent_show_id
  ) child_stats ON s.id = child_stats.parent_show_id
  WHERE s.is_public = true 
    AND s.parent_show_id IS NULL
    AND COALESCE(counts.chef_count, 0) > 0
  ORDER BY s.name;
END;
$$;

-- Function: Get show with chef counts (optimized for show detail page)
-- UPDATED: Includes chefs from child shows, returns child_shows info
CREATE OR REPLACE FUNCTION get_show_with_chef_counts(p_show_slug TEXT)
RETURNS TABLE (
  show_id UUID,
  show_name TEXT,
  show_slug TEXT,
  show_network TEXT,
  show_created_at TIMESTAMPTZ,
  show_type TEXT,
  parent_show_id UUID,
  parent_show_slug TEXT,
  parent_show_name TEXT,
  is_public BOOLEAN,
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
  performance_blurb TEXT,
  restaurant_count BIGINT,
  source_show_slug TEXT,
  source_show_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH target_show AS (
    SELECT * FROM shows WHERE slug = p_show_slug
  ),
  all_related_shows AS (
    -- Include the target show and all its children (if it's a parent)
    SELECT ts.id, ts.slug, ts.name FROM target_show ts
    UNION ALL
    SELECT child.id, child.slug, child.name 
    FROM shows child, target_show ts 
    WHERE child.parent_show_id = ts.id AND child.is_public = true
  )
  SELECT 
    ts.id as show_id,
    ts.name as show_name,
    ts.slug as show_slug,
    ts.network as show_network,
    ts.created_at as show_created_at,
    ts.show_type,
    ts.parent_show_id,
    parent.slug as parent_show_slug,
    parent.name as parent_show_name,
    ts.is_public,
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
    cs.performance_blurb,
    COALESCE(rc.restaurant_count, 0) as restaurant_count,
    ars.slug as source_show_slug,
    ars.name as source_show_name
  FROM target_show ts
  LEFT JOIN shows parent ON ts.parent_show_id = parent.id
  CROSS JOIN all_related_shows ars
  JOIN chef_shows cs ON ars.id = cs.show_id
  JOIN chefs c ON cs.chef_id = c.id
  LEFT JOIN (
    SELECT 
      chef_id,
      COUNT(*) as restaurant_count
    FROM restaurants
    WHERE is_public = true
    GROUP BY chef_id
  ) rc ON c.id = rc.chef_id
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

-- Function: Get show family (parent, siblings, children)
-- NEW: For breadcrumb navigation and related shows
CREATE OR REPLACE FUNCTION get_show_family(p_show_id UUID)
RETURNS TABLE (
  relationship TEXT,
  show_id UUID,
  show_name TEXT,
  show_slug TEXT,
  show_type TEXT,
  is_public BOOLEAN,
  chef_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- Get parent_show_id for the target show
  SELECT parent_show_id INTO v_parent_id FROM shows WHERE id = p_show_id;

  RETURN QUERY
  -- Self
  SELECT 
    'self'::TEXT as relationship,
    s.id,
    s.name,
    s.slug,
    s.show_type,
    s.is_public,
    COALESCE(cc.cnt, 0) as chef_count
  FROM shows s
  LEFT JOIN (SELECT show_id, COUNT(DISTINCT chef_id) as cnt FROM chef_shows GROUP BY show_id) cc ON s.id = cc.show_id
  WHERE s.id = p_show_id
  
  UNION ALL
  
  -- Parent (if exists)
  SELECT 
    'parent'::TEXT,
    s.id,
    s.name,
    s.slug,
    s.show_type,
    s.is_public,
    COALESCE(cc.cnt, 0)
  FROM shows s
  LEFT JOIN (SELECT show_id, COUNT(DISTINCT chef_id) as cnt FROM chef_shows GROUP BY show_id) cc ON s.id = cc.show_id
  WHERE s.id = v_parent_id
  
  UNION ALL
  
  -- Siblings (same parent, excluding self)
  SELECT 
    'sibling'::TEXT,
    s.id,
    s.name,
    s.slug,
    s.show_type,
    s.is_public,
    COALESCE(cc.cnt, 0)
  FROM shows s
  LEFT JOIN (SELECT show_id, COUNT(DISTINCT chef_id) as cnt FROM chef_shows GROUP BY show_id) cc ON s.id = cc.show_id
  WHERE v_parent_id IS NOT NULL 
    AND s.parent_show_id = v_parent_id 
    AND s.id != p_show_id
    AND s.is_public = true
  
  UNION ALL
  
  -- Children (shows where this is the parent)
  SELECT 
    'child'::TEXT,
    s.id,
    s.name,
    s.slug,
    s.show_type,
    s.is_public,
    COALESCE(cc.cnt, 0)
  FROM shows s
  LEFT JOIN (SELECT show_id, COUNT(DISTINCT chef_id) as cnt FROM chef_shows GROUP BY show_id) cc ON s.id = cc.show_id
  WHERE s.parent_show_id = p_show_id
    AND s.is_public = true
  
  ORDER BY relationship, show_name;
END;
$$;

-- Function: Get child shows for a parent (for tabs/navigation)
-- Note: Output columns prefixed with child_ to avoid ambiguity with PL/pgSQL variables
CREATE OR REPLACE FUNCTION get_show_children(p_parent_slug TEXT)
RETURNS TABLE (
  child_show_id UUID,
  child_show_name TEXT,
  child_show_slug TEXT,
  child_show_type TEXT,
  child_chef_count BIGINT
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
    s.show_type,
    COALESCE(cc.cnt, 0) as chef_count
  FROM shows s
  JOIN shows parent ON s.parent_show_id = parent.id
  LEFT JOIN (SELECT cs.show_id as sid, COUNT(DISTINCT cs.chef_id) as cnt FROM chef_shows cs GROUP BY cs.show_id) cc ON s.id = cc.sid
  WHERE parent.slug = p_parent_slug
    AND s.is_public = true
  ORDER BY s.name;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_shows_with_counts() TO anon;
GRANT EXECUTE ON FUNCTION get_show_with_chef_counts(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_show_family(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_show_children(TEXT) TO anon;
