-- Migration: add_enrichment_job_metadata
-- Adds metadata column to enrichment_jobs for storing job-specific data like restaurant IDs

ALTER TABLE enrichment_jobs 
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_metadata 
  ON enrichment_jobs USING gin(metadata);

COMMENT ON COLUMN enrichment_jobs.metadata IS 'Job-specific metadata: e.g., {restaurant_ids: [...], show_name: "..."}';
