export function getStorageUrl(
  bucket: 'chef-photos' | 'restaurant-photos',
  path: string | null | undefined
): string | null {
  if (!path) return null;
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not defined');
    return null;
  }
  
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
