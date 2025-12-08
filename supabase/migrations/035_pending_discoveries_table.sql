-- Migration: Create pending_discoveries staging table for Tavily hybrid enrichment
-- Part of Phase 2: Staging System

CREATE TABLE pending_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_type TEXT NOT NULL CHECK (discovery_type IN ('show', 'chef', 'restaurant')),
  source_chef_id UUID REFERENCES chefs(id) ON DELETE SET NULL,
  source_chef_name TEXT,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_review', 'merged')),
  notes TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID
);

CREATE INDEX idx_pending_discoveries_status ON pending_discoveries(status);
CREATE INDEX idx_pending_discoveries_type ON pending_discoveries(discovery_type);
CREATE INDEX idx_pending_discoveries_source ON pending_discoveries(source_chef_id);
CREATE INDEX idx_pending_discoveries_created ON pending_discoveries(created_at DESC);

COMMENT ON TABLE pending_discoveries IS 'Staging table for discoveries from Tavily search before admin approval';
COMMENT ON COLUMN pending_discoveries.discovery_type IS 'Type of entity discovered: show, chef, or restaurant';
COMMENT ON COLUMN pending_discoveries.source_chef_id IS 'The chef being enriched when this discovery was made';
COMMENT ON COLUMN pending_discoveries.data IS 'JSONB payload with extracted entity data';
COMMENT ON COLUMN pending_discoveries.status IS 'pending=awaiting review, approved=ready to create, rejected=discarded, needs_review=flagged, merged=combined with existing';

ALTER TABLE pending_discoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pending_discoveries" ON pending_discoveries FOR SELECT USING (true);
CREATE POLICY "Service role full access pending_discoveries" ON pending_discoveries FOR ALL USING (auth.role() = 'service_role');
