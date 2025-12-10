-- Optimize featured chefs RPC to avoid redundant subquery
-- Previous version calculated restaurant count twice (once in SELECT, once in WHERE)
-- This version uses a CTE for single calculation

CREATE OR REPLACE FUNCTION get_featured_chefs_with_counts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  photo_url TEXT,
  mini_bio TEXT,
  james_beard_status TEXT,
  chef_shows JSONB,
  restaurant_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH chef_restaurant_counts AS (
    SELECT 
      r.chef_id,
      COUNT(*) as count
    FROM restaurants r
    WHERE r.is_public = true
    GROUP BY r.chef_id
    HAVING COUNT(*) >= 2
  )
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.photo_url,
    c.mini_bio,
    c.james_beard_status::TEXT,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', cs.id,
            'season', cs.season,
            'result', cs.result,
            'is_primary', cs.is_primary,
            'show', jsonb_build_object('id', s.id, 'name', s.name, 'slug', s.slug)
          )
        )
        FROM chef_shows cs
        LEFT JOIN shows s ON s.id = cs.show_id
        WHERE cs.chef_id = c.id
      ),
      '[]'::jsonb
    ) as chef_shows,
    crc.count as restaurant_count
  FROM chefs c
  INNER JOIN chef_restaurant_counts crc ON crc.chef_id = c.id
  WHERE c.photo_url IS NOT NULL
  LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_featured_chefs_with_counts() IS 
'Returns chefs with photos and 2+ public restaurants, including their show appearances and restaurant count. Used for homepage featured chefs section. Optimized with CTE to avoid redundant count calculation.';
