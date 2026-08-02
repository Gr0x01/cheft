-- 37% of public restaurants (478 of 1,293) had no row in `cities`, so they were orphaned from
-- city pages entirely — the cities table was populated once by migration 024 and never refreshed
-- (sync_city_counts only updates counts on existing rows, it never inserts).
--
-- This normalizes the location data those rows would key on, repairs the malformed slugs the
-- old slug expression produced, then backfills the missing cities.

-- ---------------------------------------------------------------------------
-- 1. A slug expression that doesn't produce the breakage in migration 024.
--    That one used `city || '-' || COALESCE(state, '')`, which left a trailing
--    hyphen whenever a city had no state ("amman-"), and had no transliteration,
--    so accents became separators ("Montréal" -> "montr-al-qc").
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION city_slug(city_name TEXT, city_state TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    trim(both '-' from lower(regexp_replace(
      extensions.unaccent(trim(city_name) || '-' || COALESCE(trim(city_state), '')),
      '[^a-zA-Z0-9]+', '-', 'g'
    ))),
    ''
  );
$$;

COMMENT ON FUNCTION city_slug IS
  'Canonical city slug. Use this rather than inlining a regexp — see migration 053.';

-- ---------------------------------------------------------------------------
-- 2. Normalize restaurant location data.
--    City rows are matched on (name, state, country) exactly, so inconsistent
--    values here fragment one real city into several — London alone was stored
--    four ways (England / Greater London / ENG / null).
-- ---------------------------------------------------------------------------

UPDATE restaurants SET country = 'US', updated_at = NOW() WHERE country = 'USA';

-- Full state names where the rest of the table uses two-letter codes.
UPDATE restaurants
SET state = CASE state
      WHEN 'Colorado' THEN 'CO'
      WHEN 'Florida'  THEN 'FL'
      WHEN 'Ohio'     THEN 'OH'
      ELSE state
    END,
    updated_at = NOW()
WHERE country = 'US' AND state IN ('Colorado', 'Florida', 'Ohio');

-- Legacy US defaults on plainly foreign cities. Migration 051 fixed the ones
-- identifiable by their state; these all have state IS NULL, so they need naming
-- outright. Birmingham, New Orleans and Tokeland are genuinely US and stay put.
UPDATE restaurants
SET country = CASE city
      WHEN 'Amsterdam' THEN 'NL'
      WHEN 'Central'   THEN 'HK'
      WHEN 'Delhi'     THEN 'IN'
      WHEN 'Goa'       THEN 'IN'
      WHEN 'Lisbon'    THEN 'PT'
      WHEN 'Madrid'    THEN 'ES'
      WHEN 'Puebla'    THEN 'MX'
      WHEN 'Quito'     THEN 'EC'
      WHEN 'Sydney'    THEN 'AU'
      WHEN 'Tipeshwar' THEN 'IN'
      ELSE country
    END,
    updated_at = NOW()
WHERE country = 'US' AND state IS NULL
  AND city IN ('Amsterdam','Central','Delhi','Goa','Lisbon','Madrid','Puebla','Quito','Sydney','Tipeshwar');

-- Outside the US, Canada and Mexico the `state` values are region names recorded
-- inconsistently, and every existing non-US city row for those countries already
-- uses a null state. Collapsing to null merges the duplicates (London x4,
-- Barcelona's Catalonia/CT, Valencia, Bangkok) onto one page each.
UPDATE restaurants
SET state = NULL, updated_at = NOW()
WHERE country NOT IN ('US', 'CA', 'MX') AND state IS NOT NULL;

-- Montreal was split across three spellings; match the existing city row.
UPDATE restaurants
SET city = 'Montréal', state = 'QC', updated_at = NOW()
WHERE country = 'CA' AND city IN ('Montreal', 'Montréal');

-- ---------------------------------------------------------------------------
-- 3. Repair the malformed city rows.
--    València carried country 'US' and matched nothing, while six real Valencia
--    restaurants sat with no page at all.
-- ---------------------------------------------------------------------------
UPDATE cities SET name = 'Valencia', country = 'ES', updated_at = NOW()
WHERE slug = 'val-ncia-';

UPDATE cities SET country = 'GB', updated_at = NOW()
WHERE slug = 'cheltenham-';

UPDATE cities c
SET slug = city_slug(c.name, c.state), updated_at = NOW()
WHERE city_slug(c.name, c.state) IS DISTINCT FROM c.slug
  AND NOT EXISTS (
    SELECT 1 FROM cities other
    WHERE other.id <> c.id AND other.slug = city_slug(c.name, c.state)
  );

-- ---------------------------------------------------------------------------
-- 4. Backfill the missing cities.
--    Junk location values are excluded rather than turned into pages: placeholder
--    names, parenthetical qualifiers ("Chicago (Lakeview)"), and states recorded
--    as city names.
-- ---------------------------------------------------------------------------
INSERT INTO cities (name, state, country, slug, restaurant_count, chef_count)
SELECT DISTINCT ON (city_slug(r.city, r.state))
  r.city,
  r.state,
  r.country,
  city_slug(r.city, r.state),
  0,
  0
FROM restaurants r
WHERE r.is_public = true
  AND btrim(COALESCE(r.city, '')) <> ''
  AND lower(r.city) NOT IN ('unknown','various','various locations','multiple locations','hawaii','new jersey')
  AND r.city !~ '\('
  AND lower(COALESCE(r.state, '')) <> 'unknown'
  AND lower(COALESCE(r.country, '')) <> 'unknown'
  AND city_slug(r.city, r.state) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cities c
    WHERE c.name = r.city
      AND c.state IS NOT DISTINCT FROM r.state
      AND c.country = r.country
  )
  AND NOT EXISTS (
    SELECT 1 FROM cities c2 WHERE c2.slug = city_slug(r.city, r.state)
  )
ORDER BY city_slug(r.city, r.state), r.city;

SELECT sync_city_counts();
SELECT sync_country_counts();
