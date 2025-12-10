'use client';

import { useState } from 'react';
import { Database } from '@/lib/database.types';
import { Search, Image, FileText, RefreshCw, Upload, Instagram, Grid, Edit } from 'lucide-react';
import Link from 'next/link';
import { PhotoUpload } from './PhotoUpload';
import { InstagramHandleModal } from './InstagramHandleModal';

type Chef = Database['public']['Tables']['chefs']['Row'];

export function ChefTable({ chefs }: { chefs: Chef[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChef, setSelectedChef] = useState<Chef | null>(null);
  const [instagramModalChef, setInstagramModalChef] = useState<Chef | null>(null);

  const filteredChefs = chefs.filter((chef) =>
    chef.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleReEnrichPhoto(chefId: string) {
    const res = await fetch('/api/admin/enrich-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chefId }),
    });

    if (res.ok) {
      window.location.reload();
    }
  }

  async function handleReEnrichBio(chefId: string) {
    const res = await fetch('/api/admin/enrich-bio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chefId }),
    });

    if (res.ok) {
      window.location.reload();
    }
  }

  return (
    <div>
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search chefs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[240px]">
                Chef
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[180px]">
                Photo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Bio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[180px]">
                Instagram
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-[280px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredChefs.map((chef) => (
              <tr key={chef.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{chef.name}</div>
                      <div className="text-sm text-slate-500">{chef.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {chef.photo_url && chef.photo_url.startsWith('https://') ? (
                      <>
                        <img
                          src={chef.photo_url}
                          alt={chef.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <span className="text-xs text-slate-500">{chef.photo_source}</span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-400">No photo</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-900 max-w-xs truncate">
                    {chef.mini_bio || (
                      <span className="text-slate-400">No bio</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {chef.instagram_handle ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://instagram.com/${chef.instagram_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-pink-600 hover:text-pink-800 flex items-center gap-1"
                      >
                        <Instagram className="w-4 h-4" />
                        @{chef.instagram_handle}
                      </a>
                      {chef.featured_instagram_post ? (
                        <span className="text-green-600" title="Featured post selected">✓</span>
                      ) : (
                        <span className="text-amber-500" title="No featured post">⚠</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">No handle</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/manage/chefs/${chef.id}`}
                      className="text-copper-600 hover:text-copper-900 p-2 rounded hover:bg-copper-50 transition-colors"
                      title="Edit all fields"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <a
                      href={`/admin/manage/instagram/${chef.id}`}
                      className={`p-2 rounded transition-colors ${
                        chef.featured_instagram_post
                          ? 'text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100'
                          : chef.instagram_handle
                          ? 'text-amber-600 hover:text-amber-900 bg-amber-50 hover:bg-amber-100'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                      title={
                        chef.featured_instagram_post
                          ? 'View/change Instagram post'
                          : chef.instagram_handle
                          ? 'Select Instagram post (none selected)'
                          : 'Select Instagram post (no handle)'
                      }
                    >
                      <Grid className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => setSelectedChef(chef)}
                      className="text-slate-600 hover:text-slate-900 p-2 rounded hover:bg-slate-100"
                      title="Upload photo"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setInstagramModalChef(chef)}
                      className="text-pink-600 hover:text-pink-900 p-2 rounded hover:bg-pink-50"
                      title="Edit Instagram handle"
                    >
                      <Instagram className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReEnrichPhoto(chef.id)}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50"
                      title="Re-enrich photo"
                    >
                      <Image className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReEnrichBio(chef.id)}
                      className="text-green-600 hover:text-green-900 p-2 rounded hover:bg-green-50"
                      title="Re-enrich bio"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedChef && (
        <PhotoUpload
          type="chef"
          itemId={selectedChef.id}
          itemName={selectedChef.name}
          currentPhotoUrl={selectedChef.photo_url}
          onClose={() => setSelectedChef(null)}
        />
      )}

      {instagramModalChef && (
        <InstagramHandleModal
          chef={instagramModalChef}
          onClose={() => setInstagramModalChef(null)}
          onSave={() => {
            setInstagramModalChef(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
