# Manual Database Setup

Since the automated migration is complex, here's how to set up the database manually:

## Step 1: Go to Supabase SQL Editor

1. Open https://supabase.com/dashboard/project/clktrvyieegouggrpfaj
2. Go to "SQL Editor" in the left sidebar
3. Create a new query

## Step 2: Run the Migration SQL

Copy and paste this SQL into the editor and run it:

```sql
-- TV Chef Map Database Schema
-- Creates tables for shows, chefs, restaurants, and optional embeddings

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS vector; -- Uncomment if you need embeddings

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

-- Indexes for performance
CREATE INDEX idx_chefs_slug ON chefs(slug);
CREATE INDEX idx_chefs_primary_show ON chefs(primary_show_id);
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_chef ON restaurants(chef_id);
CREATE INDEX idx_restaurants_location ON restaurants(city, state, country);
CREATE INDEX idx_restaurants_status ON restaurants(status);
CREATE INDEX idx_restaurants_is_public ON restaurants(is_public);
CREATE INDEX idx_restaurants_price_tier ON restaurants(price_tier);

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
```

## Step 3: Verify Tables Were Created

Run this query to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see: `chefs`, `restaurants`, `shows`

## Step 4: Test Basic Operations

```sql
-- Check shows
SELECT * FROM shows;

-- This should show 5 shows including Top Chef
```

Once this is done, we can proceed with the data extraction and import!