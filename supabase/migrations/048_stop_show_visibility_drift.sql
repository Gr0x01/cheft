-- Migration: Stop shows.is_public drifting back to hidden
-- Problem: is_public DEFAULTs to false, so every show a future ingest creates starts hidden.
--   That is what stranded 48 substantial shows (Chopped, Hell's Kitchen, MasterChef...) until
--   migration 047 — they were absent from the /shows index and never prerendered while still
--   earning organic traffic. Left alone, the next ingest recreates the same backlog.
--
--   The admin panel (/admin/shows) genuinely uses this flag to hide shows, so it has to keep
--   working; the default is what's wrong, not the flag.
--
-- Solution, two halves:
--   1. Default to true. New shows are visible unless an admin hides them, so "nobody got
--      round to it" can no longer mean "invisible".
--   2. Raise the /shows index bar from >0 chefs to >=3, so flipping the default can't let
--      thin new shows pollute the index. This mirrors MIN_INDEXABLE_SHOW_CHEFS in
--      src/lib/showIndexing.ts — keep the two in sync if either moves.
--
--   No-op against today's data: all 51 shows on the index already have >=3 chefs.
--
-- Rollback:
--   ALTER TABLE shows ALTER COLUMN is_public SET DEFAULT false;
--   ...and restore the `> 0` predicate in get_shows_with_counts below.
-- Created: 2026-08-02

ALTER TABLE shows ALTER COLUMN is_public SET DEFAULT true;

CREATE OR REPLACE FUNCTION public.get_shows_with_counts()
 RETURNS TABLE(id uuid, name text, slug text, network text, created_at timestamp with time zone, show_type text, chef_count bigint, restaurant_count bigint, child_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.slug, s.network, s.created_at, s.show_type,
    COALESCE(counts.chef_count, 0) as chef_count,
    COALESCE(counts.restaurant_count, 0) as restaurant_count,
    COALESCE(child_stats.child_count, 0) as child_count
  FROM shows s
  LEFT JOIN (
    SELECT parent.id as show_id, COUNT(DISTINCT cs.chef_id) as chef_count,
      COUNT(DISTINCT r.id) as restaurant_count
    FROM shows parent
    LEFT JOIN shows child ON child.parent_show_id = parent.id
    LEFT JOIN chef_shows cs ON cs.show_id = parent.id OR cs.show_id = child.id
    LEFT JOIN restaurants r ON cs.chef_id = r.chef_id AND r.is_public = true
    GROUP BY parent.id
  ) counts ON s.id = counts.show_id
  LEFT JOIN (
    SELECT parent_show_id, COUNT(*) as child_count FROM shows
    WHERE parent_show_id IS NOT NULL GROUP BY parent_show_id
  ) child_stats ON s.id = child_stats.parent_show_id
  -- chef_count here already includes child shows' chefs, matching isShowWorthIndexing().
  WHERE s.is_public = true AND s.parent_show_id IS NULL AND COALESCE(counts.chef_count, 0) >= 3
  ORDER BY s.name;
END;
$function$;
