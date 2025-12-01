-- Create storage bucket for chef photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chef-photos',
  'chef-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for restaurant photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'restaurant-photos',
  'restaurant-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for chef photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for restaurant photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to chef photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to restaurant photos" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to chef photos" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to restaurant photos" ON storage.objects;

-- Allow public read access to chef photos
CREATE POLICY "Public read access for chef photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'chef-photos');

-- Allow public read access to restaurant photos
CREATE POLICY "Public read access for restaurant photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-photos');

-- Allow service role full access to chef photos
CREATE POLICY "Service role full access to chef photos"
ON storage.objects FOR ALL
USING (bucket_id = 'chef-photos' AND auth.role() = 'service_role');

-- Allow service role full access to restaurant photos
CREATE POLICY "Service role full access to restaurant photos"
ON storage.objects FOR ALL
USING (bucket_id = 'restaurant-photos' AND auth.role() = 'service_role');
