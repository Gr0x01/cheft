-- Correct legacy US defaults on restaurants whose province/region identifies another country,
-- then refresh city ownership and geography counts.

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

SELECT sync_city_counts();
SELECT sync_country_counts();
