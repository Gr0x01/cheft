import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../src/lib/database.types';
import { createHash } from 'crypto';

export interface ImageUploadResult {
  publicUrl: string;
  path: string;
  bucket: string;
  success: boolean;
  error?: string;
}

export function createImageStorageService(supabase: SupabaseClient<Database>) {
  async function downloadAndUploadChefPhoto(
    chefId: string,
    chefName: string,
    sourceUrl: string
  ): Promise<ImageUploadResult> {
    try {
      const response = await fetch(sourceUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download image: HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const extension = getExtensionFromMimeType(contentType);
      
      const hash = createHash('md5').update(buffer).digest('hex');
      const slug = chefName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const fileName = `${slug}-${hash.substring(0, 8)}.${extension}`;
      const path = `${chefId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chef-photos')
        .upload(path, buffer, {
          contentType,
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('chef-photos')
        .getPublicUrl(path);

      return {
        publicUrl: urlData.publicUrl,
        path,
        bucket: 'chef-photos',
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Failed to upload chef photo: ${msg}`);
      
      return {
        publicUrl: '',
        path: '',
        bucket: 'chef-photos',
        success: false,
        error: msg,
      };
    }
  }

  async function downloadAndUploadRestaurantPhoto(
    restaurantId: string,
    restaurantName: string,
    sourceUrl: string,
    index: number = 0
  ): Promise<ImageUploadResult> {
    try {
      const response = await fetch(sourceUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download image: HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const extension = getExtensionFromMimeType(contentType);
      
      const hash = createHash('md5').update(buffer).digest('hex');
      const slug = restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const fileName = `${slug}-${index}-${hash.substring(0, 8)}.${extension}`;
      const path = `${restaurantId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-photos')
        .upload(path, buffer, {
          contentType,
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('restaurant-photos')
        .getPublicUrl(path);

      return {
        publicUrl: urlData.publicUrl,
        path,
        bucket: 'restaurant-photos',
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Failed to upload restaurant photo: ${msg}`);
      
      return {
        publicUrl: '',
        path: '',
        bucket: 'restaurant-photos',
        success: false,
        error: msg,
      };
    }
  }

  function getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return map[mimeType.toLowerCase()] || 'jpg';
  }

  return {
    downloadAndUploadChefPhoto,
    downloadAndUploadRestaurantPhoto,
  };
}

export type ImageStorageService = ReturnType<typeof createImageStorageService>;
