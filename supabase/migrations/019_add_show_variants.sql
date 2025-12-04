-- Migration: add_show_variants
-- Adds all Top Chef variants and other missing cooking shows
-- Created: 2025-12-05

-- Add Top Chef variants
INSERT INTO shows (name, slug, network, wikipedia_source) VALUES 
    ('Top Chef Masters', 'top-chef-masters', 'Bravo', 'Top_Chef_Masters'),
    ('Top Chef: Just Desserts', 'top-chef-just-desserts', 'Bravo', 'Top_Chef:_Just_Desserts'),
    ('Top Chef Junior', 'top-chef-junior', 'Universal Kids', 'Top_Chef_Junior'),
    ('Top Chef Duels', 'top-chef-duels', 'Bravo', 'Top_Chef_Duels'),
    ('Top Chef Amateurs', 'top-chef-amateurs', 'Bravo', 'Top_Chef_Amateurs'),
    ('Top Chef Family Style', 'top-chef-family-style', 'Peacock', 'Top_Chef_Family_Style'),
    ('Top Chef Estrellas', 'top-chef-estrellas', 'Telemundo', 'Top_Chef_Estrellas'),
    ('Top Chef VIP', 'top-chef-vip', 'Telemundo', 'Top_Chef_VIP'),
    ('Top Chef Canada', 'top-chef-canada', 'Food Network Canada', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Add other major cooking competition shows
INSERT INTO shows (name, slug, network, wikipedia_source) VALUES 
    ('The Great British Bake Off', 'great-british-bake-off', 'BBC', NULL),
    ('The Great British Baking Show', 'great-british-baking-show', 'Netflix', NULL),
    ('Iron Chef', 'iron-chef', 'Food Network', NULL),
    ('Guy''s Grocery Games', 'guys-grocery-games', 'Food Network', NULL),
    ('Cutthroat Kitchen', 'cutthroat-kitchen', 'Food Network', NULL),
    ('The Final Table', 'the-final-table', 'Netflix', NULL),
    ('The Chef Show', 'the-chef-show', 'Netflix', NULL),
    ('Baking Impossible', 'baking-impossible', 'Netflix', NULL),
    ('Nailed It!', 'nailed-it', 'Netflix', NULL),
    ('Is It Cake?', 'is-it-cake', 'Netflix', NULL),
    ('Best in Dough', 'best-in-dough', 'Hulu', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Add Food Network competition shows
INSERT INTO shows (name, slug, network, wikipedia_source) VALUES 
    ('Chopped Champions', 'chopped-champions', 'Food Network', NULL),
    ('Chopped Sweets', 'chopped-sweets', 'Food Network', NULL),
    ('Spring Baking Championship', 'spring-baking-championship', 'Food Network', NULL),
    ('Halloween Baking Championship', 'halloween-baking-championship', 'Food Network', NULL),
    ('Holiday Baking Championship', 'holiday-baking-championship', 'Food Network', NULL),
    ('Kids Baking Championship', 'kids-baking-championship', 'Food Network', NULL),
    ('Worst Cooks in America', 'worst-cooks-in-america', 'Food Network', NULL),
    ('Good Eats', 'good-eats', 'Food Network', NULL),
    ('Diners, Drive-Ins and Dives', 'diners-drive-ins-and-dives', 'Food Network', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Comment
COMMENT ON TABLE shows IS 'TV cooking shows including all Top Chef variants and major competition series';
