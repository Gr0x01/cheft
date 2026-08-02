-- Migration: Publish shows that were left unpublished by the default
-- Problem: shows.is_public DEFAULTs to false, so every show created by the Dec 2025 bulk
--   ingest (165 of them, created 2025-12-01..17) stayed unpublished. Only 27 were ever
--   flipped by hand. The flag therefore reflects "nobody got round to it", not curation.
--
--   Two queries filter on it — get_shows_with_counts (the /shows index) and the show page's
--   generateStaticParams — so substantial shows are invisible in internal linking and never
--   prerendered. Worst cases, all with real organic traffic over the 90 days to 2026-08-02:
--     Chopped                      68 chefs, 22 visitors
--     Beat Bobby Flay              59 chefs, 83 visitors
--     Iron Chef America            42 chefs, 23 visitors
--     Guy's Grocery Games          38 chefs, 19 visitors
--     24 in 24: Last Chef Standing 16 chefs, 62 visitors
--
-- Solution: publish every show meeting the same bar the app uses to decide indexing —
--   at least 3 distinct chefs, counting child shows, per src/lib/showIndexing.ts.
--   Deliberately one-way: this does not unpublish anything. The 9 published shows below the
--   bar keep their flag and are handled by the noindex in the show page's metadata.
-- Created: 2026-08-02

-- Rollback: the 48 shows this publishes, captured before it ran:
--   UPDATE shows SET is_public = false WHERE slug IN (
--     '24-in-24-last-chef-standing', 'alex-vs-america', 'battle-of-the-brothers', 'bbq-brawl',
--     'beat-bobby-flay', 'bobby-flay-s-triple-threat', 'chef-grudge-match', 'chopped',
--     'chopped-all-stars', 'chopped-jr', 'cutthroat-kitchen', 'cutthroat-kitchen-knives-out',
--     'extreme-chef', 'fast-foodies', 'fire-masters', 'food-fighters',
--     'food-network-challenge', 'food-network-star', 'great-soul-food-cook-off',
--     'guy-s-grocery-games', 'guy-s-grocery-games-all-star-invitational', 'guy-s-ranch-kitchen',
--     'hell-s-kitchen', 'house-of-knives', 'iron-chef', 'iron-chef-america',
--     'iron-chef-gauntlet', 'iron-chef-quest-for-an-iron-legend', 'iron-chef-showdown',
--     'knife-fight', 'last-chance-kitchen', 'masterchef', 'masterchef-junior', 'next-gen-chef',
--     'next-level-chef', 'outchef-d', 'supermarket-stakeout', 'the-great-american-recipe',
--     'the-great-food-truck-race', 'the-next-iron-chef', 'the-next-iron-chef-redemption',
--     'top-chef-amateurs', 'top-chef-duels', 'top-chef-family-style', 'top-chef-mexico',
--     'wall-of-chefs', 'wild-card-kitchen', 'worst-cooks-in-america'
--   );

DO $$
DECLARE
  affected TEXT;
  affected_count INT;
BEGIN
  CREATE TEMP TABLE shows_to_publish ON COMMIT DROP AS
  SELECT sh.id, sh.slug
  FROM shows sh
  WHERE sh.is_public IS NOT TRUE
    AND (
      (SELECT COUNT(DISTINCT cs.chef_id) FROM chef_shows cs WHERE cs.show_id = sh.id)
      + COALESCE((
          SELECT COUNT(DISTINCT cs2.chef_id)
          FROM shows child
          JOIN chef_shows cs2 ON cs2.show_id = child.id
          WHERE child.parent_show_id = sh.id
        ), 0)
    ) >= 3;

  SELECT COUNT(*), string_agg(quote_literal(slug), ', ' ORDER BY slug)
    INTO affected_count, affected
  FROM shows_to_publish;

  UPDATE shows SET is_public = true
  WHERE id IN (SELECT id FROM shows_to_publish);

  RAISE NOTICE 'Published % shows. Rollback list: %', affected_count, affected;
END $$;
