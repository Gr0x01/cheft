'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/client';
import { FieldSection } from '@/components/admin/forms/FieldSection';
import { TextField } from '@/components/admin/forms/TextField';
import { TextArea } from '@/components/admin/forms/TextArea';
import { SelectField } from '@/components/admin/forms/SelectField';
import { MultiInput } from '@/components/admin/forms/MultiInput';
import { 
  User, 
  FileText, 
  Image, 
  Award, 
  BookOpen, 
  Youtube,
  Save,
  X,
  ExternalLink,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

type Chef = Database['public']['Tables']['chefs']['Row'];

interface ChefEditorFormProps {
  chef: Chef;
}

function sanitizeForDisplay(text: string | null): string {
  if (!text) return '';
  return text.replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'));
}

export function ChefEditorForm({ chef }: ChefEditorFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [formData, setFormData] = useState<Chef>(chef);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof Chef>(field: K, value: Chef[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('chefs')
        .update({
          name: formData.name,
          slug: formData.slug,
          mini_bio: formData.mini_bio,
          career_narrative: formData.career_narrative,
          country: formData.country,
          current_role: formData.current_role,
          mentor: formData.mentor,
          photo_url: formData.photo_url,
          instagram_handle: formData.instagram_handle,
          james_beard_status: formData.james_beard_status,
          notable_awards: formData.notable_awards,
          cookbook_titles: formData.cookbook_titles,
          youtube_channel: formData.youtube_channel,
          enrichment_priority: formData.enrichment_priority,
          manual_priority: formData.manual_priority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chef.id);

      if (updateError) throw updateError;

      alert('Chef updated successfully!');
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
      setFormData(chef);
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
                Edit Chef
              </h1>
              <p className="font-mono text-sm uppercase tracking-widest text-copper-100 mt-2 drop-shadow-md">
                {sanitizeForDisplay(formData.name)}
              </p>
            </div>
            <a
              href={`/chefs/${chef.slug}`}
              target="_blank"
              rel="noopener noreferrer"
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
            {JSON.stringify(formData) !== JSON.stringify(chef) ? (
              <span className="text-amber-600 font-medium">• Unsaved changes</span>
            ) : (
              <span>All changes saved</span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDiscard}
              disabled={saving || JSON.stringify(formData) === JSON.stringify(chef)}
              className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-ui font-medium"
            >
              <X className="w-4 h-4" />
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving || JSON.stringify(formData) === JSON.stringify(chef)}
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
          description="Basic chef information"
          icon={User}
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
            helperText="URL-friendly identifier (e.g., gordon-ramsay)"
          />
          <TextField
            label="Country"
            name="country"
            value={formData.country || ''}
            onChange={(e) => updateField('country', e.target.value || null)}
            placeholder="USA, France, Japan, etc."
          />
          <TextField
            label="Current Role"
            name="current_role"
            value={formData.current_role || ''}
            onChange={(e) => updateField('current_role', e.target.value || null)}
            placeholder="Executive Chef, Owner, etc."
          />
          <TextField
            label="Mentor"
            name="mentor"
            value={formData.mentor || ''}
            onChange={(e) => updateField('mentor', e.target.value || null)}
            placeholder="Chef who mentored this person"
          />
        </FieldSection>

        <FieldSection
          title="Biography"
          description="Chef's story and background"
          icon={FileText}
        >
          <TextArea
            label="Mini Bio"
            name="mini_bio"
            value={formData.mini_bio || ''}
            onChange={(e) => updateField('mini_bio', e.target.value || null)}
            rows={3}
            minLength={10}
            maxLength={500}
            helperText="Short bio for card previews (10-500 characters)"
          />
          <TextArea
            label="Career Narrative"
            name="career_narrative"
            value={formData.career_narrative || ''}
            onChange={(e) => updateField('career_narrative', e.target.value || null)}
            rows={8}
            helperText="Full career story for chef detail page"
          />
        </FieldSection>

        <FieldSection
          title="Media & Social"
          description="Photos and social media links"
          icon={Image}
        >
          <TextField
            label="Photo URL"
            name="photo_url"
            type="url"
            value={formData.photo_url || ''}
            onChange={(e) => updateField('photo_url', e.target.value || null)}
            placeholder="https://..."
          />
          <TextField
            label="Instagram Handle"
            name="instagram_handle"
            value={formData.instagram_handle || ''}
            onChange={(e) => updateField('instagram_handle', e.target.value || null)}
            placeholder="gordonramsay (without @)"
          />
          <TextField
            label="YouTube Channel"
            name="youtube_channel"
            type="url"
            value={formData.youtube_channel || ''}
            onChange={(e) => updateField('youtube_channel', e.target.value || null)}
            placeholder="https://youtube.com/@..."
          />
        </FieldSection>

        <FieldSection
          title="Accolades & Awards"
          description="Recognition and achievements"
          icon={Award}
        >
          <SelectField
            label="James Beard Status"
            name="james_beard_status"
            value={formData.james_beard_status || ''}
            onChange={(e) => updateField('james_beard_status', (e.target.value || null) as Chef['james_beard_status'])}
            options={[
              { value: 'winner', label: 'Winner' },
              { value: 'nominated', label: 'Nominated' },
              { value: 'semifinalist', label: 'Semifinalist' },
            ]}
            placeholder="Select status"
          />
          <MultiInput
            label="Notable Awards"
            name="notable_awards"
            values={formData.notable_awards || []}
            onChange={(values) => updateField('notable_awards', values.length > 0 ? values : null)}
            placeholder="Type award and press Enter"
            helperText="Michelin stars, James Beard, regional awards, etc."
          />
        </FieldSection>

        <FieldSection
          title="Publications"
          description="Cookbooks and written works"
          icon={BookOpen}
        >
          <MultiInput
            label="Cookbook Titles"
            name="cookbook_titles"
            values={formData.cookbook_titles || []}
            onChange={(values) => updateField('cookbook_titles', values.length > 0 ? values : null)}
            placeholder="Type cookbook title and press Enter"
          />
        </FieldSection>

        <FieldSection
          title="System Metadata"
          description="Internal enrichment settings"
          icon={Youtube}
        >
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Enrichment Priority"
              name="enrichment_priority"
              type="number"
              value={formData.enrichment_priority?.toString() || ''}
              onChange={(e) => updateField('enrichment_priority', e.target.value ? Number(e.target.value) : null)}
              helperText="Higher = refreshed more frequently"
            />
            <SelectField
              label="Manual Priority"
              name="manual_priority"
              value={formData.manual_priority ? 'true' : 'false'}
              onChange={(e) => updateField('manual_priority', e.target.value === 'true')}
              options={[
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ]}
              allowEmpty={false}
              helperText="Force high priority"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div>
              <p className="font-ui text-xs text-slate-500 mb-1">Created</p>
              <p className="font-mono text-sm text-slate-900">
                {new Date(chef.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="font-ui text-xs text-slate-500 mb-1">Last Updated</p>
              <p className="font-mono text-sm text-slate-900">
                {new Date(chef.updated_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="font-ui text-xs text-slate-500 mb-1">Last Verified</p>
              <p className="font-mono text-sm text-slate-900">
                {chef.last_verified_at ? new Date(chef.last_verified_at).toLocaleDateString() : 'Never'}
              </p>
            </div>
            <div>
              <p className="font-ui text-xs text-slate-500 mb-1">Narrative Generated</p>
              <p className="font-mono text-sm text-slate-900">
                {chef.narrative_generated_at ? new Date(chef.narrative_generated_at).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>
        </FieldSection>
      </div>
    </div>
  );
}
