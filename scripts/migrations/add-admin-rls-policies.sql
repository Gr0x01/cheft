-- Add RLS policies for admin email allowlist
-- Run this migration to enable authenticated admin access to review_queue and data_changes tables

-- Enable RLS on tables if not already enabled
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE excluded_names ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Admin email allowlist read" ON review_queue;
DROP POLICY IF EXISTS "Admin email allowlist write" ON review_queue;
DROP POLICY IF EXISTS "Admin email allowlist read" ON data_changes;
DROP POLICY IF EXISTS "Admin email allowlist read" ON excluded_names;
DROP POLICY IF EXISTS "Admin email allowlist write" ON excluded_names;

-- review_queue: Allow read/write for admin emails only
CREATE POLICY "Admin email allowlist read" ON review_queue
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' IN ('rbaten@gmail.com', 'gr0x01@pm.me')
  );

CREATE POLICY "Admin email allowlist write" ON review_queue
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN ('rbaten@gmail.com', 'gr0x01@pm.me')
  );

-- data_changes: Allow read for admin emails only (insert via service role)
CREATE POLICY "Admin email allowlist read" ON data_changes
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' IN ('rbaten@gmail.com', 'gr0x01@pm.me')
  );

-- excluded_names: Allow read/write for admin emails only
CREATE POLICY "Admin email allowlist read" ON excluded_names
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' IN ('rbaten@gmail.com', 'gr0x01@pm.me')
  );

CREATE POLICY "Admin email allowlist write" ON excluded_names
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN ('rbaten@gmail.com', 'gr0x01@pm.me')
  );

-- Service role bypass for ingestion pipeline
-- (service role already bypasses RLS by default)
