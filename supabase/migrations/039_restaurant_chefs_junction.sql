-- Multi-chef restaurant support
-- Creates junction table to support restaurants with multiple chef owners/partners

CREATE TABLE restaurant_chefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'co-owner', 'partner', 'executive_chef', 'consultant')),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(restaurant_id, chef_id)
);

CREATE INDEX idx_restaurant_chefs_restaurant ON restaurant_chefs(restaurant_id);
CREATE INDEX idx_restaurant_chefs_chef ON restaurant_chefs(chef_id);

ALTER TABLE restaurant_chefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read restaurant_chefs" ON restaurant_chefs FOR SELECT USING (true);

-- Migrate existing chef_id relationships to junction table
INSERT INTO restaurant_chefs (restaurant_id, chef_id, role, is_primary)
SELECT id, chef_id, COALESCE(chef_role, 'owner'), true
FROM restaurants
WHERE chef_id IS NOT NULL;

-- Function to get all chefs for a restaurant
CREATE OR REPLACE FUNCTION get_restaurant_chefs(p_restaurant_id UUID)
RETURNS TABLE (
    chef_id UUID,
    chef_name TEXT,
    chef_slug TEXT,
    chef_photo_url TEXT,
    role TEXT,
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.slug,
        c.photo_url,
        rc.role,
        rc.is_primary
    FROM restaurant_chefs rc
    JOIN chefs c ON c.id = rc.chef_id
    WHERE rc.restaurant_id = p_restaurant_id
    ORDER BY rc.is_primary DESC, c.name;
END;
$$ LANGUAGE plpgsql;
