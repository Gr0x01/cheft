-- Lightweight query for map pins - returns only essential data for markers
-- Reduces payload from ~500KB to ~50KB for 1000+ restaurants

CREATE OR REPLACE FUNCTION get_restaurant_map_pins()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  city TEXT,
  state TEXT,
  chef_name TEXT,
  chef_slug TEXT,
  price_tier TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.slug,
    r.name,
    r.lat,
    r.lng,
    r.city,
    r.state,
    c.name as chef_name,
    c.slug as chef_slug,
    r.price_tier,
    r.status
  FROM restaurants r
  LEFT JOIN chefs c ON c.id = r.chef_id
  WHERE r.is_public = true
    AND r.lat IS NOT NULL
    AND r.lng IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_restaurant_map_pins() IS 
'Returns lightweight restaurant data for map markers. No nested joins, minimal fields.';
