-- Migration: add_cities_rls
-- Add RLS policies for cities table and admin tables

-- ============================================
-- ENABLE RLS ON CITIES TABLE
-- ============================================
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR CITIES (PUBLIC ACCESS)
-- ============================================
CREATE POLICY "Public read cities" ON cities FOR SELECT USING (true);

-- ============================================
-- RLS POLICIES FOR ADMIN TABLES
-- ============================================
-- Note: Service role key bypasses RLS, so these policies protect anon key access
-- Admin tables should only be accessed via API routes with service role key

-- Review Queue: No public access
CREATE POLICY "Service role only review_queue" ON review_queue FOR ALL 
USING (false);

-- Data Changes: No public access
CREATE POLICY "Service role only data_changes" ON data_changes FOR ALL 
USING (false);

-- Excluded Names: No public access
CREATE POLICY "Service role only excluded_names" ON excluded_names FOR ALL 
USING (false);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON POLICY "Public read cities" ON cities IS 'Allow public read access to all cities';
COMMENT ON POLICY "Service role only review_queue" ON review_queue IS 'Block anon access - use service role key in API routes';
COMMENT ON POLICY "Service role only data_changes" ON data_changes IS 'Block anon access - use service role key in API routes';
COMMENT ON POLICY "Service role only excluded_names" ON excluded_names IS 'Block anon access - use service role key in API routes';
