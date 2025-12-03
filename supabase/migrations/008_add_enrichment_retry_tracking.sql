-- Migration: Add retry tracking to enrichment_jobs
-- Adds retry logic support for failed enrichment jobs with exponential backoff

-- Add retry tracking fields
ALTER TABLE enrichment_jobs 
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;

-- Add constraint for reasonable retry limits
ALTER TABLE enrichment_jobs 
  ADD CONSTRAINT enrichment_jobs_retry_count_check 
  CHECK (retry_count >= 0 AND retry_count <= 10);

-- Add index for efficient retry queries
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_retry 
  ON enrichment_jobs(status, retry_count, last_retry_at) 
  WHERE status = 'failed' AND retry_count < 3;

-- Update comments
COMMENT ON COLUMN enrichment_jobs.retry_count IS 'Number of retry attempts (max 3 for auto-retry)';
COMMENT ON COLUMN enrichment_jobs.last_retry_at IS 'Timestamp of last retry attempt';
COMMENT ON TABLE enrichment_jobs IS 'Tracks LLM enrichment jobs with automatic retry on transient failures (max 3 retries with exponential backoff: 5min, 15min, 30min)';
