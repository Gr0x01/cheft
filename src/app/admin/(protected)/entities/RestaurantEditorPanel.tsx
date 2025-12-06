'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import { Database } from '@/lib/database.types';
import { FieldSection } from '@/components/admin/forms/FieldSection';
import { TextField } from '@/components/admin/forms/TextField';
import { SelectField } from '@/components/admin/forms/SelectField';
import { MultiInput } from '@/components/admin/forms/MultiInput';
import { extractPlaceIdFromUrl } from '@/lib/utils/extract-place-id';
import { toast } from 'sonner';
import { 
  Store, 
  MapPin, 
  DollarSign, 
  Star,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

type Restaurant = Database['public']['Tables']['restaurants']['Row'];

interface RestaurantEditorPanelProps {
  restaurant: Restaurant;
  chefs: { id: string; name: string; slug: string }[];
  onDirtyChange?: (dirty: boolean) => void;
  onClose?: () => void;
}

export interface RestaurantEditorHandle {
  save: () => Promise<void>;
  discard: () => void;
  hasChanges: boolean;
  isSaving: boolean;
}

export const RestaurantEditorPanel = forwardRef<RestaurantEditorHandle, RestaurantEditorPanelProps>(function RestaurantEditorPanel({ restaurant, chefs, onDirtyChange, onClose }, ref) {
  const router = useRouter();
  const [formData, setFormData] = useState<Restaurant>(restaurant);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapsUrl, setMapsUrl] = useState('');
  const [extractedPlaceId, setExtractedPlaceId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const updateField = <K extends keyof Restaurant>(field: K, value: Restaurant[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(restaurant);

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  useEffect(() => {
    if (mapsUrl) {
      const placeId = extractPlaceIdFromUrl(mapsUrl);
      setExtractedPlaceId(placeId);
    } else {
      setExtractedPlaceId(null);
    }
  }, [mapsUrl]);

  const handleCopyPlaceId = async () => {
    if (extractedPlaceId) {
      await navigator.clipboard.writeText(extractedPlaceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefreshEnrichment = async () => {
    setRefreshing(true);
    setShowConfirmDialog(false);

    const loadingToast = toast.loading('Refreshing restaurant data from Google Places...');

    try {
      if (hasChanges) {
        await handleSave();
      }

      const response = await fetch('/api/admin/restaurants/fresh-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to trigger lookup');
      }

      const data = await response.json();
      
      setFormData(restaurant);
      
      router.refresh();
      
      toast.success(data.message || 'Successfully refreshed restaurant data', {
        id: loadingToast,
      });
      
      onClose?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh enrichment';
      toast.error(errorMessage, { id: loadingToast });
      setError(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    console.log('[RestaurantEditorPanel] handleSave called');
    setSaving(true);
    setError(null);

    try {
      console.log('[RestaurantEditorPanel] Updating restaurant:', restaurant.id);
      
      const updatePayload = {
        name: formData.name,
        slug: formData.slug,
        chef_id: formData.chef_id,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        lat: formData.lat,
        lng: formData.lng,
        cuisine_tags: formData.cuisine_tags,
        price_tier: formData.price_tier,
        status: formData.status,
        is_public: formData.is_public,
        google_place_id: formData.google_place_id,
        google_rating: formData.google_rating,
        google_review_count: formData.google_review_count,
        maps_url: formData.maps_url,
        michelin_stars: formData.michelin_stars,
      };
      
      console.log('[RestaurantEditorPanel] Update payload:', updatePayload);
      
      const response = await fetch('/api/admin/restaurants/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          updates: updatePayload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update restaurant');
      }
      
      console.log('[RestaurantEditorPanel] Update successful');
      
      Object.assign(restaurant, formData);
      
      router.refresh();
    } catch (err) {
      console.error('[RestaurantEditorPanel] Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setFormData(restaurant);
    setError(null);
  };

  useImperativeHandle(ref, () => ({
    save: handleSave,
    discard: handleDiscard,
    hasChanges,
    isSaving: saving,
  }), [handleSave, handleDiscard, hasChanges, saving]);

  return (
    <div className="h-full overflow-y-auto">
      {error && (
        <div className="mx-6 mt-6 bg-red-50 border-2 border-red-200 p-3">
          <p className="font-mono text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="p-6 space-y-6">
        <FieldSection title="Identity" description="Basic info" icon={Store} defaultOpen>
          <TextField
            label="Name"
            name="name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />
          <TextField
            label="Slug"
            name="slug"
            value={formData.slug}
            onChange={(e) => updateField('slug', e.target.value)}
            required
          />
          <SelectField
            label="Chef"
            name="chef_id"
            value={formData.chef_id}
            onChange={(e) => updateField('chef_id', e.target.value)}
            options={chefs.map(chef => ({ value: chef.id, label: chef.name }))}
            placeholder="Select chef"
          />
        </FieldSection>

        <FieldSection title="Location" description="Address and coordinates" icon={MapPin}>
          <TextField
            label="Address"
            name="address"
            value={formData.address || ''}
            onChange={(e) => updateField('address', e.target.value || null)}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="City"
              name="city"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              required
            />
            <TextField
              label="State"
              name="state"
              value={formData.state || ''}
              onChange={(e) => updateField('state', e.target.value || null)}
            />
          </div>
          <TextField
            label="Country"
            name="country"
            value={formData.country || ''}
            onChange={(e) => updateField('country', e.target.value || null)}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Latitude"
              name="lat"
              type="number"
              value={formData.lat?.toString() || ''}
              onChange={(e) => updateField('lat', e.target.value ? Number(e.target.value) : null)}
            />
            <TextField
              label="Longitude"
              name="lng"
              type="number"
              value={formData.lng?.toString() || ''}
              onChange={(e) => updateField('lng', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        </FieldSection>

        <FieldSection title="Details" description="Cuisine and pricing" icon={DollarSign}>
          <MultiInput
            label="Cuisine Tags"
            name="cuisine_tags"
            values={formData.cuisine_tags || []}
            onChange={(values) => updateField('cuisine_tags', values.length > 0 ? values : null)}
            placeholder="Add cuisine"
          />
          <SelectField
            label="Price Tier"
            name="price_tier"
            value={formData.price_tier || ''}
            onChange={(e) => updateField('price_tier', (e.target.value || null) as Restaurant['price_tier'])}
            options={[
              { value: '$', label: '$ - Budget' },
              { value: '$$', label: '$$ - Moderate' },
              { value: '$$$', label: '$$$ - Upscale' },
              { value: '$$$$', label: '$$$$ - Fine Dining' },
            ]}
            placeholder="Select price"
          />
          <SelectField
            label="Status"
            name="status"
            value={formData.status || ''}
            onChange={(e) => updateField('status', (e.target.value || null) as Restaurant['status'])}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
              { value: 'temporarily_closed', label: 'Temporarily Closed' },
            ]}
            placeholder="Select status"
          />
          <SelectField
            label="Public"
            name="is_public"
            value={formData.is_public ? 'true' : 'false'}
            onChange={(e) => updateField('is_public', e.target.value === 'true')}
            options={[
              { value: 'true', label: 'Public' },
              { value: 'false', label: 'Hidden' },
            ]}
            allowEmpty={false}
          />
        </FieldSection>

        <FieldSection title="Google Places" description="Business info from Google" icon={Star}>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-stone-600 mb-1.5">
              Place ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="google_place_id"
                value={formData.google_place_id || ''}
                onChange={(e) => updateField('google_place_id', e.target.value || null)}
                placeholder="Place ID"
                className="flex-1 px-3 py-2 bg-white border-2 border-stone-200 font-mono text-xs focus:outline-none focus:border-stone-900 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmDialog(true)}
                disabled={!formData.google_place_id || refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-stone-900 font-mono text-[10px] uppercase tracking-wider text-stone-900 hover:bg-stone-900 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Trigger fresh Google Places lookup"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Rating"
              name="google_rating"
              type="number"
              value={formData.google_rating?.toString() || ''}
              onChange={(e) => updateField('google_rating', e.target.value ? Number(e.target.value) : null)}
            />
            <TextField
              label="Reviews"
              name="google_review_count"
              type="number"
              value={formData.google_review_count?.toString() || ''}
              onChange={(e) => updateField('google_review_count', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <TextField
            label="Michelin Stars"
            name="michelin_stars"
            type="number"
            value={formData.michelin_stars?.toString() || ''}
            onChange={(e) => updateField('michelin_stars', e.target.value ? Number(e.target.value) : null)}
          />

          <div className="border-t-2 border-stone-200 pt-4 mt-4">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-stone-600 mb-3">
              Place ID Extraction Helper
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-stone-600 mb-1.5">
                  Maps URL
                </label>
                <input
                  type="text"
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  placeholder="Paste Google Maps URL..."
                  className="w-full px-3 py-2 bg-white border-2 border-stone-200 font-mono text-xs focus:outline-none focus:border-stone-900 transition-colors"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-stone-600 mb-1.5">
                  Extracted Place ID
                </label>
                <input
                  type="text"
                  value={extractedPlaceId || ''}
                  readOnly
                  onClick={handleCopyPlaceId}
                  placeholder="Place ID will appear here..."
                  className="w-full px-3 py-2 bg-stone-100 border-2 border-stone-200 font-mono text-xs cursor-pointer hover:bg-stone-200 transition-colors"
                  title="Click to copy"
                />
                {copied && (
                  <div className="flex items-center gap-1 mt-1 text-green-600">
                    <Check className="w-3 h-3" />
                    <span className="font-mono text-[10px]">Copied!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </FieldSection>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white border-2 border-stone-900 p-6 max-w-sm mx-4">
            <h3 className="font-display text-lg font-bold text-stone-900 mb-2">
              Trigger Fresh Lookup?
            </h3>
            <p className="font-mono text-xs text-stone-600 mb-6">
              This will search Google Places and update all restaurant data including place ID, rating, photos, website, and address.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 font-mono text-xs uppercase tracking-wider text-stone-600 hover:text-stone-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefreshEnrichment}
                className="px-4 py-2 bg-stone-900 text-white font-mono text-xs uppercase tracking-wider hover:bg-stone-800 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
