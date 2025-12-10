-- Migration: Security Hardening
-- Purpose: Fix Supabase security advisor warnings
-- Issues addressed:
--   - 3 tables missing RLS (ERROR level)
--   - 27 functions with mutable search_path (WARN level)
-- Created: 2025-12-10

-- ============================================
-- PART 1: ENABLE RLS ON CACHE TABLES
-- ============================================

-- search_cache: Tavily search results cache
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to search_cache"
  ON search_cache FOR SELECT
  USING (true);

CREATE POLICY "Service role write access to search_cache"
  ON search_cache FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update access to search_cache"
  ON search_cache FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role delete access to search_cache"
  ON search_cache FOR DELETE
  USING (auth.role() = 'service_role');

-- michelin_restaurants: Reference data from Wikipedia
ALTER TABLE michelin_restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to michelin_restaurants"
  ON michelin_restaurants FOR SELECT
  USING (true);

CREATE POLICY "Service role write access to michelin_restaurants"
  ON michelin_restaurants FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update access to michelin_restaurants"
  ON michelin_restaurants FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role delete access to michelin_restaurants"
  ON michelin_restaurants FOR DELETE
  USING (auth.role() = 'service_role');

-- show_source_cache: Wikipedia show data cache
ALTER TABLE show_source_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to show_source_cache"
  ON show_source_cache FOR SELECT
  USING (true);

CREATE POLICY "Service role write access to show_source_cache"
  ON show_source_cache FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update access to show_source_cache"
  ON show_source_cache FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role delete access to show_source_cache"
  ON show_source_cache FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- PART 2: FIX MUTABLE SEARCH_PATH ON FUNCTIONS
-- All functions recreated with SET search_path = public
-- ============================================

-- 1. update_updated_at_column (trigger function)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 2. update_duplicate_candidates_updated_at (trigger function)
CREATE OR REPLACE FUNCTION update_duplicate_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 3. increment_budget_spend
CREATE OR REPLACE FUNCTION increment_budget_spend(
  p_month DATE,
  p_amount NUMERIC,
  p_is_manual BOOLEAN DEFAULT FALSE,
  p_success BOOLEAN DEFAULT TRUE
) RETURNS void AS $$
BEGIN
  INSERT INTO enrichment_budgets (
    month, 
    spent_usd, 
    manual_spent_usd, 
    jobs_completed,
    jobs_failed
  )
  VALUES (
    DATE_TRUNC('month', p_month)::DATE,
    CASE WHEN p_is_manual THEN 0 ELSE p_amount END,
    CASE WHEN p_is_manual THEN p_amount ELSE 0 END,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN p_success THEN 0 ELSE 1 END
  )
  ON CONFLICT (month) DO UPDATE SET
    spent_usd = enrichment_budgets.spent_usd + CASE WHEN p_is_manual THEN 0 ELSE p_amount END,
    manual_spent_usd = enrichment_budgets.manual_spent_usd + CASE WHEN p_is_manual THEN p_amount ELSE 0 END,
    jobs_completed = enrichment_budgets.jobs_completed + CASE WHEN p_success THEN 1 ELSE 0 END,
    jobs_failed = enrichment_budgets.jobs_failed + CASE WHEN p_success THEN 0 ELSE 1 END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 4. normalize_season
