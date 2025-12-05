'use client';

import { useState, useEffect } from 'react';
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
  Save,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';

type Chef = Database['public']['Tables']['chefs']['Row'];

interface ChefEditorPanelProps {
  chef: Chef;
  onDirtyChange?: (dirty: boolean) => void;
}

export function ChefEditorPanel({ chef, onDirtyChange }: ChefEditorPanelProps) {
  const router = useRouter();
  const supabase = createClient();
  const [formData, setFormData] = useState<Chef>(chef);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof Chef>(field: K, value: Chef[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(chef);

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

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
      router.refresh();
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setFormData(chef);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href={`/chefs/${chef.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-copper-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Live
            </a>
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
        <FieldSection title="Identity" description="Basic info" icon={User} defaultOpen>
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
          <TextField
            label="Country"
            name="country"
            value={formData.country || ''}
            onChange={(e) => updateField('country', e.target.value || null)}
          />
          <TextField
            label="Current Role"
            name="current_role"
            value={formData.current_role || ''}
            onChange={(e) => updateField('current_role', e.target.value || null)}
          />
          <TextField
            label="Mentor"
            name="mentor"
            value={formData.mentor || ''}
            onChange={(e) => updateField('mentor', e.target.value || null)}
          />
        </FieldSection>

        <FieldSection title="Biography" description="Story and background" icon={FileText}>
          <TextArea
            label="Mini Bio"
            name="mini_bio"
            value={formData.mini_bio || ''}
            onChange={(e) => updateField('mini_bio', e.target.value || null)}
            rows={3}
            maxLength={500}
          />
          <TextArea
            label="Career Narrative"
            name="career_narrative"
            value={formData.career_narrative || ''}
            onChange={(e) => updateField('career_narrative', e.target.value || null)}
            rows={6}
          />
        </FieldSection>

        <FieldSection title="Media" description="Photos and social" icon={Image}>
          <TextField
            label="Photo URL"
            name="photo_url"
            type="url"
            value={formData.photo_url || ''}
            onChange={(e) => updateField('photo_url', e.target.value || null)}
          />
          <TextField
            label="Instagram"
            name="instagram_handle"
            value={formData.instagram_handle || ''}
            onChange={(e) => updateField('instagram_handle', e.target.value || null)}
            placeholder="handle (no @)"
          />
          {chef.featured_instagram_post && (
            <div className="space-y-2">
              <label className="block font-ui text-sm font-medium text-slate-700">
                Featured Instagram Post
              </label>
              <div className="rounded-lg overflow-hidden border border-slate-200">
                <img
                  src={chef.featured_instagram_post}
                  alt="Featured Instagram post"
                  className="w-full h-48 object-cover"
                />
              </div>
              <p className="font-mono text-xs text-slate-500 truncate">
                {chef.featured_instagram_post}
              </p>
            </div>
          )}
          <TextField
            label="YouTube Channel"
            name="youtube_channel"
            type="url"
            value={formData.youtube_channel || ''}
            onChange={(e) => updateField('youtube_channel', e.target.value || null)}
          />
        </FieldSection>

        <FieldSection title="Accolades" description="Awards and recognition" icon={Award}>
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
        </FieldSection>

        <FieldSection title="Publications" description="Books and written works" icon={BookOpen}>
          <MultiInput
            label="Cookbook Titles"
            name="cookbook_titles"
            values={formData.cookbook_titles || []}
            onChange={(values) => updateField('cookbook_titles', values.length > 0 ? values : null)}
            placeholder="Add cookbook"
          />
        </FieldSection>
      </div>
    </div>
  );
}
