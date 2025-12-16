-- Migration: Fix ambiguous chef_id column reference
-- Purpose: Fix "column reference 'chef_id' is ambiguous" error in get_show_with_chef_counts
-- The subquery's chef_id conflicts with the RETURNS TABLE chef_id column name

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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH target_show AS (
    SELECT * FROM shows WHERE slug = p_show_slug
  ),
  all_related_shows AS (
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
    COALESCE(rc.cnt, 0) as restaurant_count,
    ars.slug as source_show_slug,
    ars.name as source_show_name
  FROM target_show ts
  LEFT JOIN shows parent ON ts.parent_show_id = parent.id
  CROSS JOIN all_related_shows ars
  JOIN chef_shows cs ON ars.id = cs.show_id
  JOIN chefs c ON cs.chef_id = c.id
  LEFT JOIN (
    SELECT
      r.chef_id as cid,
      COUNT(*) as cnt
    FROM restaurants r
    WHERE r.is_public = true
    GROUP BY r.chef_id
  ) rc ON c.id = rc.cid
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
