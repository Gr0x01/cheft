-- Add group_id to duplicate_candidates
-- Migration: 013_duplicate_groups
-- Created: 2025-12-03
-- Purpose: Group related duplicate pairs together for easier review

-- Add group_id column
ALTER TABLE public.duplicate_candidates
ADD COLUMN group_id uuid;

-- Create index for grouping queries
CREATE INDEX idx_duplicate_candidates_group_id ON public.duplicate_candidates(group_id);

-- Add comment
COMMENT ON COLUMN public.duplicate_candidates.group_id IS 'Groups related duplicate pairs together (e.g., if A=B and B=C, they share a group_id)';
