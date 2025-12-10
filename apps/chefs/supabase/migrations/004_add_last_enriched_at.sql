ALTER TABLE chefs ADD COLUMN last_enriched_at timestamptz;

CREATE INDEX idx_chefs_last_enriched_at ON chefs(last_enriched_at);

COMMENT ON COLUMN chefs.last_enriched_at IS 'Timestamp of last LLM enrichment run (bio, photo, or restaurant discovery)';

UPDATE chefs 
SET last_enriched_at = NOW() 
WHERE id IN (
  SELECT DISTINCT chef_id FROM restaurants
);
