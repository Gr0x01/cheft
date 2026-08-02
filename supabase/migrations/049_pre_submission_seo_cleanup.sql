-- Preserve complementary data while consolidating six accent-damaged chef duplicates,
-- then keep city landing-page counts synchronized with public restaurant inventory.

CREATE TEMP TABLE chef_merge_map (
  loser_id UUID PRIMARY KEY,
  keeper_id UUID NOT NULL
) ON COMMIT DROP;

INSERT INTO chef_merge_map (loser_id, keeper_id)
SELECT loser.id, keeper.id
FROM (VALUES
  ('ana-ro', 'ana-ros'),
  ('ngel-le-n', 'angel-leon'),
  ('virgilio-mart-nez', 'virgilio-martinez'),
  ('musa-da-deviren', 'musa-dagdeviren'),
  ('albert-adri', 'albert-adria'),
  ('jos-andr-s', 'jose-andres')
) AS slugs(loser_slug, keeper_slug)
JOIN chefs loser ON loser.slug = slugs.loser_slug
JOIN chefs keeper ON keeper.slug = slugs.keeper_slug;

DO $$
DECLARE
  merge_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO merge_count FROM chef_merge_map;
  IF merge_count NOT IN (0, 6) THEN
    RAISE EXCEPTION 'Expected all six chef merge pairs or an already-merged database; found %', merge_count;
  END IF;
END;
$$;

UPDATE chefs keeper
SET mini_bio = COALESCE(keeper.mini_bio, loser.mini_bio),
    career_narrative = COALESCE(keeper.career_narrative, loser.career_narrative),
    country = COALESCE(keeper.country, loser.country),
    james_beard_status = COALESCE(keeper.james_beard_status, loser.james_beard_status),
    photo_url = COALESCE(keeper.photo_url, loser.photo_url),
    photo_source = COALESCE(keeper.photo_source, loser.photo_source),
    social_links = COALESCE(loser.social_links, '{}'::JSONB)
      || COALESCE(keeper.social_links, '{}'::JSONB),
    notable_awards = ARRAY(
      SELECT DISTINCT UNNEST(
        COALESCE(keeper.notable_awards, ARRAY[]::TEXT[])
        || COALESCE(loser.notable_awards, ARRAY[]::TEXT[])
      )
    ),
    instagram_handle = COALESCE(keeper.instagram_handle, loser.instagram_handle),
    featured_instagram_post = COALESCE(keeper.featured_instagram_post, loser.featured_instagram_post),
    cookbook_titles = ARRAY(
      SELECT DISTINCT UNNEST(
        COALESCE(keeper.cookbook_titles, ARRAY[]::TEXT[])
        || COALESCE(loser.cookbook_titles, ARRAY[]::TEXT[])
      )
    ),
    youtube_channel = COALESCE(keeper.youtube_channel, loser.youtube_channel),
    current_role = COALESCE(keeper.current_role, loser.current_role),
    current_position = COALESCE(keeper.current_position, loser.current_position),
    mentor = COALESCE(keeper.mentor, loser.mentor),
    last_verified_at = COALESCE(keeper.last_verified_at, loser.last_verified_at),
    narrative_generated_at = COALESCE(keeper.narrative_generated_at, loser.narrative_generated_at),
    last_enriched_at = COALESCE(keeper.last_enriched_at, loser.last_enriched_at),
    enrichment_priority = COALESCE(keeper.enrichment_priority, loser.enrichment_priority),
    manual_priority = COALESCE(keeper.manual_priority, false)
      OR COALESCE(loser.manual_priority, false),
    updated_at = NOW()
FROM chef_merge_map m
JOIN chefs loser ON loser.id = m.loser_id
WHERE keeper.id = m.keeper_id;

UPDATE chef_shows cs
SET chef_id = m.keeper_id
FROM chef_merge_map m
WHERE cs.chef_id = m.loser_id;

UPDATE restaurants r
SET chef_id = m.keeper_id,
    updated_at = NOW()
FROM chef_merge_map m
WHERE r.chef_id = m.loser_id;

INSERT INTO restaurant_chefs (restaurant_id, chef_id, role, is_primary, created_at)
SELECT rc.restaurant_id, m.keeper_id, rc.role, rc.is_primary, rc.created_at
FROM restaurant_chefs rc
JOIN chef_merge_map m ON rc.chef_id = m.loser_id
ON CONFLICT (restaurant_id, chef_id) DO UPDATE SET
  is_primary = restaurant_chefs.is_primary OR EXCLUDED.is_primary;

DELETE FROM restaurant_chefs rc
USING chef_merge_map m
WHERE rc.chef_id = m.loser_id;

UPDATE enrichment_jobs ej
SET chef_id = m.keeper_id
FROM chef_merge_map m
WHERE ej.chef_id = m.loser_id;

UPDATE pending_discoveries pd
SET source_chef_id = m.keeper_id
FROM chef_merge_map m
WHERE pd.source_chef_id = m.loser_id;

DELETE FROM chefs c
USING chef_merge_map m
WHERE c.id = m.loser_id;

CREATE OR REPLACE FUNCTION sync_city_counts()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE cities c
  SET restaurant_count = counts.restaurant_count,
      chef_count = counts.chef_count,
      updated_at = NOW()
  FROM (
    SELECT
      city.id AS city_id,
      COUNT(DISTINCT r.id)::INTEGER AS restaurant_count,
      COUNT(DISTINCT r.chef_id)::INTEGER AS chef_count
    FROM cities city
    LEFT JOIN restaurants r
      ON r.city = city.name
      AND COALESCE(r.state, '') = COALESCE(city.state, '')
      AND r.is_public = true
    GROUP BY city.id
  ) counts
  WHERE c.id = counts.city_id
    AND (c.restaurant_count, c.chef_count)
      IS DISTINCT FROM (counts.restaurant_count, counts.chef_count);
END;
$$;

CREATE OR REPLACE FUNCTION trigger_sync_city_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM sync_city_counts();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS restaurants_city_sync ON restaurants;
CREATE TRIGGER restaurants_city_sync
AFTER INSERT OR DELETE OR UPDATE OF city, state, country, is_public, chef_id ON restaurants
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_sync_city_counts();

SELECT sync_city_counts();
