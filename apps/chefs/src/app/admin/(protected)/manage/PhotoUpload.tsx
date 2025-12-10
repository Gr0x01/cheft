'use client';

import { useState, useRef } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';

export function PhotoUpload({
  type,
  itemId,
  itemName,
  currentPhotoUrl,
  onClose,
}: {
  type: 'chef' | 'restaurant';
  itemId: string;
  itemName: string;
  currentPhotoUrl: string | null;
  onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('itemId', itemId);

    const res = await fetch('/api/admin/upload-photo', {
      method: 'POST',
      body: formData,
    });

    setUploading(false);

    if (res.ok) {
      window.location.reload();
    } else {
      alert('Upload failed');
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this photo?')) return;

    setDeleting(true);

    try {
      const res = await fetch('/api/admin/delete-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, itemId, photoUrl: currentPhotoUrl }),
      });

      const data = await res.json();
      console.log('[PhotoUpload] Delete response:', { status: res.status, data });

      setDeleting(false);

      if (res.ok) {
        window.location.reload();
      } else {
        console.error('[PhotoUpload] Delete failed:', data);
        alert(`Delete failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setDeleting(false);
      console.error('[PhotoUpload] Delete error:', error);
      alert('Delete failed: Network error');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Upload Photo: {itemName}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {currentPhotoUrl && currentPhotoUrl.startsWith('https://') && (
            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-2">Current Photo</p>
              <div className="relative">
                <img
                  src={currentPhotoUrl}
                  alt={itemName}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 cursor-pointer"
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-sm text-slate-600">
              Click to upload a new photo
            </p>
            <p className="text-xs text-slate-400 mt-1">
              JPG, PNG, or WebP (max 5MB)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />

          {uploading && (
            <p className="text-sm text-slate-600 mt-4 text-center">
              Uploading...
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
