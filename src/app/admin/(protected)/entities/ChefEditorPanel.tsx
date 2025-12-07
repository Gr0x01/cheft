'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import { Database } from '@/lib/database.types';
import { FieldSection } from '@/components/admin/forms/FieldSection';
import { TextField } from '@/components/admin/forms/TextField';
import { TextArea } from '@/components/admin/forms/TextArea';
import { SelectField } from '@/components/admin/forms/SelectField';
import { MultiInput } from '@/components/admin/forms/MultiInput';
import { toast } from 'sonner';
import { 
  User, 
  FileText, 
  Image, 
  Award, 
  BookOpen,
  ExternalLink,
  Store,
} from 'lucide-react';

type Chef = Database['public']['Tables']['chefs']['Row'];
type Restaurant = Database['public']['Tables']['restaurants']['Row'];

interface ChefEditorPanelProps {
  chef: Chef | null;
  restaurants?: Restaurant[];
  onDirtyChange?: (dirty: boolean) => void;
  onCreated?: (id: string) => void;
  isNew?: boolean;
}

export interface ChefEditorHandle {
  save: () => Promise<void>;
  discard: () => void;
  hasChanges: boolean;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

const emptyChef: Chef = {
  id: '',
  name: '',
  slug: '',
  mini_bio: null,
  career_narrative: null,
  country: null,
  current_role: null,
  mentor: null,
  photo_url: null,
  photo_source: null,
  instagram_handle: null,
  featured_instagram_post: null,
  james_beard_status: null,
  notable_awards: null,
  cookbook_titles: null,
  youtube_channel: null,
  enrichment_priority: null,
  manual_priority: null,
  social_links: null,
  last_verified_at: null,
  narrative_generated_at: null,
  created_at: '',
  updated_at: '',
};

export const ChefEditorPanel = forwardRef<ChefEditorHandle, ChefEditorPanelProps>(
  function ChefEditorPanel({ chef, restaurants = [], onDirtyChange, onCreated, isNew = false }, ref) {
  const router = useRouter();
  const [initialData, setInitialData] = useState<Chef>(chef || emptyChef);
  const [formData, setFormData] = useState<Chef>(chef || emptyChef);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chefRestaurants = chef ? restaurants.filter(r => r.chef_id === chef.id && r.is_public !== false) : [];

  const updateField = <K extends keyof Chef>(field: K, value: Chef[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const hasChanges = isNew || JSON.stringify(formData) !== JSON.stringify(initialData);

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      if (isNew) {
        if (!formData.name) {
          throw new Error('Name is required');
        }

        const response = await fetch('/api/admin/chefs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create chef');
        }

        const { chef: created } = await response.json();
        toast.success(`Created ${created.name}`);
        onCreated?.(created.id);
        router.refresh();
        return;
      }

      const response = await fetch('/api/admin/chefs/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chefId: initialData.id,
          updates: {
            name: formData.name,
            slug: formData.slug,
            mini_bio: formData.mini_bio,
            career_narrative: formData.career_narrative,
            country: formData.country,
            current_role: formData.current_role,
            mentor: formData.mentor,
            photo_url: formData.photo_url,
            instagram_handle: formData.instagram_handle,
            featured_instagram_post: formData.featured_instagram_post,
            james_beard_status: formData.james_beard_status,
            notable_awards: formData.notable_awards,
            cookbook_titles: formData.cookbook_titles,
            youtube_channel: formData.youtube_channel,
            enrichment_priority: formData.enrichment_priority,
            manual_priority: formData.manual_priority,
            updated_at: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update chef');
      }
      
      setInitialData({ ...formData });
      setFormData({ ...formData });
      onDirtyChange?.(false);
      
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setFormData({ ...initialData });
    setError(null);
  };

  useImperativeHandle(ref, () => ({
    save: handleSave,
    discard: handleDiscard,
    hasChanges,
  }), [hasChanges]);

  return (
    <div className="flex flex-col h-full">
      {!isNew && chef && (
        <div className="sticky top-0 z-10 bg-white border-b-2 border-stone-200 px-5 py-3">
          <div className="flex items-center gap-4">
            <a
              href={`/chefs/${chef.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-stone-400 hover:text-amber-600 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View Live
            </a>
          </div>
        </div>
      )}

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
          {!isNew && (
            <TextField
              label="Slug"
              name="slug"
              value={formData.slug}
              onChange={(e) => updateField('slug', e.target.value)}
              required
            />
          )}
          {isNew && formData.name && (
            <p className="font-mono text-[10px] text-stone-400">
              Slug: {generateSlug(formData.name)}
            </p>
          )}
          {!isNew && (
            <>
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
            </>
          )}
        </FieldSection>

        {!isNew && (
          <>
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
              <div>
                <TextField
                  label="Featured Instagram Post URL"
                  name="featured_instagram_post"
                  type="url"
                  value={formData.featured_instagram_post || ''}
                  onChange={(e) => updateField('featured_instagram_post', e.target.value || null)}
                  placeholder="https://www.instagram.com/p/..."
                />
                {formData.featured_instagram_post && (
                  <div className="flex justify-end">
                    <a
                      href={formData.featured_instagram_post}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-800 text-xs mt-1.5 transition-colors"
                    >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Preview on Instagram
                  </a>
                  </div>
                )}
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

            <FieldSection title="Restaurants" description="Linked establishments" icon={Store}>
              <div className="space-y-2">
                {chefRestaurants.length === 0 ? (
                  <p className="font-ui text-sm text-stone-400">No restaurants linked</p>
                ) : (
                  chefRestaurants.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-stone-50 border border-stone-200">
                      <div>
                        <div className="font-ui text-sm font-medium text-stone-900">{r.name}</div>
                        <div className="font-mono text-[10px] text-stone-500">
                          {r.city}{r.state ? `, ${r.state}` : ''}
                        </div>
                      </div>
                      <a
                        href={`/restaurants/${r.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-400 hover:text-amber-600"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))
                )}
                <p className="font-mono text-[10px] text-stone-400">
                  Use "+ Add" button with Restaurants tab to create new restaurants
                </p>
              </div>
            </FieldSection>
          </>
        )}
      </div>
    </div>
  );
});
