-- Search cache for storing raw Tavily/web search results
-- Enables: reprocessing with different models, offline enrichment, reduced API costs

CREATE TABLE IF NOT EXISTS search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  query TEXT NOT NULL,
  query_hash TEXT NOT NULL,
  results JSONB NOT NULL,
  result_count INTEGER DEFAULT 0,
  source TEXT DEFAULT 'tavily',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_cache_hash ON search_cache(query_hash);
CREATE INDEX idx_search_cache_entity ON search_cache(entity_type, entity_id);
CREATE INDEX idx_search_cache_entity_name ON search_cache(entity_type, entity_name);
CREATE INDEX idx_search_cache_expires ON search_cache(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_search_cache_source ON search_cache(source);

COMMENT ON TABLE search_cache IS 'Caches raw web search results to avoid repeated API calls';
COMMENT ON COLUMN search_cache.entity_type IS 'Type of entity: chef, restaurant';
COMMENT ON COLUMN search_cache.entity_id IS 'FK to chefs/restaurants table (nullable for new lookups)';
COMMENT ON COLUMN search_cache.entity_name IS 'Human-readable name for easier debugging';
COMMENT ON COLUMN search_cache.query_hash IS 'MD5 hash of query for fast lookup';
COMMENT ON COLUMN search_cache.results IS 'Raw JSON response from search API';
COMMENT ON COLUMN search_cache.expires_at IS 'Optional TTL - null means no expiry';
