-- TV Chef Map Database Schema v2
-- Complete rebuild with chef_shows junction table, embeddings, and ingestion pipeline tables

-- Drop existing tables (order matters due to foreign keys)
DROP TABLE IF EXISTS restaurant_embeddings CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS chef_shows CASCADE;
DROP TABLE IF EXISTS chefs CASCADE;
DROP TABLE IF EXISTS shows CASCADE;
DROP TABLE IF EXISTS review_queue CASCADE;
DROP TABLE IF EXISTS data_changes CASCADE;
DROP TABLE IF EXISTS excluded_names CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- CORE TABLES
-- ============================================

-- Shows table
CREATE TABLE shows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    network TEXT,
    wikipedia_source TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Chefs table (show-specific fields moved to junction table)
CREATE TABLE chefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    mini_bio TEXT,
    country TEXT DEFAULT 'US',
    james_beard_status TEXT CHECK (james_beard_status IN ('semifinalist', 'nominated', 'winner')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chef-Show junction (handles multiple shows/seasons per chef)
CREATE TABLE chef_shows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
    show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    season TEXT,
    season_name TEXT,
    result TEXT CHECK (result IN ('winner', 'finalist', 'contestant', 'judge')),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(chef_id, show_id, season)
);

-- Restaurants table (enhanced with verification tracking)
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
    chef_role TEXT DEFAULT 'owner' CHECK (chef_role IN ('owner', 'executive_chef', 'partner', 'consultant')),
    address TEXT,
    city TEXT NOT NULL,
    state TEXT,
    country TEXT DEFAULT 'US',
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    price_tier TEXT CHECK (price_tier IN ('$', '$$', '$$$', '$$$$')),
    cuisine_tags TEXT[],
    status TEXT DEFAULT 'unknown' CHECK (status IN ('open', 'closed', 'unknown')),
    website_url TEXT,
    maps_url TEXT,
    source_notes TEXT,
    last_verified_at TIMESTAMPTZ,
    verification_source TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SEMANTIC SEARCH (EMBEDDINGS)
-- ============================================

CREATE TABLE restaurant_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    embedding vector(1536),
    text_content TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INGESTION PIPELINE TABLES
-- ============================================

CREATE TABLE review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    data JSONB NOT NULL,
    source TEXT,
    confidence FLOAT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE data_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    change_type TEXT NOT NULL CHECK (change_type IN ('insert', 'update', 'delete')),
    old_data JSONB,
    new_data JSONB,
    source TEXT NOT NULL,
    confidence FLOAT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE excluded_names (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    show_id UUID REFERENCES shows(id),
    reason TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Core table indexes
CREATE INDEX idx_chefs_slug ON chefs(slug);
CREATE INDEX idx_chef_shows_chef ON chef_shows(chef_id);
CREATE INDEX idx_chef_shows_show ON chef_shows(show_id);
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_chef ON restaurants(chef_id);
CREATE INDEX idx_restaurants_location ON restaurants(city, state, country);
CREATE INDEX idx_restaurants_status ON restaurants(status);
CREATE INDEX idx_restaurants_price_tier ON restaurants(price_tier);

-- Pipeline table indexes
CREATE INDEX idx_review_queue_status ON review_queue(status);
CREATE INDEX idx_review_queue_created ON review_queue(created_at DESC);
CREATE INDEX idx_data_changes_table ON data_changes(table_name, created_at DESC);
CREATE INDEX idx_excluded_names_name ON excluded_names(name);

-- Vector similarity search index
CREATE INDEX idx_restaurant_embeddings_vector 
    ON restaurant_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chefs_updated_at 
    BEFORE UPDATE ON chefs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at 
    BEFORE UPDATE ON restaurants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Shows
-- ============================================

INSERT INTO shows (name, slug, network, wikipedia_source) VALUES 
    ('Top Chef', 'top-chef', 'Bravo', 'List_of_Top_Chef_contestants'),
    ('Iron Chef America', 'iron-chef-america', 'Food Network', 'List_of_Iron_Chef_America_episodes'),
    ('Tournament of Champions', 'tournament-of-champions', 'Food Network', 'Tournament_of_Champions_(TV_series)'),
    ('Next Level Chef', 'next-level-chef', 'FOX', NULL),
    ('Chopped', 'chopped', 'Food Network', NULL),
    ('Hells Kitchen', 'hells-kitchen', 'FOX', 'List_of_Hells_Kitchen_(American_TV_series)_episodes'),
    ('MasterChef', 'masterchef', 'FOX', NULL),
    ('Beat Bobby Flay', 'beat-bobby-flay', 'Food Network', NULL);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE chefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE excluded_names ENABLE ROW LEVEL SECURITY;

-- Public read for core data (anon key can read)
CREATE POLICY "Public read shows" ON shows FOR SELECT USING (true);
CREATE POLICY "Public read chefs" ON chefs FOR SELECT USING (true);
CREATE POLICY "Public read chef_shows" ON chef_shows FOR SELECT USING (true);
CREATE POLICY "Public read restaurants" ON restaurants FOR SELECT USING (is_public = true);
CREATE POLICY "Public read embeddings" ON restaurant_embeddings FOR SELECT USING (true);

-- Admin-only tables have no public policies
-- Service role key bypasses RLS for admin operations
