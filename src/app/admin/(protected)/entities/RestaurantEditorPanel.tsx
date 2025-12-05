'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/client';
import { FieldSection } from '@/components/admin/forms/FieldSection';
import { TextField } from '@/components/admin/forms/TextField';
import { SelectField } from '@/components/admin/forms/SelectField';
import { MultiInput } from '@/components/admin/forms/MultiInput';
import { 
  Store, 
  MapPin, 
  DollarSign, 
  Star,
  Save,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';

type Restaurant = Database['public']['Tables']['restaurants']['Row'];

interface RestaurantEditorPanelProps {
  restaurant: Restaurant;
  chefs: { id: string; name: string; slug: string }[];
  onDirtyChange?: (dirty: boolean) => void;
}

export function RestaurantEditorPanel({ restaurant, chefs, onDirtyChange }: RestaurantEditorPanelProps) {
  const router = useRouter();
  const supabase = createClient();
  const [formData, setFormData] = useState<Restaurant>(restaurant);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof Restaurant>(field: K, value: Restaurant[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(restaurant);

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
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
        })
        .eq('id', restaurant.id);

      if (updateError) throw updateError;
      router.refresh();
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setFormData(restaurant);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.slug && (
              <a
                href={`/restaurants/${restaurant.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-copper-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View Live
              </a>
            )}
            {hasChanges && (
              <span className="text-sm text-amber-600 font-medium">• Unsaved</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscard}
              disabled={saving || !hasChanges}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-copper-500 hover:bg-copper-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="font-ui text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
          <TextField
            label="Place ID"
            name="google_place_id"
            value={formData.google_place_id || ''}
            onChange={(e) => updateField('google_place_id', e.target.value || null)}
          />
          <TextField
            label="Maps URL"
            name="maps_url"
            type="url"
            value={formData.maps_url || ''}
            onChange={(e) => updateField('maps_url', e.target.value || null)}
          />
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
        </FieldSection>
      </div>
    </div>
  );
}
