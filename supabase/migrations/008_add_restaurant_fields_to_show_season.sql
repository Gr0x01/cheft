-- Migration: Add restaurant display fields to get_show_season_data function
-- Adds photo_urls, price_tier, cuisine_tags, google_rating, and google_review_count
-- so that RestaurantCardCompact can display properly on show/season pages

DROP FUNCTION IF EXISTS get_show_season_data(TEXT, TEXT);

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
  restaurant_status TEXT,
  restaurant_photo_urls TEXT[],
  restaurant_price_tier TEXT,
  restaurant_cuisine_tags TEXT[],
  restaurant_google_rating NUMERIC,
  restaurant_google_review_count INTEGER
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
    r.status as restaurant_status,
    r.photo_urls as restaurant_photo_urls,
    r.price_tier as restaurant_price_tier,
    r.cuisine_tags as restaurant_cuisine_tags,
    r.google_rating as restaurant_google_rating,
    r.google_review_count as restaurant_google_review_count
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
