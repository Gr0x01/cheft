'use client';

import { useState } from 'react';
import { X, Instagram, ExternalLink } from 'lucide-react';
import { Database } from '@/lib/database.types';
import { getAuthHeaders } from '@/lib/supabase/client-auth';

type Chef = Database['public']['Tables']['chefs']['Row'];

export function InstagramHandleModal({
  chef,
  onClose,
  onSave,
}: {
  chef: Chef;
  onClose: () => void;
  onSave: () => void;
}) {
  const [handle, setHandle] = useState(chef.instagram_handle || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function validateHandle(value: string): boolean {
    if (!value) return true;
    const cleaned = value.replace(/^@/, '').trim();
    return /^[a-zA-Z0-9._]{1,30}$/.test(cleaned);
  }

  function handleInputChange(value: string) {
    setHandle(value);
    if (value && !validateHandle(value)) {
      setError('Invalid Instagram handle. Use only letters, numbers, dots, and underscores (1-30 characters).');
    } else {
      setError('');
    }
  }

  async function handleSave() {
    const cleaned = handle.replace(/^@/, '').trim() || null;
    
    if (cleaned && !validateHandle(cleaned)) {
      setError('Invalid Instagram handle');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/chefs/${chef.id}/instagram`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ instagramHandle: cleaned }),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
        setSaving(false);
      }
    } catch (err) {
      setError('Network error');
      setSaving(false);
    }
  }

  const cleanedHandle = handle.replace(/^@/, '').trim();
  const previewUrl = cleanedHandle ? `https://instagram.com/${cleanedHandle}` : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-600" />
            Edit Instagram Handle
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Chef: {chef.name}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Instagram Handle
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                @
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="username"
                className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                  error ? 'border-red-500' : 'border-slate-300'
                }`}
              />
            </div>
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Enter username only (@ symbol is optional)
            </p>
          </div>

          {previewUrl && !error && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Preview:</p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-pink-600 hover:text-pink-800 flex items-center gap-2"
              >
                <Instagram className="w-4 h-4" />
                instagram.com/{cleanedHandle}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !!error}
            className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
