-- Migration: Add Chef's Table shows
-- Netflix documentary series featuring world-renowned chefs
-- Uses "Volume" instead of "Season"

INSERT INTO shows (name, slug, network, wikipedia_source) VALUES 
    ('Chef''s Table', 'chefs-table', 'Netflix', 'Chef''s_Table'),
    ('Chef''s Table: France', 'chefs-table-france', 'Netflix', 'Chef''s_Table:_France'),
    ('Chef''s Table: Pastry', 'chefs-table-pastry', 'Netflix', 'Chef''s_Table'),
    ('Chef''s Table: BBQ', 'chefs-table-bbq', 'Netflix', 'Chef''s_Table:_BBQ'),
    ('Chef''s Table: Pizza', 'chefs-table-pizza', 'Netflix', 'Chef''s_Table:_Pizza'),
    ('Chef''s Table: Noodles', 'chefs-table-noodles', 'Netflix', 'Chef''s_Table'),
    ('Chef''s Table: Legends', 'chefs-table-legends', 'Netflix', 'Chef''s_Table')
ON CONFLICT (slug) DO NOTHING;
