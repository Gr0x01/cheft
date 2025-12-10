-- TV Chef Map Database Schema
-- Creates tables for shows, chefs, restaurants, and optional embeddings

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Shows table
CREATE TABLE shows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    network TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chefs table
CREATE TABLE chefs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    primary_show_id UUID REFERENCES shows(id),
    other_shows TEXT[], -- Array of show names for v0
    top_chef_season TEXT, -- e.g. "S04"
    top_chef_result TEXT CHECK (top_chef_result IN ('winner', 'finalist', 'contestant')),
    mini_bio TEXT,
    country TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurants table  
CREATE TABLE restaurants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    chef_id UUID NOT NULL REFERENCES chefs(id),
    city TEXT NOT NULL,
    state TEXT,
    country TEXT DEFAULT 'US',
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    price_tier TEXT CHECK (price_tier IN ('$', '$$', '$$$', '$$$$')) NOT NULL,
    cuisine_tags TEXT[],
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'unknown')),
    website_url TEXT,
    maps_url TEXT,
    source_notes TEXT, -- Provenance like "From Eater list 2025-06"
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Restaurant embeddings for semantic search
CREATE TABLE restaurant_embeddings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    embedding vector(1536), -- OpenAI ada-002 dimension
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chefs_slug ON chefs(slug);
CREATE INDEX idx_chefs_primary_show ON chefs(primary_show_id);
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_chef ON restaurants(chef_id);
CREATE INDEX idx_restaurants_location ON restaurants(city, state, country);
CREATE INDEX idx_restaurants_status ON restaurants(status);
CREATE INDEX idx_restaurants_is_public ON restaurants(is_public);
CREATE INDEX idx_restaurants_price_tier ON restaurants(price_tier);

-- Vector similarity search index (if using embeddings)
CREATE INDEX ON restaurant_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_chefs_updated_at 
    BEFORE UPDATE ON chefs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at 
    BEFORE UPDATE ON restaurants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO shows (name, network) VALUES 
    ('Top Chef', 'Bravo'),
    ('Iron Chef', 'Food Network'),
    ('Tournament of Champions', 'Food Network'),
    ('Next Level Chef', 'FOX'),
    ('Chopped', 'Food Network');

-- Sample chef (you can add real data later)
INSERT INTO chefs (name, slug, primary_show_id, top_chef_season, top_chef_result, mini_bio, country)
SELECT 
    'Sample Chef',
    'sample-chef',
    s.id,
    'S21',
    'winner',
    'Award-winning chef known for innovative cuisine.',
    'US'
FROM shows s WHERE s.name = 'Top Chef';

-- Sample restaurant
INSERT INTO restaurants (name, slug, chef_id, city, state, country, lat, lng, price_tier, cuisine_tags, status, website_url, source_notes)
SELECT 
    'Sample Restaurant',
    'sample-restaurant',
    c.id,
    'Chicago',
    'IL',
    'US',
    41.8781,
    -87.6298,
    '$$$',
    ARRAY['New American', 'Farm-to-table'],
    'open',
    'https://example.com',
    'Sample data for development'
FROM chefs c WHERE c.slug = 'sample-chef';