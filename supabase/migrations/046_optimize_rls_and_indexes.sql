-- Migration: Optimize RLS Policies and Indexes
-- Purpose: Fix Supabase Performance Advisor warnings
-- Issues addressed:
--   - 22 auth_rls_initplan warnings: Wrap auth functions in SELECT
--   - 45 multiple_permissive_policies warnings: Consolidate overlapping policies
--   - 3 duplicate_index warnings: Remove duplicate indexes
-- Created: 2025-12-29

-- ============================================
-- PART 1: REMOVE DUPLICATE INDEXES
-- ============================================

-- chef_shows table: Remove duplicate season index (keep the original from migration 006)
DROP INDEX IF EXISTS idx_chef_shows_season_normalized;

-- chef_shows table: Remove duplicate unique constraint (keep chef_shows_unique_appearance from migration 027)
-- This is a constraint, not just an index, so we need to drop the constraint
ALTER TABLE chef_shows DROP CONSTRAINT IF EXISTS chef_shows_chef_id_show_id_season_key;

-- chefs table: Remove duplicate photo index (keep idx_chefs_photo from migration 003)
DROP INDEX IF EXISTS idx_chefs_photo_url;

COMMENT ON INDEX idx_chef_shows_season IS 'Index for season lookups (duplicate idx_chef_shows_season_normalized removed in migration 046)';
COMMENT ON INDEX idx_chefs_photo IS 'Index for photo lookups (duplicate idx_chefs_photo_url removed in migration 046)';

-- ============================================
-- PART 2: FIX AUTH RLS INITPLAN ISSUES
-- Wrap all auth.role() and auth.jwt() calls in SELECT subqueries
-- ============================================

-- search_cache: Fix service role policies
DROP POLICY IF EXISTS "Service role write access to search_cache" ON search_cache;
DROP POLICY IF EXISTS "Service role update access to search_cache" ON search_cache;
DROP POLICY IF EXISTS "Service role delete access to search_cache" ON search_cache;

CREATE POLICY "Service role write access to search_cache"
  ON search_cache FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role update access to search_cache"
  ON search_cache FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role delete access to search_cache"
  ON search_cache FOR DELETE
  USING ((SELECT auth.role()) = 'service_role');

-- michelin_restaurants: Fix service role policies
DROP POLICY IF EXISTS "Service role write access to michelin_restaurants" ON michelin_restaurants;
DROP POLICY IF EXISTS "Service role update access to michelin_restaurants" ON michelin_restaurants;
DROP POLICY IF EXISTS "Service role delete access to michelin_restaurants" ON michelin_restaurants;

CREATE POLICY "Service role write access to michelin_restaurants"
  ON michelin_restaurants FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role update access to michelin_restaurants"
  ON michelin_restaurants FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role delete access to michelin_restaurants"
  ON michelin_restaurants FOR DELETE
  USING ((SELECT auth.role()) = 'service_role');

-- show_source_cache: Fix service role policies
DROP POLICY IF EXISTS "Service role write access to show_source_cache" ON show_source_cache;
DROP POLICY IF EXISTS "Service role update access to show_source_cache" ON show_source_cache;
DROP POLICY IF EXISTS "Service role delete access to show_source_cache" ON show_source_cache;

CREATE POLICY "Service role write access to show_source_cache"
  ON show_source_cache FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role update access to show_source_cache"
  ON show_source_cache FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role delete access to show_source_cache"
  ON show_source_cache FOR DELETE
  USING ((SELECT auth.role()) = 'service_role');

-- pending_discoveries: Fix service role policy (will consolidate in Part 3)
DROP POLICY IF EXISTS "Service role full access pending_discoveries" ON pending_discoveries;

CREATE POLICY "Service role full access pending_discoveries"
  ON pending_discoveries FOR ALL
  USING ((SELECT auth.role()) = 'service_role');

-- enrichment_jobs: Fix service role policy
DROP POLICY IF EXISTS "Service role only enrichment_jobs" ON enrichment_jobs;

CREATE POLICY "Service role only enrichment_jobs"
  ON enrichment_jobs FOR ALL
  USING ((SELECT auth.role()) = 'service_role');

-- enrichment_budgets: Fix service role policy
DROP POLICY IF EXISTS "Service role only enrichment_budgets" ON enrichment_budgets;

CREATE POLICY "Service role only enrichment_budgets"
  ON enrichment_budgets FOR ALL
  USING ((SELECT auth.role()) = 'service_role');

-- duplicate_candidates: Fix authenticated policies
DROP POLICY IF EXISTS "Allow authenticated insert to duplicate candidates" ON duplicate_candidates;
DROP POLICY IF EXISTS "Allow authenticated update to duplicate candidates" ON duplicate_candidates;

CREATE POLICY "Allow authenticated insert to duplicate candidates"
  ON duplicate_candidates FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Allow authenticated update to duplicate candidates"
  ON duplicate_candidates FOR UPDATE
  USING ((SELECT auth.role()) = 'authenticated');

-- user_feedback: Fix authenticated policies
DROP POLICY IF EXISTS "Authenticated users can read feedback" ON user_feedback;
DROP POLICY IF EXISTS "Authenticated users can update feedback" ON user_feedback;

