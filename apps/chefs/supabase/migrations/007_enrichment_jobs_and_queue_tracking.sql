-- Migration: enrichment_jobs_and_queue_tracking
-- Adds enrichment job tracking table and processed_at field to review_queue

-- ============================================
-- ENRICHMENT JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID REFERENCES chefs(id) ON DELETE CASCADE,
  queue_item_id UUID REFERENCES review_queue(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error_message TEXT CHECK (length(error_message) <= 500),
  locked_until TIMESTAMPTZ,
  locked_by TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status ON enrichment_jobs(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_chef_id ON enrichment_jobs(chef_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_created ON enrichment_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_queue_item ON enrichment_jobs(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_locked ON enrichment_jobs(locked_until) 
  WHERE locked_until IS NOT NULL AND locked_until > now();
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_unlocked ON enrichment_jobs(status, locked_until) 
  WHERE status = 'queued' AND (locked_until IS NULL OR locked_until <= now());

-- ============================================
-- REVIEW QUEUE TRACKING
-- ============================================
ALTER TABLE review_queue ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_review_queue_processed ON review_queue(processed_at);
CREATE INDEX IF NOT EXISTS idx_review_queue_unprocessed ON review_queue(status, processed_at) 
  WHERE status = 'approved' AND processed_at IS NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE enrichment_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only enrichment_jobs" ON enrichment_jobs FOR ALL 
  USING (auth.role() = 'service_role');
