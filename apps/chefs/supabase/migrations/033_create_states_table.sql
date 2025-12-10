-- Create states table with all 50 US states + DC
CREATE TABLE IF NOT EXISTS states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  abbreviation TEXT UNIQUE NOT NULL,
  restaurant_count INTEGER DEFAULT 0,
  chef_count INTEGER DEFAULT 0,
  city_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_states_slug ON states(slug);
CREATE INDEX idx_states_abbreviation ON states(abbreviation);
CREATE INDEX idx_states_restaurant_count ON states(restaurant_count DESC);

-- Insert all 50 states + DC
INSERT INTO states (slug, name, abbreviation) VALUES
  ('alabama', 'Alabama', 'AL'),
  ('alaska', 'Alaska', 'AK'),
  ('arizona', 'Arizona', 'AZ'),
  ('arkansas', 'Arkansas', 'AR'),
  ('california', 'California', 'CA'),
  ('colorado', 'Colorado', 'CO'),
  ('connecticut', 'Connecticut', 'CT'),
  ('delaware', 'Delaware', 'DE'),
  ('florida', 'Florida', 'FL'),
  ('georgia', 'Georgia', 'GA'),
  ('hawaii', 'Hawaii', 'HI'),
  ('idaho', 'Idaho', 'ID'),
  ('illinois', 'Illinois', 'IL'),
  ('indiana', 'Indiana', 'IN'),
  ('iowa', 'Iowa', 'IA'),
  ('kansas', 'Kansas', 'KS'),
  ('kentucky', 'Kentucky', 'KY'),
  ('louisiana', 'Louisiana', 'LA'),
  ('maine', 'Maine', 'ME'),
  ('maryland', 'Maryland', 'MD'),
  ('massachusetts', 'Massachusetts', 'MA'),
  ('michigan', 'Michigan', 'MI'),
  ('minnesota', 'Minnesota', 'MN'),
  ('mississippi', 'Mississippi', 'MS'),
  ('missouri', 'Missouri', 'MO'),
  ('montana', 'Montana', 'MT'),
  ('nebraska', 'Nebraska', 'NE'),
  ('nevada', 'Nevada', 'NV'),
  ('new-hampshire', 'New Hampshire', 'NH'),
  ('new-jersey', 'New Jersey', 'NJ'),
  ('new-mexico', 'New Mexico', 'NM'),
  ('new-york', 'New York', 'NY'),
  ('north-carolina', 'North Carolina', 'NC'),
  ('north-dakota', 'North Dakota', 'ND'),
  ('ohio', 'Ohio', 'OH'),
  ('oklahoma', 'Oklahoma', 'OK'),
  ('oregon', 'Oregon', 'OR'),
  ('pennsylvania', 'Pennsylvania', 'PA'),
  ('rhode-island', 'Rhode Island', 'RI'),
  ('south-carolina', 'South Carolina', 'SC'),
  ('south-dakota', 'South Dakota', 'SD'),
  ('tennessee', 'Tennessee', 'TN'),
  ('texas', 'Texas', 'TX'),
  ('utah', 'Utah', 'UT'),
  ('vermont', 'Vermont', 'VT'),
  ('virginia', 'Virginia', 'VA'),
  ('washington', 'Washington', 'WA'),
  ('west-virginia', 'West Virginia', 'WV'),
  ('wisconsin', 'Wisconsin', 'WI'),
  ('wyoming', 'Wyoming', 'WY'),
  ('washington-dc', 'Washington, D.C.', 'DC')
ON CONFLICT (slug) DO NOTHING;

-- Function to sync state counts from restaurants
CREATE OR REPLACE FUNCTION sync_state_counts()
RETURNS void AS $$
BEGIN
  UPDATE states s
  SET 
    restaurant_count = COALESCE(counts.restaurant_count, 0),
    chef_count = COALESCE(counts.chef_count, 0),
    city_count = COALESCE(counts.city_count, 0),
    updated_at = NOW()
  FROM (
    SELECT 
      st.id as state_id,
      COUNT(DISTINCT r.id) as restaurant_count,
      COUNT(DISTINCT r.chef_id) as chef_count,
      COUNT(DISTINCT r.city) as city_count
    FROM states st
    LEFT JOIN restaurants r ON r.state IS NOT NULL AND (
      r.state = st.name 
      OR r.state = st.abbreviation
      OR (st.abbreviation = 'DC' AND r.state IN ('DC', 'D.C.', 'Washington, D.C.', 'District of Columbia'))
    ) AND r.is_public = true
    GROUP BY st.id
  ) counts
  WHERE s.id = counts.state_id;