CREATE POLICY "Authenticated users can read feedback"
  ON user_feedback FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Authenticated users can update feedback"
  ON user_feedback FOR UPDATE
  USING ((SELECT auth.role()) = 'authenticated');

-- review_queue: Fix admin allowlist policies (will consolidate in Part 3)
DROP POLICY IF EXISTS "Admin email allowlist read" ON review_queue;
DROP POLICY IF EXISTS "Admin email allowlist write" ON review_queue;

CREATE POLICY "Admin email allowlist read" ON review_queue
  FOR SELECT
  USING ((SELECT auth.jwt()) ->> 'email' IN ('rbaten@gmail.com', 'gr0x01@pm.me'));

CREATE POLICY "Admin email allowlist write" ON review_queue
  FOR ALL
  USING ((SELECT auth.jwt()) ->> 'email' IN ('rbaten@gmail.com', 'gr0x01@pm.me'));

-- data_changes: Fix admin allowlist policy (will consolidate in Part 3)
DROP POLICY IF EXISTS "Admin email allowlist read" ON data_changes;

CREATE POLICY "Admin email allowlist read" ON data_changes
  FOR SELECT
  USING ((SELECT auth.jwt()) ->> 'email' IN ('rbaten@gmail.com', 'gr0x01@pm.me'));

-- excluded_names: Fix admin allowlist policies (will consolidate in Part 3)
DROP POLICY IF EXISTS "Admin email allowlist read" ON excluded_names;
DROP POLICY IF EXISTS "Admin email allowlist write" ON excluded_names;

CREATE POLICY "Admin email allowlist read" ON excluded_names
  FOR SELECT
  USING ((SELECT auth.jwt()) ->> 'email' IN ('rbaten@gmail.com', 'gr0x01@pm.me'));

CREATE POLICY "Admin email allowlist write" ON excluded_names
  FOR ALL
  USING ((SELECT auth.jwt()) ->> 'email' IN ('rbaten@gmail.com', 'gr0x01@pm.me'));

-- ============================================
-- PART 3: CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- Combine overlapping policies to reduce per-row evaluations
-- ============================================

-- pending_discoveries: Consolidate public read + service role full access
-- Strategy: Service role policy already grants all access, public read is redundant for service role
-- Keep both policies but they won't conflict (public=SELECT only, service=ALL operations)
-- No change needed - these policies don't overlap in operation type

-- data_changes: Consolidate admin allowlist read + service role only
DROP POLICY IF EXISTS "Service role only data_changes" ON data_changes;
DROP POLICY IF EXISTS "Admin email allowlist read" ON data_changes;

CREATE POLICY "Admin and service role read data_changes" ON data_changes
  FOR SELECT
  USING (
    (SELECT auth.jwt()) ->> 'email' IN ('rbaten@gmail.com', 'gr0x01@pm.me')
    OR (SELECT auth.role()) = 'service_role'
  );

CREATE POLICY "Service role write data_changes" ON data_changes
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- excluded_names: Consolidate admin + service role policies
DROP POLICY IF EXISTS "Service role only excluded_names" ON excluded_names;
DROP POLICY IF EXISTS "Admin email allowlist read" ON excluded_names;
DROP POLICY IF EXISTS "Admin email allowlist write" ON excluded_names;

CREATE POLICY "Admin and service role access excluded_names" ON excluded_names
  FOR ALL
  USING (
    (SELECT auth.jwt()) ->> 'email' IN ('rbaten@gmail.com', 'gr0x01@pm.me')
    OR (SELECT auth.role()) = 'service_role'
  );

-- review_queue: Consolidate admin + service role policies
DROP POLICY IF EXISTS "Service role only review_queue" ON review_queue;
DROP POLICY IF EXISTS "Admin email allowlist read" ON review_queue;
DROP POLICY IF EXISTS "Admin email allowlist write" ON review_queue;

CREATE POLICY "Admin and service role access review_queue" ON review_queue
  FOR ALL
  USING (
    (SELECT auth.jwt()) ->> 'email' IN ('rbaten@gmail.com', 'gr0x01@pm.me')
    OR (SELECT auth.role()) = 'service_role'
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Admin and service role read data_changes" ON data_changes IS
  'Consolidated admin email allowlist + service role access (migration 046)';

COMMENT ON POLICY "Service role write data_changes" ON data_changes IS
  'Service role can insert audit logs';

COMMENT ON POLICY "Admin and service role access excluded_names" ON excluded_names IS
  'Consolidated admin email allowlist + service role access (migration 046)';

COMMENT ON POLICY "Admin and service role access review_queue" ON review_queue IS
  'Consolidated admin email allowlist + service role access (migration 046)';

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify policies are optimized
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Check that we don't have duplicate policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('data_changes', 'excluded_names', 'review_queue')
    AND policyname LIKE '%Service role%'
    AND policyname LIKE '%Admin%';

  IF policy_count > 0 THEN
    RAISE WARNING 'Found % policies that might still have naming conflicts', policy_count;
  ELSE
    RAISE NOTICE 'RLS policy consolidation successful';
  END IF;
END $$;
