'use client';

import { useState } from 'react';
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
  ArrowLeft,
  Shield,
} from 'lucide-react';

type Restaurant = Database['public']['Tables']['restaurants']['Row'] & { protected?: boolean };

interface RestaurantEditorFormProps {
  restaurant: Restaurant;
  chefs: { id: string; name: string; slug: string }[];
}

function sanitizeForDisplay(text: string | null): string {
  if (!text) return '';
  return text.replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'));
}

export function RestaurantEditorForm({ restaurant, chefs }: RestaurantEditorFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [formData, setFormData] = useState<Restaurant>(restaurant);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof Restaurant>(field: K, value: Restaurant[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
          protected: formData.protected,
        })
        .eq('id', restaurant.id);

      if (updateError) throw updateError;

      alert('Restaurant updated successfully!');
      router.refresh();
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save changes. Please try again or contact support.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (confirm('Discard all changes?')) {
      setFormData(restaurant);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-copper-500 to-copper-600 rounded-2xl shadow-xl shadow-copper-500/30 p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent pointer-events-none" />
        <div className="relative">
          <button
            onClick={() => router.push('/admin/manage')}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-ui text-sm">Back to Manage</span>
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-4xl font-black tracking-tight drop-shadow-lg">
                Edit Restaurant
              </h1>
              <p className="font-mono text-sm uppercase tracking-widest text-copper-100 mt-2 drop-shadow-md">
                {sanitizeForDisplay(formData.name)}
              </p>
            </div>
            <a
              href={`/restaurants/${restaurant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            onClick={(e) => {
              if (!restaurant.slug) e.preventDefault();
            }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="font-ui text-sm font-medium">View Live</span>
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-ui text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="sticky top-4 z-10 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 p-4">
        <div className="flex items-center justify-between">
          <span className="font-ui text-sm text-slate-500">
            {JSON.stringify(formData) !== JSON.stringify(restaurant) ? (
              <span className="text-amber-600 font-medium">• Unsaved changes</span>
            ) : (
              <span>All changes saved</span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDiscard}
              disabled={saving || JSON.stringify(formData) === JSON.stringify(restaurant)}
              className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-ui font-medium"
            >
              <X className="w-4 h-4" />
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving || JSON.stringify(formData) === JSON.stringify(restaurant)}
              className="inline-flex items-center gap-2 px-6 py-2 bg-copper-500 hover:bg-copper-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-ui font-medium shadow-lg shadow-copper-500/30"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <FieldSection
          title="Identity"
          description="Basic restaurant information"
          icon={Store}
        >
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
            helperText="URL-friendly identifier (e.g., le-bernardin-new-york)"
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

        <FieldSection
          title="Location"
          description="Address and coordinates"
          icon={MapPin}
        >
          <TextField
            label="Address"
            name="address"
            value={formData.address || ''}
            onChange={(e) => updateField('address', e.target.value || null)}
            placeholder="123 Main St"
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
              placeholder="CA, NY, etc."
            />
          </div>
          <TextField
            label="Country"
            name="country"
            value={formData.country || ''}
            onChange={(e) => updateField('country', e.target.value || null)}
            placeholder="USA, France, Japan, etc."
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Latitude"
              name="lat"
              type="number"
              value={formData.lat?.toString() || ''}
              onChange={(e) => updateField('lat', e.target.value ? Number(e.target.value) : null)}
              placeholder="40.7128"
            />
            <TextField
              label="Longitude"
              name="lng"
              type="number"
              value={formData.lng?.toString() || ''}
              onChange={(e) => updateField('lng', e.target.value ? Number(e.target.value) : null)}
              placeholder="-74.0060"
            />
          </div>
        </FieldSection>

        <FieldSection
          title="Details"
          description="Cuisine, pricing, and status"
          icon={DollarSign}
        >
          <MultiInput
            label="Cuisine Tags"
            name="cuisine_tags"
            values={formData.cuisine_tags || []}
            onChange={(values) => updateField('cuisine_tags', values.length > 0 ? values : null)}
            placeholder="Type cuisine and press Enter"
            helperText="French, Italian, Japanese, etc."
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
            placeholder="Select price tier"
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
            label="Public Visibility"
            name="is_public"
            value={formData.is_public ? 'true' : 'false'}
            onChange={(e) => updateField('is_public', e.target.value === 'true')}
            options={[
              { value: 'true', label: 'Public (Visible on site)' },
              { value: 'false', label: 'Hidden' },
            ]}
            allowEmpty={false}
          />
        </FieldSection>

        <FieldSection
          title="Protection"
          description="Prevent automatic deletion during re-enrichment"
          icon={Shield}
        >
          <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="font-ui text-sm font-medium text-slate-900">Protected from enrichment</p>
              <p className="font-ui text-xs text-slate-500 mt-0.5">
                When enabled, this restaurant won&apos;t be deleted if the LLM doesn&apos;t find it during chef re-enrichment
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateField('protected', !(formData.protected ?? false))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-copper-500 focus:ring-offset-2 ${
                (formData.protected ?? false) ? 'bg-copper-500' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={formData.protected ?? false}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  (formData.protected ?? false) ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </FieldSection>

        <FieldSection
          title="Google Places Data"
          description="Google business information"
          icon={Star}
        >
          <TextField
            label="Google Place ID"
            name="google_place_id"
            value={formData.google_place_id || ''}
            onChange={(e) => updateField('google_place_id', e.target.value || null)}
            placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
          />
          <TextField
            label="Maps URL"
            name="maps_url"
            type="url"
            value={formData.maps_url || ''}
            onChange={(e) => updateField('maps_url', e.target.value || null)}
            placeholder="https://maps.google.com/..."
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Google Rating"
              name="google_rating"
              type="number"
              value={formData.google_rating?.toString() || ''}
              onChange={(e) => updateField('google_rating', e.target.value ? Number(e.target.value) : null)}
              placeholder="4.5"
              helperText="0-5 stars"
            />
            <TextField
              label="Google Review Count"
              name="google_review_count"
              type="number"
              value={formData.google_review_count?.toString() || ''}
              onChange={(e) => updateField('google_review_count', e.target.value ? Number(e.target.value) : null)}
              placeholder="1234"
            />
          </div>
          <TextField
            label="Michelin Stars"
            name="michelin_stars"
            type="number"
            value={formData.michelin_stars?.toString() || ''}
            onChange={(e) => updateField('michelin_stars', e.target.value ? Number(e.target.value) : null)}
            placeholder="1, 2, or 3"
            helperText="Leave empty if not Michelin starred"
          />
        </FieldSection>

        <FieldSection
          title="System Metadata"
          description="Internal tracking info"
          icon={Store}
        >
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="font-ui text-xs text-slate-500 mb-1">Created</p>
              <p className="font-mono text-sm text-slate-900">
                {new Date(restaurant.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="font-ui text-xs text-slate-500 mb-1">Last Verified</p>
              <p className="font-mono text-sm text-slate-900">
                {restaurant.last_verified_at ? new Date(restaurant.last_verified_at).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>
        </FieldSection>
      </div>
    </div>
  );
}
