-- Migration: enrichment_refresh_system
-- Adds automated refresh system with budget tracking, priority scoring, and scheduled enrichment

-- ============================================
-- ENRICHMENT JOBS TABLE ENHANCEMENTS
-- ============================================

-- Add enrichment type tracking
ALTER TABLE enrichment_jobs 
  ADD COLUMN IF NOT EXISTS enrichment_type TEXT 
  CHECK (enrichment_type IN (
    'initial',              -- First-time chef enrichment from review queue
    'manual_full',          -- Admin-triggered full re-enrichment
    'manual_restaurants',   -- Admin-triggered restaurant discovery only
    'manual_status',        -- Admin-triggered status verification
    'monthly_refresh',      -- Scheduled monthly full refresh
    'weekly_status'         -- Scheduled weekly status check
  ));

-- Add trigger tracking (who/what initiated this job)
ALTER TABLE enrichment_jobs 
  ADD COLUMN IF NOT EXISTS triggered_by TEXT;

-- Add token usage tracking (from LLM API)
ALTER TABLE enrichment_jobs 
  ADD COLUMN IF NOT EXISTS tokens_used JSONB;

-- Add cost tracking (estimated USD cost)
ALTER TABLE enrichment_jobs 
  ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10, 4);

-- Add priority scoring (higher = more urgent)
ALTER TABLE enrichment_jobs 
  ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 0;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_type 
  ON enrichment_jobs(enrichment_type);

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_triggered_by 
  ON enrichment_jobs(triggered_by);

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_priority 
  ON enrichment_jobs(priority_score DESC, created_at ASC) 
  WHERE status = 'queued';

-- Add comments
COMMENT ON COLUMN enrichment_jobs.enrichment_type IS 'Type of enrichment: initial, manual_full, manual_restaurants, manual_status, monthly_refresh, weekly_status';
COMMENT ON COLUMN enrichment_jobs.triggered_by IS 'Who/what triggered this job: "cron" or admin user email';
COMMENT ON COLUMN enrichment_jobs.tokens_used IS 'LLM token usage: {prompt: 1234, completion: 567, total: 1801}';
COMMENT ON COLUMN enrichment_jobs.cost_usd IS 'Estimated cost in USD based on token usage and model pricing';
COMMENT ON COLUMN enrichment_jobs.priority_score IS 'Priority score (0-200, higher = more urgent)';

-- ============================================
-- ENRICHMENT BUDGETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS enrichment_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL UNIQUE,
  budget_usd NUMERIC(10, 2) DEFAULT 20.00,
  spent_usd NUMERIC(10, 4) DEFAULT 0,
  manual_spent_usd NUMERIC(10, 4) DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  jobs_failed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrichment_budgets_month 
  ON enrichment_budgets(month DESC);

COMMENT ON TABLE enrichment_budgets IS 'Monthly budget tracking for automated enrichment costs';
COMMENT ON COLUMN enrichment_budgets.month IS 'Month in YYYY-MM-01 format';
COMMENT ON COLUMN enrichment_budgets.budget_usd IS 'Monthly budget limit in USD (default $20)';
COMMENT ON COLUMN enrichment_budgets.spent_usd IS 'Automated enrichment spend (cron jobs)';
COMMENT ON COLUMN enrichment_budgets.manual_spent_usd IS 'Manual enrichment spend (admin triggers)';
COMMENT ON COLUMN enrichment_budgets.jobs_completed IS 'Number of successful jobs this month';
COMMENT ON COLUMN enrichment_budgets.jobs_failed IS 'Number of failed jobs this month';

-- Helper function to increment budget spend
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_budget_spend IS 'Updates monthly budget tracking. Call after each enrichment job completes.';

-- ============================================
-- CHEFS TABLE ENHANCEMENTS
-- ============================================

-- Add verification timestamp
ALTER TABLE chefs 
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- Add priority score (0-100, higher = refresh sooner)
ALTER TABLE chefs 
  ADD COLUMN IF NOT EXISTS enrichment_priority INTEGER DEFAULT 50;

-- Add manual priority flag (admin can flag for attention)
ALTER TABLE chefs 
  ADD COLUMN IF NOT EXISTS manual_priority BOOLEAN DEFAULT FALSE;

-- Create index for priority-based refresh selection
CREATE INDEX IF NOT EXISTS idx_chefs_refresh_priority 
  ON chefs(enrichment_priority DESC, last_enriched_at ASC NULLS FIRST);

COMMENT ON COLUMN chefs.last_verified_at IS 'Last time ANY data was verified (enrichment or status check)';
COMMENT ON COLUMN chefs.enrichment_priority IS 'Priority score 0-100 (higher = refresh sooner)';
COMMENT ON COLUMN chefs.manual_priority IS 'Admin flagged this chef for priority refresh';

-- ============================================
-- RESTAURANTS TABLE ENHANCEMENTS
-- ============================================

-- Add priority score for status verification
ALTER TABLE restaurants 
  ADD COLUMN IF NOT EXISTS verification_priority INTEGER DEFAULT 50;

-- Create index for priority-based verification selection
CREATE INDEX IF NOT EXISTS idx_restaurants_verification_priority 
  ON restaurants(verification_priority DESC, last_verified_at ASC NULLS FIRST) 
  WHERE status = 'open';

COMMENT ON COLUMN restaurants.verification_priority IS 'Priority score 0-100 (higher = verify sooner)';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE enrichment_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only enrichment_budgets" ON enrichment_budgets FOR ALL 
  USING (auth.role() = 'service_role');

-- ============================================
-- DATA INITIALIZATION
-- ============================================

-- Set initial enrichment_type for existing jobs
UPDATE enrichment_jobs 
SET enrichment_type = 'initial', 
    triggered_by = 'cron'
WHERE enrichment_type IS NULL;

-- Set default priorities based on restaurant count
UPDATE chefs 
SET enrichment_priority = LEAST(50 + (
  SELECT COUNT(*) * 5 
  FROM restaurants 
  WHERE restaurants.chef_id = chefs.id
), 100)
WHERE enrichment_priority = 50;

-- Add NOT NULL constraint after backfilling data
ALTER TABLE enrichment_jobs 
  ALTER COLUMN enrichment_type SET NOT NULL;
