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
      <div className="sticky top-0 z-10 bg-white border-b-2 border-stone-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href={`/chefs/${chef.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-stone-400 hover:text-copper-600 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View Live
            </a>
            {hasChanges && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-amber-600">Unsaved</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscard}
              disabled={saving || !hasChanges}
              className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 text-stone-500 hover:text-stone-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-4 py-1.5 bg-copper-600 hover:bg-copper-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 bg-red-50 border-2 border-red-200 p-3">
          <p className="font-mono text-xs text-red-700">{error}</p>
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
          <div className="space-y-2">
            <TextField
              label="Instagram"
              name="instagram_handle"
              value={formData.instagram_handle || ''}
              onChange={(e) => updateField('instagram_handle', e.target.value || null)}
              placeholder="handle (no @)"
            />
            {chef.featured_instagram_post && (() => {
              const postId = chef.featured_instagram_post.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/)?.[2];
              return (
                <a 
                  href={chef.featured_instagram_post}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 bg-stone-100 hover:bg-stone-200 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">Featured Post</p>
                    <p className="font-mono text-xs text-stone-600">{postId}</p>
                  </div>
                </a>
              );
            })()}
          </div>
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
