-- Fix N+1 query in getFeaturedChefs that was causing connection exhaustion
-- Previously made 100 separate count queries, now does it in one query

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
    (
      SELECT COUNT(*)
      FROM restaurants r
      WHERE r.chef_id = c.id AND r.is_public = true
    ) as restaurant_count
  FROM chefs c
  WHERE c.photo_url IS NOT NULL
    AND (
      SELECT COUNT(*)
      FROM restaurants r
      WHERE r.chef_id = c.id AND r.is_public = true
    ) >= 2
  LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_featured_chefs_with_counts() IS 
'Returns chefs with photos and 2+ public restaurants, including their show appearances and restaurant count. Used for homepage featured chefs section.';