END;
$$ LANGUAGE plpgsql;

-- Run initial sync
SELECT sync_state_counts();

-- Create trigger to auto-update counts when restaurants change
CREATE OR REPLACE FUNCTION trigger_sync_state_counts()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM sync_state_counts();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS restaurants_state_sync ON restaurants;
CREATE TRIGGER restaurants_state_sync
  AFTER INSERT OR UPDATE OR DELETE ON restaurants
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_sync_state_counts();

-- RLS policies
ALTER TABLE states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "States are viewable by everyone"
  ON states FOR SELECT
  USING (true);

-- ============================================
-- Countries table for international support
-- ============================================
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  restaurant_count INTEGER DEFAULT 0,
  chef_count INTEGER DEFAULT 0,
  city_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_countries_slug ON countries(slug);
CREATE INDEX idx_countries_code ON countries(code);
CREATE INDEX idx_countries_restaurant_count ON countries(restaurant_count DESC);

INSERT INTO countries (slug, name, code) VALUES
  ('united-states', 'United States', 'US'),
  ('france', 'France', 'FR'),
  ('italy', 'Italy', 'IT'),
  ('spain', 'Spain', 'ES'),
  ('united-kingdom', 'United Kingdom', 'GB'),
  ('germany', 'Germany', 'DE'),
  ('japan', 'Japan', 'JP'),
  ('mexico', 'Mexico', 'MX'),
  ('canada', 'Canada', 'CA'),
  ('australia', 'Australia', 'AU'),
  ('argentina', 'Argentina', 'AR'),
  ('peru', 'Peru', 'PE'),
  ('brazil', 'Brazil', 'BR'),
  ('thailand', 'Thailand', 'TH'),
  ('south-korea', 'South Korea', 'KR'),
  ('india', 'India', 'IN'),
  ('singapore', 'Singapore', 'SG'),
  ('sweden', 'Sweden', 'SE'),
  ('denmark', 'Denmark', 'DK'),
  ('netherlands', 'Netherlands', 'NL'),
  ('belgium', 'Belgium', 'BE'),
  ('switzerland', 'Switzerland', 'CH'),
  ('austria', 'Austria', 'AT'),
  ('portugal', 'Portugal', 'PT'),
  ('greece', 'Greece', 'GR'),
  ('turkey', 'Turkey', 'TR'),
  ('israel', 'Israel', 'IL'),
  ('south-africa', 'South Africa', 'ZA'),
  ('philippines', 'Philippines', 'PH'),
  ('vietnam', 'Vietnam', 'VN'),
  ('indonesia', 'Indonesia', 'ID'),
  ('china', 'China', 'CN'),
  ('taiwan', 'Taiwan', 'TW'),
  ('hong-kong', 'Hong Kong', 'HK'),
  ('colombia', 'Colombia', 'CO'),
  ('chile', 'Chile', 'CL')
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION sync_country_counts()
RETURNS void AS $$
BEGIN
  UPDATE countries c
  SET 
    restaurant_count = COALESCE(counts.restaurant_count, 0),
    chef_count = COALESCE(counts.chef_count, 0),
    city_count = COALESCE(counts.city_count, 0),
    updated_at = NOW()
  FROM (
    SELECT 
      co.id as country_id,
      COUNT(DISTINCT r.id) as restaurant_count,
      COUNT(DISTINCT r.chef_id) as chef_count,
      COUNT(DISTINCT r.city) as city_count
    FROM countries co
    LEFT JOIN restaurants r ON r.country IS NOT NULL AND (
      r.country = co.name 
      OR r.country = co.code
    ) AND r.is_public = true
    GROUP BY co.id
  ) counts
  WHERE c.id = counts.country_id;
END;
$$ LANGUAGE plpgsql;

SELECT sync_country_counts();

CREATE OR REPLACE FUNCTION trigger_sync_country_counts()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM sync_country_counts();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS restaurants_country_sync ON restaurants;
CREATE TRIGGER restaurants_country_sync
  AFTER INSERT OR UPDATE OR DELETE ON restaurants
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_sync_country_counts();

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Countries are viewable by everyone"
  ON countries FOR SELECT
  USING (true);
