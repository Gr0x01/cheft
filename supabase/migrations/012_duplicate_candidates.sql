-- Duplicate Candidates Table
-- Migration: 012_duplicate_candidates
-- Created: 2025-12-03
-- Purpose: Store restaurant duplicate detection results for admin review

-- Table to store potential duplicate restaurant pairs
CREATE TABLE IF NOT EXISTS public.duplicate_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_ids uuid[] NOT NULL CHECK (array_length(restaurant_ids, 1) = 2),
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reasoning text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  resolved_at timestamp with time zone,
  resolved_by text,
  merged_into uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for faster queries
CREATE INDEX idx_duplicate_candidates_status ON public.duplicate_candidates(status);
CREATE INDEX idx_duplicate_candidates_confidence ON public.duplicate_candidates(confidence DESC);
CREATE INDEX idx_duplicate_candidates_created_at ON public.duplicate_candidates(created_at DESC);

-- RLS policies
ALTER TABLE public.duplicate_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to duplicate candidates"
  ON public.duplicate_candidates
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert to duplicate candidates"
  ON public.duplicate_candidates
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update to duplicate candidates"
  ON public.duplicate_candidates
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_duplicate_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER duplicate_candidates_updated_at
  BEFORE UPDATE ON public.duplicate_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_duplicate_candidates_updated_at();

-- Comments
COMMENT ON TABLE public.duplicate_candidates IS 'Stores pairs of restaurants detected as potential duplicates via LLM analysis for admin review';
COMMENT ON COLUMN public.duplicate_candidates.restaurant_ids IS 'Array of exactly 2 restaurant UUIDs that are potential duplicates';
COMMENT ON COLUMN public.duplicate_candidates.confidence IS 'LLM confidence score (0-1) that these are duplicates';
COMMENT ON COLUMN public.duplicate_candidates.reasoning IS 'Explanation from LLM about why these are duplicates';
COMMENT ON COLUMN public.duplicate_candidates.status IS 'Review status: pending (needs review), resolved (merged), or ignored (kept separate)';
COMMENT ON COLUMN public.duplicate_candidates.merged_into IS 'If resolved via merge, the UUID of the restaurant that was kept';
