-- Normalize country values, repair city ownership, and make counts/page queries agree on
-- city + state + country. This prevents same-named cities from sharing inventory.

UPDATE restaurants r
SET country = c.code,
    updated_at = NOW()
FROM countries c
WHERE r.country IS NOT NULL
  AND (LOWER(TRIM(r.country)) = LOWER(c.name) OR LOWER(TRIM(r.country)) = LOWER(c.code))
  AND r.country IS DISTINCT FROM c.code;

UPDATE restaurants
SET country = 'GB',
    updated_at = NOW()
WHERE UPPER(TRIM(country)) = 'UK';

UPDATE restaurants
SET country = CASE
      WHEN state IN ('BC', 'NL', 'AB', 'ON', 'QC', 'SK') THEN 'CA'
      WHEN state = 'NSW' THEN 'AU'
      WHEN state IN ('ENG', 'North Yorkshire') THEN 'GB'
      WHEN state = 'Yucatan' THEN 'MX'
      WHEN state = 'Manabí' THEN 'EC'
      ELSE country
    END,
    updated_at = NOW()
WHERE country = 'US'
  AND state IN ('BC', 'NL', 'AB', 'ON', 'QC', 'SK', 'NSW', 'ENG', 'North Yorkshire', 'Yucatan', 'Manabí');

UPDATE restaurants
SET state = NULL,
    updated_at = NOW()
WHERE state = '';

UPDATE cities
SET state = NULL,
    updated_at = NOW()
WHERE state = '';

WITH ranked_countries AS (
  SELECT
    r.city,
    r.state,
    r.country,
    ROW_NUMBER() OVER (
      PARTITION BY r.city, r.state
      ORDER BY COUNT(*) DESC, r.country
    ) AS rank
  FROM restaurants r
  WHERE r.is_public = true
    AND r.country IS NOT NULL
  GROUP BY r.city, r.state, r.country
)
UPDATE cities c
SET country = ranked.country,
    updated_at = NOW()
FROM ranked_countries ranked
WHERE ranked.rank = 1
  AND c.name = ranked.city
  AND c.state IS NOT DISTINCT FROM ranked.state
  AND c.country IS DISTINCT FROM ranked.country;

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
      AND r.state IS NOT DISTINCT FROM city.state
      AND r.country = city.country
      AND r.is_public = true
    GROUP BY city.id
  ) counts
  WHERE c.id = counts.city_id
    AND (c.restaurant_count, c.chef_count)
      IS DISTINCT FROM (counts.restaurant_count, counts.chef_count);
END;
$$;

DROP TRIGGER IF EXISTS restaurants_city_sync ON restaurants;
CREATE TRIGGER restaurants_city_sync
AFTER INSERT OR DELETE OR UPDATE OF city, state, country, is_public, chef_id ON restaurants
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_sync_city_counts();

SELECT sync_city_counts();
SELECT sync_country_counts();
