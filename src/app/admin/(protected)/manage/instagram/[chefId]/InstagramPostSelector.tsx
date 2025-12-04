'use client';

import { useState } from 'react';
import { Instagram, Plus, Check, X, ExternalLink } from 'lucide-react';
import { Database } from '@/lib/database.types';
import { InstagramEmbed } from '@/components/chef/InstagramEmbed';
import { getAuthHeaders } from '@/lib/supabase/client-auth';

interface Chef {
  id: string;
  name: string;
  instagram_handle: string | null;
  featured_instagram_post: string | null;
}

interface InstagramPostSelectorProps {
  chef: Chef;
}

interface PostPreview {
  url: string;
  id: string;
}

export function InstagramPostSelector({ chef }: InstagramPostSelectorProps) {
  const initialPostPreviews = chef.featured_instagram_post
    ? [{
        url: chef.featured_instagram_post,
        id: chef.featured_instagram_post.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/)?.[2] || '',
      }].filter(p => p.id)
    : [];

  const [instagramHandle, setInstagramHandle] = useState(chef.instagram_handle || '');
  const [postUrlInput, setPostUrlInput] = useState('');
  const [postPreviews, setPostPreviews] = useState<PostPreview[]>(initialPostPreviews);
  const [selectedPostUrl, setSelectedPostUrl] = useState<string | null>(chef.featured_instagram_post);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function validateInstagramHandle(handle: string): boolean {
    if (!handle) return true;
    const cleaned = handle.replace(/^@/, '').trim();
    return /^[a-zA-Z0-9._]{1,30}$/.test(cleaned);
  }

  function validatePostUrl(url: string): boolean {
    return /^https:\/\/www\.instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(url.trim());
  }

  function addPostPreview() {
    const trimmedUrl = postUrlInput.trim();
    
    if (!trimmedUrl) {
      setError('Please enter an Instagram post URL');
      return;
    }

    if (!validatePostUrl(trimmedUrl)) {
      setError('Invalid Instagram post URL. Expected format: https://www.instagram.com/p/POST_ID/');
      return;
    }

    const postId = trimmedUrl.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/)?.[2];
    if (!postId) {
      setError('Could not extract post ID from URL');
      return;
    }

    if (postPreviews.some(p => p.id === postId)) {
      setError('This post has already been added');
      return;
    }

    setPostPreviews([...postPreviews, { url: trimmedUrl, id: postId }]);
    setPostUrlInput('');
    setError('');
  }

  function removePostPreview(postId: string) {
    setPostPreviews(postPreviews.filter(p => p.id !== postId));
    if (selectedPostUrl === postPreviews.find(p => p.id === postId)?.url) {
      setSelectedPostUrl(null);
    }
  }

  async function saveChanges() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const cleanedHandle = instagramHandle.replace(/^@/, '').trim() || null;
      
      if (cleanedHandle && !validateInstagramHandle(cleanedHandle)) {
        setError('Invalid Instagram handle');
        setSaving(false);
        return;
      }

      const headers = await getAuthHeaders();

      if (cleanedHandle !== chef.instagram_handle) {
        const handleRes = await fetch(`/api/admin/chefs/${chef.id}/instagram`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ instagramHandle: cleanedHandle }),
        });

        if (!handleRes.ok) {
          const data = await handleRes.json();
          throw new Error(data.error || 'Failed to update Instagram handle');
        }
      }

      const postRes = await fetch(`/api/admin/chefs/${chef.id}/featured-post`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ featuredInstagramPost: selectedPostUrl }),
      });

      if (!postRes.ok) {
        const data = await postRes.json();
        throw new Error(data.error || 'Failed to update featured post');
      }

      setSuccess('Changes saved successfully!');
      setTimeout(() => {
        window.location.href = '/admin/manage';
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Select Instagram Post for {chef.name}
        </h1>
        <p className="text-slate-600">
          Set the Instagram handle and choose a post to display on the chef's profile page
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Instagram className="w-5 h-5 text-pink-600" />
          Instagram Handle
        </h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
              <input
                type="text"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="username"
                className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            {instagramHandle && (
              <a
                href={`https://instagram.com/${instagramHandle.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-pink-600 hover:text-pink-800 mt-2 inline-flex items-center gap-1"
              >
                View profile
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Instagram Posts</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={postUrlInput}
            onChange={(e) => setPostUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPostPreview()}
            placeholder="https://www.instagram.com/p/POST_ID/"
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <button
            onClick={addPostPreview}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Paste Instagram post URLs to preview them. Click a post to select it as the featured image.
        </p>
      </div>

      {postPreviews.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Preview Posts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {postPreviews.map((post) => (
              <div
                key={post.id}
                className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                  selectedPostUrl === post.url
                    ? 'border-pink-600 ring-2 ring-pink-200'
                    : 'border-slate-200 hover:border-pink-300'
                }`}
              >
                <div className="aspect-square bg-slate-50">
                  <InstagramEmbed postUrl={post.url} className="w-full h-full" />
                </div>
                <div 
                  className="absolute inset-0 cursor-pointer"
                  onClick={() => setSelectedPostUrl(selectedPostUrl === post.url ? null : post.url)}
                  title="Click to select/deselect"
                />
                {selectedPostUrl === post.url && (
                  <div className="absolute top-2 right-2 bg-pink-600 text-white rounded-full p-2">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePostPreview(post.id);
                  }}
                  className="absolute top-2 left-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => window.location.href = '/admin/manage'}
          className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={saveChanges}
          disabled={saving}
          className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
