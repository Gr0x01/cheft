-- Every one of the 1,298 chef_shows rows had is_primary = false — not one was ever set, so
-- `find(cs => cs.is_primary) || chef_shows[0]` fell through to arbitrary row order everywhere
-- it appears. 229 of 445 chefs (51.5%) are on more than one show, so for half the roster the
-- displayed "primary show" was whichever row the database happened to return first.
--
-- Rank each chef's appearances by how notable they are: strongest result first, then the
-- larger show, then name for stability. Exactly one row per chef ends up flagged.

WITH show_size AS (
  SELECT show_id, COUNT(*) AS chefs FROM chef_shows GROUP BY show_id
), ranked AS (
  SELECT cs.id,
    ROW_NUMBER() OVER (
      PARTITION BY cs.chef_id
      ORDER BY CASE cs.result
                 WHEN 'winner'     THEN 0
                 WHEN 'finalist'   THEN 1
                 WHEN 'contestant' THEN 2
                 WHEN 'judge'      THEN 3
                 ELSE 4
               END,
               ss.chefs DESC NULLS LAST,
               s.name
    ) AS rn
  FROM chef_shows cs
  JOIN shows s ON s.id = cs.show_id
  LEFT JOIN show_size ss ON ss.show_id = cs.show_id
)
UPDATE chef_shows cs
SET is_primary = (ranked.rn = 1)
FROM ranked
WHERE ranked.id = cs.id
  AND cs.is_primary IS DISTINCT FROM (ranked.rn = 1);
