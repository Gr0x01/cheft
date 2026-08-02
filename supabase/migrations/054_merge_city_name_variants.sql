-- Follow-up to 053. The backfill's duplicate-slug guard correctly refused to create second
-- pages for cities that already existed under a punctuation variant ("St. Helena" vs the
-- stored "St Helena"), but that left those restaurants matching no city row at all. Align the
-- restaurant spellings to the stored ones instead, and merge the one true duplicate.

-- Stored names carrying trailing whitespace never matched their restaurants.
UPDATE cities SET name = btrim(name), updated_at = NOW() WHERE name <> btrim(name);

-- "Washington D.C." is a second page for a city that already has one: washington-dc holds 31
-- restaurants and is the single most visited city page on the site.
UPDATE restaurants
SET city = 'Washington', state = 'DC', country = 'US', updated_at = NOW()
WHERE city IN ('Washington, D.C.', 'Washington D.C.') AND state = 'DC';

DELETE FROM cities WHERE slug = 'washington-d-c-dc';

-- Punctuation variants of existing city rows.
UPDATE restaurants SET city = 'St Helena',     updated_at = NOW() WHERE city = 'St. Helena'     AND state = 'CA';
UPDATE restaurants SET city = 'St Paul',       updated_at = NOW() WHERE city = 'St. Paul'       AND state = 'MN';
UPDATE restaurants SET city = 'St Petersburg', updated_at = NOW() WHERE city = 'St. Petersburg' AND state = 'FL';

-- Country recorded as a full name on the city row but an ISO code on its restaurants.
UPDATE cities SET country = 'RS', updated_at = NOW() WHERE slug = 'belgrade' AND country = 'Serbia';

SELECT sync_city_counts();
SELECT sync_country_counts();