CREATE OR REPLACE FUNCTION normalize_season(season_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF season_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF season_text ~ '^Season\s+\d+,' THEN
    season_text := REGEXP_REPLACE(season_text, '^Season\s+(\d+),.*', '\1', 'i');
    RETURN TRIM(season_text);
  END IF;
  
  season_text := TRIM(REGEXP_REPLACE(season_text, '^Season\s+', '', 'i'));
  season_text := TRIM(REGEXP_REPLACE(season_text, '^Episode\s+', '', 'i'));
  
  IF season_text ~ '^\d+\s*\(\d{4}\)' THEN
    season_text := REGEXP_REPLACE(season_text, '^(\d+)\s*\(.*\)', '\1');
  END IF;
  
  IF season_text ~ '^\d+,.*' THEN
    season_text := REGEXP_REPLACE(season_text, '^(\d+),.*', '\1');
  END IF;
  
  IF season_text ~ '^[A-Za-z]+\s+\d+,\s*\d{4}' THEN
    season_text := REGEXP_REPLACE(season_text, '^.*,\s*(\d{4}).*', '\1');
  END IF;
  
  IF season_text ~ '^various\s*\(.*\)' THEN
    season_text := REGEXP_REPLACE(season_text, '^various\s*\((\d{4}).*\).*', '\1');
  END IF;
  
  IF season_text ~ '^\d{4},\s*\d{4}' THEN
    season_text := REGEXP_REPLACE(season_text, '^(\d{4}),.*', '\1');
  END IF;
  
  IF season_text ~ '".*"\s*\(\d{4}\)' THEN
    season_text := REGEXP_REPLACE(season_text, '.*\((\d{4})\).*', '\1');
  END IF;
  
  IF season_text ~ '\(\d{4}\)' THEN
    season_text := REGEXP_REPLACE(season_text, '.*\((\d{4})\).*', '\1');
  END IF;
  
  RETURN TRIM(season_text);
END;
$$;

-- 5. sync_state_counts
CREATE OR REPLACE FUNCTION sync_state_counts()
RETURNS void AS $$
BEGIN
  UPDATE states s
  SET 
    restaurant_count = COALESCE(counts.restaurant_count, 0),
    chef_count = COALESCE(counts.chef_count, 0),
    city_count = COALESCE(counts.city_count, 0),
    updated_at = NOW()
  FROM (
    SELECT 
      st.id as state_id,
      COUNT(DISTINCT r.id) as restaurant_count,
      COUNT(DISTINCT r.chef_id) as chef_count,
      COUNT(DISTINCT r.city) as city_count
    FROM states st
    LEFT JOIN restaurants r ON r.state IS NOT NULL AND (
      r.state = st.name 
      OR r.state = st.abbreviation
      OR (st.abbreviation = 'DC' AND r.state IN ('DC', 'D.C.', 'Washington, D.C.', 'District of Columbia'))
    ) AND r.is_public = true
    GROUP BY st.id
  ) counts
  WHERE s.id = counts.state_id;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 6. trigger_sync_state_counts
CREATE OR REPLACE FUNCTION trigger_sync_state_counts()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM sync_state_counts();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 7. sync_country_counts
CREATE OR REPLACE FUNCTION sync_country_counts()
RETURNS void AS $$
BEGIN
  UPDATE countries c
  SET 
    restaurant_count = COALESCE(counts.restaurant_count, 0),
    chef_count = COALESCE(counts.chef_count, 0),
    city_count = COALESCE(counts.city_count, 0),
    updated_at = NOW()
  FROM (
    SELECT 
      co.id as country_id,
      COUNT(DISTINCT r.id) as restaurant_count,
      COUNT(DISTINCT r.chef_id) as chef_count,
      COUNT(DISTINCT r.city) as city_count
    FROM countries co
    LEFT JOIN restaurants r ON r.country IS NOT NULL AND (
      r.country = co.name 
      OR r.country = co.code
    ) AND r.is_public = true
    GROUP BY co.id
  ) counts
  WHERE c.id = counts.country_id;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 8. trigger_sync_country_counts
CREATE OR REPLACE FUNCTION trigger_sync_country_counts()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM sync_country_counts();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 9. sync_all_michelin_stars
CREATE OR REPLACE FUNCTION sync_all_michelin_stars()
RETURNS TABLE(restaurant_name TEXT, michelin_name TEXT, city TEXT, stars INTEGER) AS $$
BEGIN
  RETURN QUERY
  UPDATE restaurants r
  SET michelin_stars = m.stars, updated_at = NOW()
  FROM michelin_restaurants m
  WHERE r.michelin_stars IS DISTINCT FROM m.stars
    AND LOWER(TRIM(r.name)) = LOWER(TRIM(m.name))
    AND (
      LOWER(TRIM(r.city)) = LOWER(TRIM(m.city))
      OR LOWER(TRIM(r.city)) LIKE '%' || LOWER(TRIM(m.city)) || '%'
      OR LOWER(TRIM(m.city)) LIKE '%' || LOWER(TRIM(r.city)) || '%'
      OR (m.state IS NOT NULL AND r.state IS NOT NULL AND (
        LOWER(TRIM(r.state)) = LOWER(TRIM(m.state))
        OR (LOWER(r.state) = 'ny' AND LOWER(m.state) = 'new york')
        OR (LOWER(r.state) = 'ca' AND LOWER(m.state) = 'california')
        OR (LOWER(r.state) = 'il' AND LOWER(m.state) = 'illinois')
        OR (LOWER(r.state) = 'fl' AND LOWER(m.state) = 'florida')
        OR (LOWER(r.state) = 'tx' AND LOWER(m.state) = 'texas')
        OR (LOWER(r.state) = 'co' AND LOWER(m.state) = 'colorado')
        OR (LOWER(r.state) = 'ga' AND LOWER(m.state) = 'georgia')
        OR (LOWER(r.state) = 'dc' AND LOWER(m.state) = 'district of columbia')
      ))
    )
  RETURNING r.name, m.name, r.city, m.stars;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 10. sync_michelin_to_restaurants (trigger function)
CREATE OR REPLACE FUNCTION sync_michelin_to_restaurants()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE restaurants r
  SET michelin_stars = NEW.stars, updated_at = NOW()
  WHERE LOWER(TRIM(r.name)) = LOWER(TRIM(NEW.name))
    AND r.michelin_stars IS DISTINCT FROM NEW.stars
    AND (
      LOWER(TRIM(r.city)) = LOWER(TRIM(NEW.city))
      OR LOWER(TRIM(r.city)) LIKE '%' || LOWER(TRIM(NEW.city)) || '%'
      OR LOWER(TRIM(NEW.city)) LIKE '%' || LOWER(TRIM(r.city)) || '%'
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 11. get_feedback_summary
CREATE OR REPLACE FUNCTION get_feedback_summary()
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  issue_type TEXT,
  count BIGINT,
  latest_message TEXT,
  latest_created_at TIMESTAMPTZ,
  pending_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH feedback_agg AS (
    SELECT 
      uf.entity_type,
      uf.entity_id,
      uf.issue_type,
      COUNT(*) as count,
      MAX(uf.message) as latest_message,
      MAX(uf.created_at) as latest_created_at,
      COUNT(*) FILTER (WHERE uf.status = 'pending') as pending_count
    FROM user_feedback uf
    WHERE uf.status = 'pending'
    GROUP BY uf.entity_type, uf.entity_id, uf.issue_type
  )
  SELECT 
    fa.entity_type,
    fa.entity_id,
    CASE 
      WHEN fa.entity_type = 'chef' THEN c.name
      WHEN fa.entity_type = 'restaurant' THEN r.name
    END as entity_name,
    fa.issue_type,
    fa.count,
    fa.latest_message,
    fa.latest_created_at,
    fa.pending_count
  FROM feedback_agg fa
  LEFT JOIN chefs c ON fa.entity_type = 'chef' AND fa.entity_id = c.id
  LEFT JOIN restaurants r ON fa.entity_type = 'restaurant' AND fa.entity_id = r.id
  ORDER BY fa.pending_count DESC, fa.latest_created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 12. resolve_feedback
CREATE OR REPLACE FUNCTION resolve_feedback(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_issue_type TEXT,
  p_reviewed_by TEXT
) RETURNS void AS $$
BEGIN
  IF p_entity_type NOT IN ('chef', 'restaurant') THEN
    RAISE EXCEPTION 'Invalid entity_type: %', p_entity_type;
  END IF;

  IF p_issue_type NOT IN ('closed', 'incorrect_info', 'wrong_photo', 'other') THEN
    RAISE EXCEPTION 'Invalid issue_type: %', p_issue_type;
  END IF;

  UPDATE user_feedback 
  SET 
    status = 'resolved',
    reviewed_by = p_reviewed_by,
    reviewed_at = COALESCE(reviewed_at, now()),
    resolved_at = now(),
    updated_at = now()
  WHERE 
    entity_type = p_entity_type 
    AND entity_id = p_entity_id 
    AND issue_type = p_issue_type
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 13. merge_duplicate_chefs
CREATE OR REPLACE FUNCTION merge_duplicate_chefs(
  p_keeper_id UUID,
  p_loser_id UUID,
  p_merged_name TEXT,
  p_merged_slug TEXT,
  p_merged_bio TEXT,
  p_merged_photo_url TEXT,
  p_merged_instagram TEXT,
  p_merged_james_beard TEXT,
  p_chef_shows JSONB
) RETURNS JSONB AS $$
DECLARE
  v_restaurants_transferred INT;
  v_shows_inserted INT;
  v_result JSONB;
BEGIN
  IF p_keeper_id IS NULL OR p_loser_id IS NULL THEN
    RAISE EXCEPTION 'keeper_id and loser_id cannot be null';
  END IF;

  IF p_keeper_id = p_loser_id THEN
    RAISE EXCEPTION 'keeper_id and loser_id cannot be the same';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM chefs WHERE id = p_keeper_id) THEN
    RAISE EXCEPTION 'Keeper chef % does not exist', p_keeper_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM chefs WHERE id = p_loser_id) THEN
    RAISE EXCEPTION 'Loser chef % does not exist', p_loser_id;
  END IF;

  UPDATE chefs SET
    name = p_merged_name,
    slug = p_merged_slug,
    mini_bio = p_merged_bio,
    photo_url = p_merged_photo_url,
    instagram_handle = p_merged_instagram,
    james_beard_status = p_merged_james_beard,
    updated_at = NOW()
  WHERE id = p_keeper_id;

  UPDATE restaurants
  SET chef_id = p_keeper_id, updated_at = NOW()
  WHERE chef_id = p_loser_id;

  GET DIAGNOSTICS v_restaurants_transferred = ROW_COUNT;

  DELETE FROM chef_shows WHERE chef_id = p_keeper_id;

  INSERT INTO chef_shows (chef_id, show_id, season, season_name, result, is_primary)
  SELECT 
    p_keeper_id,
    s.id,
    (show->>'season')::TEXT,
    (show->>'show_name')::TEXT || COALESCE(' ' || (show->>'season')::TEXT, ''),
    (show->>'result')::TEXT,
    (show->>'is_primary')::BOOLEAN
  FROM jsonb_array_elements(p_chef_shows) AS show
  JOIN shows s ON LOWER(s.name) = LOWER(show->>'show_name')
  ON CONFLICT (chef_id, show_id, season) DO NOTHING;

  GET DIAGNOSTICS v_shows_inserted = ROW_COUNT;

  DELETE FROM chefs WHERE id = p_loser_id;

  v_result := jsonb_build_object(
    'success', true,
    'keeper_id', p_keeper_id,
    'loser_id', p_loser_id,
    'restaurants_transferred', v_restaurants_transferred,
    'shows_inserted', v_shows_inserted,
    'timestamp', NOW()
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Chef merge failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 14. get_shows_with_counts
CREATE OR REPLACE FUNCTION get_shows_with_counts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  network TEXT,
  created_at TIMESTAMPTZ,
  show_type TEXT,
  chef_count BIGINT,
  restaurant_count BIGINT,
  child_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.slug,
    s.network,
    s.created_at,
    s.show_type,
    COALESCE(counts.chef_count, 0) as chef_count,
    COALESCE(counts.restaurant_count, 0) as restaurant_count,
    COALESCE(child_stats.child_count, 0) as child_count
  FROM shows s
  LEFT JOIN (
    SELECT 
      parent.id as show_id,
      COUNT(DISTINCT cs.chef_id) as chef_count,
      COUNT(DISTINCT r.id) as restaurant_count
    FROM shows parent
    LEFT JOIN shows child ON child.parent_show_id = parent.id
    LEFT JOIN chef_shows cs ON cs.show_id = parent.id OR cs.show_id = child.id
    LEFT JOIN restaurants r ON cs.chef_id = r.chef_id AND r.is_public = true
    GROUP BY parent.id
  ) counts ON s.id = counts.show_id
  LEFT JOIN (
    SELECT parent_show_id, COUNT(*) as child_count
    FROM shows
    WHERE parent_show_id IS NOT NULL
    GROUP BY parent_show_id
  ) child_stats ON s.id = child_stats.parent_show_id
  WHERE s.is_public = true 
    AND s.parent_show_id IS NULL
    AND COALESCE(counts.chef_count, 0) > 0
  ORDER BY s.name;
END;
$$;

-- 15. get_show_with_chef_counts
CREATE OR REPLACE FUNCTION get_show_with_chef_counts(p_show_slug TEXT)
RETURNS TABLE (
  show_id UUID,
  show_name TEXT,
  show_slug TEXT,
  show_network TEXT,
  show_created_at TIMESTAMPTZ,
  show_type TEXT,
  parent_show_id UUID,
  parent_show_slug TEXT,
  parent_show_name TEXT,
  is_public BOOLEAN,
  chef_show_id UUID,
  chef_id UUID,
  chef_name TEXT,
  chef_slug TEXT,
  chef_photo_url TEXT,
  chef_mini_bio TEXT,
  season TEXT,
  season_name TEXT,
  result TEXT,
  is_primary BOOLEAN,
  performance_blurb TEXT,
  restaurant_count BIGINT,
  source_show_slug TEXT,
  source_show_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH target_show AS (
    SELECT * FROM shows WHERE slug = p_show_slug
  ),
  all_related_shows AS (
    SELECT ts.id, ts.slug, ts.name FROM target_show ts
    UNION ALL
    SELECT child.id, child.slug, child.name 
    FROM shows child, target_show ts 
    WHERE child.parent_show_id = ts.id AND child.is_public = true
  )
  SELECT 
    ts.id as show_id,
    ts.name as show_name,
    ts.slug as show_slug,
    ts.network as show_network,
    ts.created_at as show_created_at,
    ts.show_type,
    ts.parent_show_id,
    parent.slug as parent_show_slug,
    parent.name as parent_show_name,
    ts.is_public,
    cs.id as chef_show_id,
    c.id as chef_id,
    c.name as chef_name,
    c.slug as chef_slug,
    c.photo_url as chef_photo_url,
    c.mini_bio as chef_mini_bio,
    cs.season,
    cs.season_name,
    cs.result,
    cs.is_primary,
    cs.performance_blurb,
    COALESCE(rc.restaurant_count, 0) as restaurant_count,
    ars.slug as source_show_slug,
    ars.name as source_show_name
  FROM target_show ts
  LEFT JOIN shows parent ON ts.parent_show_id = parent.id
  CROSS JOIN all_related_shows ars
  JOIN chef_shows cs ON ars.id = cs.show_id
  JOIN chefs c ON cs.chef_id = c.id
  LEFT JOIN (
    SELECT 
      chef_id,
      COUNT(*) as restaurant_count
    FROM restaurants
    WHERE is_public = true
    GROUP BY chef_id
  ) rc ON c.id = rc.chef_id
  ORDER BY 
    CASE cs.result
      WHEN 'winner' THEN 1
      WHEN 'finalist' THEN 2
      WHEN 'judge' THEN 3
      WHEN 'contestant' THEN 4
      ELSE 5
    END,
    cs.season,
    c.name;
END;
$$;

-- 16. get_show_family
CREATE OR REPLACE FUNCTION get_show_family(p_show_id UUID)
RETURNS TABLE (
  relationship TEXT,
  show_id UUID,
  show_name TEXT,
  show_slug TEXT,
  show_type TEXT,
  is_public BOOLEAN,
  chef_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT parent_show_id INTO v_parent_id FROM shows WHERE id = p_show_id;

  RETURN QUERY
  SELECT 
    'self'::TEXT as relationship,
    s.id,
    s.name,
    s.slug,
    s.show_type,
    s.is_public,
    COALESCE(cc.cnt, 0) as chef_count
  FROM shows s
  LEFT JOIN (SELECT show_id, COUNT(DISTINCT chef_id) as cnt FROM chef_shows GROUP BY show_id) cc ON s.id = cc.show_id
  WHERE s.id = p_show_id
  
  UNION ALL
  
  SELECT 
    'parent'::TEXT,
    s.id,
    s.name,
    s.slug,
    s.show_type,
    s.is_public,
    COALESCE(cc.cnt, 0)
  FROM shows s
  LEFT JOIN (SELECT show_id, COUNT(DISTINCT chef_id) as cnt FROM chef_shows GROUP BY show_id) cc ON s.id = cc.show_id
  WHERE s.id = v_parent_id
  
  UNION ALL
  
  SELECT 
    'sibling'::TEXT,
    s.id,
    s.name,
    s.slug,
    s.show_type,
    s.is_public,
    COALESCE(cc.cnt, 0)
  FROM shows s
  LEFT JOIN (SELECT show_id, COUNT(DISTINCT chef_id) as cnt FROM chef_shows GROUP BY show_id) cc ON s.id = cc.show_id
  WHERE v_parent_id IS NOT NULL 
    AND s.parent_show_id = v_parent_id 
    AND s.id != p_show_id
    AND s.is_public = true
  
  UNION ALL
  
  SELECT 
    'child'::TEXT,
    s.id,
    s.name,
    s.slug,
    s.show_type,
    s.is_public,
    COALESCE(cc.cnt, 0)
  FROM shows s
  LEFT JOIN (SELECT show_id, COUNT(DISTINCT chef_id) as cnt FROM chef_shows GROUP BY show_id) cc ON s.id = cc.show_id
  WHERE s.parent_show_id = p_show_id
    AND s.is_public = true
  
  ORDER BY relationship, show_name;
END;
$$;

-- 17. get_show_children
CREATE OR REPLACE FUNCTION get_show_children(p_parent_slug TEXT)
RETURNS TABLE (
  child_show_id UUID,
  child_show_name TEXT,
  child_show_slug TEXT,
  child_show_type TEXT,
  child_chef_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.slug,
    s.show_type,
    COALESCE(cc.cnt, 0) as chef_count
  FROM shows s
  JOIN shows parent ON s.parent_show_id = parent.id
  LEFT JOIN (SELECT cs.show_id as sid, COUNT(DISTINCT cs.chef_id) as cnt FROM chef_shows cs GROUP BY cs.show_id) cc ON s.id = cc.sid
  WHERE parent.slug = p_parent_slug
    AND s.is_public = true
  ORDER BY s.name;
END;
$$;

-- 18. get_show_seasons
CREATE OR REPLACE FUNCTION get_show_seasons(p_show_slug TEXT)
RETURNS TABLE (
  season TEXT,
  season_name TEXT,
  chef_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.season,
    MAX(cs.season_name) as season_name,
    COUNT(DISTINCT cs.chef_id) as chef_count
  FROM chef_shows cs
  JOIN shows s ON cs.show_id = s.id
  WHERE s.slug = p_show_slug
    AND cs.season IS NOT NULL
  GROUP BY cs.season
  ORDER BY cs.season;
END;
$$;

-- 19. get_show_season_data
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
  performance_blurb TEXT,
  restaurant_id UUID,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  restaurant_city TEXT,
  restaurant_state TEXT,
  restaurant_status TEXT,
  restaurant_photo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    cs.performance_blurb,
    r.id as restaurant_id,
    r.name as restaurant_name,
    r.slug as restaurant_slug,
    r.city as restaurant_city,
    r.state as restaurant_state,
    r.status as restaurant_status,
    r.photo_url as restaurant_photo_url
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

-- 20. get_all_show_seasons_for_sitemap
CREATE OR REPLACE FUNCTION get_all_show_seasons_for_sitemap()
RETURNS TABLE (
  show_slug TEXT,
  season TEXT,
  show_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    s.slug as show_slug,
    cs.season,
    s.created_at as show_created_at
  FROM chef_shows cs
  JOIN shows s ON cs.show_id = s.id
  WHERE cs.season IS NOT NULL
  ORDER BY s.slug, cs.season;
END;
$$;

-- 21. get_featured_chefs_with_counts
CREATE OR REPLACE FUNCTION get_featured_chefs_with_counts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  photo_url TEXT,
  mini_bio TEXT,
  james_beard_status TEXT,
  chef_shows JSONB,
  restaurant_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH chef_restaurant_counts AS (
    SELECT 
      r.chef_id,
      COUNT(*) as count
    FROM restaurants r
    WHERE r.is_public = true
    GROUP BY r.chef_id
    HAVING COUNT(*) >= 2
  )
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.photo_url,
    c.mini_bio,
    c.james_beard_status::TEXT,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', cs.id,
            'season', cs.season,
            'result', cs.result,
            'is_primary', cs.is_primary,
            'show', jsonb_build_object('id', s.id, 'name', s.name, 'slug', s.slug)
          )
        )
        FROM chef_shows cs
        LEFT JOIN shows s ON s.id = cs.show_id
        WHERE cs.chef_id = c.id
      ),
      '[]'::jsonb
    ) as chef_shows,
    crc.count as restaurant_count
  FROM chefs c
  INNER JOIN chef_restaurant_counts crc ON crc.chef_id = c.id
  WHERE c.photo_url IS NOT NULL
  LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = public;

-- 22. get_restaurant_map_pins
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
$$ LANGUAGE plpgsql STABLE
SET search_path = public;

-- ============================================
-- PART 3: FIX ENRICHMENT JOB FUNCTIONS
-- These may have been created outside migrations
-- ============================================

-- 23. claim_enrichment_jobs (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'claim_enrichment_jobs') THEN
    EXECUTE $func$
    CREATE OR REPLACE FUNCTION claim_enrichment_jobs(
      p_worker_id TEXT,
      p_batch_size INTEGER DEFAULT 5,
      p_lock_duration INTERVAL DEFAULT '5 minutes'
    ) RETURNS SETOF enrichment_jobs AS $inner$
    BEGIN
      RETURN QUERY
      UPDATE enrichment_jobs
      SET 
        locked_by = p_worker_id,
        locked_until = NOW() + p_lock_duration,
        status = 'processing',
        started_at = COALESCE(started_at, NOW())
      WHERE id IN (
        SELECT id FROM enrichment_jobs
        WHERE status = 'queued'
          AND (locked_until IS NULL OR locked_until < NOW())
        ORDER BY priority_score DESC, created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    END;
    $inner$ LANGUAGE plpgsql SET search_path = public;
    $func$;
  END IF;
END $$;

-- 24. complete_enrichment_job (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'complete_enrichment_job') THEN
    EXECUTE $func$
    CREATE OR REPLACE FUNCTION complete_enrichment_job(
      p_job_id UUID,
      p_tokens_used JSONB DEFAULT NULL,
      p_cost_usd NUMERIC DEFAULT NULL
    ) RETURNS void AS $inner$
    BEGIN
      UPDATE enrichment_jobs
      SET 
        status = 'completed',
        completed_at = NOW(),
        locked_by = NULL,
        locked_until = NULL,
        tokens_used = COALESCE(p_tokens_used, tokens_used),
        cost_usd = COALESCE(p_cost_usd, cost_usd)
      WHERE id = p_job_id;
    END;
    $inner$ LANGUAGE plpgsql SET search_path = public;
    $func$;
  END IF;
END $$;

-- 25. fail_enrichment_job (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fail_enrichment_job') THEN
    EXECUTE $func$
    CREATE OR REPLACE FUNCTION fail_enrichment_job(
      p_job_id UUID,
      p_error_message TEXT
    ) RETURNS void AS $inner$
    BEGIN
      UPDATE enrichment_jobs
      SET 
        status = 'failed',
        error_message = LEFT(p_error_message, 500),
        completed_at = NOW(),
        locked_by = NULL,
        locked_until = NULL,
        retry_count = retry_count + 1,
        last_retry_at = NOW()
      WHERE id = p_job_id;
    END;
    $inner$ LANGUAGE plpgsql SET search_path = public;
    $func$;
  END IF;
END $$;

-- 26. release_stale_enrichment_locks (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'release_stale_enrichment_locks') THEN
    EXECUTE $func$
    CREATE OR REPLACE FUNCTION release_stale_enrichment_locks()
    RETURNS INTEGER AS $inner$
    DECLARE
      released_count INTEGER;
    BEGIN
      UPDATE enrichment_jobs
      SET 
        status = 'queued',
        locked_by = NULL,
        locked_until = NULL
      WHERE status = 'processing'
        AND locked_until < NOW();
      
      GET DIAGNOSTICS released_count = ROW_COUNT;
      RETURN released_count;
    END;
    $inner$ LANGUAGE plpgsql SET search_path = public;
    $func$;
  END IF;
END $$;

-- 27. get_enrichment_queue_stats (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_enrichment_queue_stats') THEN
    EXECUTE $func$
    CREATE OR REPLACE FUNCTION get_enrichment_queue_stats()
    RETURNS TABLE (
      status TEXT,
      count BIGINT,
      oldest_created_at TIMESTAMPTZ,
      newest_created_at TIMESTAMPTZ
    ) AS $inner$
    BEGIN
      RETURN QUERY
      SELECT 
        ej.status,
        COUNT(*),
        MIN(ej.created_at),
        MAX(ej.created_at)
      FROM enrichment_jobs ej
      GROUP BY ej.status;
    END;
    $inner$ LANGUAGE plpgsql SET search_path = public;
    $func$;
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to auto-update updated_at timestamp. SET search_path = public for security.';
COMMENT ON FUNCTION get_featured_chefs_with_counts() IS 'Returns chefs with photos and 2+ public restaurants. SET search_path = public for security.';
COMMENT ON FUNCTION get_restaurant_map_pins() IS 'Returns lightweight restaurant data for map markers. SET search_path = public for security.';
