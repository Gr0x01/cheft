'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getStorageUrl } from '@/lib/utils/storage';
import type { DuplicateGroup } from './DuplicatesSection';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  address: string | null;
  google_place_id: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  photo_urls: string[] | null;
  status: 'open' | 'closed' | 'unknown' | null;
  price_tier: string | null;
  website_url: string | null;
  chef_id: string;
}

interface DuplicateReviewClientProps {
  groups: DuplicateGroup[];
}

function calculateDataScore(restaurant: Restaurant): number {
  let score = 0;
  if (restaurant.google_place_id) score += 10;
  if (restaurant.photo_urls && restaurant.photo_urls.length > 0) score += 5;
  if (restaurant.google_rating) score += 3;
  if (restaurant.google_review_count && restaurant.google_review_count > 10) score += 2;
  if (restaurant.website_url) score += 2;
  if (restaurant.status === 'open') score += 1;
  return score;
}

function RestaurantCard({ 
  restaurant, 
  score, 
  isRecommended,
  isSelected,
  onToggle 
}: { 
  restaurant: Restaurant; 
  score: number;
  isRecommended: boolean;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const photoUrl = getStorageUrl('restaurant-photos', restaurant.photo_urls?.[0]);

  return (
    <div 
      onClick={onToggle}
      className={`bg-white border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'border-orange-500 ring-2 ring-orange-200' : 
        isRecommended ? 'border-green-500' : 'border-slate-200'
      } hover:shadow-md`}
    >
      {(isRecommended || isSelected) && (
        <div className={`${
          isSelected ? 'bg-orange-500' : 'bg-green-500'
        } text-white text-xs font-semibold px-3 py-1 flex items-center justify-between`}>
          <span>
            {isSelected && '✓ SELECTED'}
            {!isSelected && isRecommended && `⭐ RECOMMENDED (Score: ${score})`}
          </span>
        </div>
      )}
      
      {photoUrl ? (
        <div className="relative w-full h-40 bg-gray-100">
          <Image
            src={photoUrl}
            alt={restaurant.name}
            fill
            className="object-cover"
            sizes="300px"
          />
        </div>
      ) : (
        <div className="w-full h-40 bg-slate-900 flex items-center justify-center">
          <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
        </div>
      )}

      <div className="p-3">
        <h3 className="font-bold text-base text-slate-900 mb-2">{restaurant.name}</h3>
        
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-slate-600 truncate">
              {restaurant.address || 'No address'}
            </span>
          </div>

          {restaurant.google_rating && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-slate-700">
                {restaurant.google_rating.toFixed(1)} ({restaurant.google_review_count || 0} reviews)
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className={`font-medium text-xs px-1.5 py-0.5 rounded ${
              restaurant.status === 'open' ? 'bg-green-100 text-green-700' : 
              restaurant.status === 'closed' ? 'bg-red-100 text-red-700' : 
              'bg-slate-100 text-slate-600'
            }`}>
              {restaurant.status?.toUpperCase() || 'UNKNOWN'}
            </span>
            {restaurant.google_place_id && (
              <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">✓ Google</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DuplicateReviewClient({ groups }: DuplicateReviewClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());

  const currentGroup = groups[currentIndex];
  if (!currentGroup) return null;

  const scores = new Map(currentGroup.restaurants.map(r => [r.id, calculateDataScore(r)]));
  const maxScore = Math.max(...Array.from(scores.values()));
  
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMerge = async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one restaurant to keep');
      return;
    }

    setMerging(true);
    try {
      const keeperIds = Array.from(selectedIds);
      const loserIds = currentGroup.restaurants
        .filter(r => !selectedIds.has(r.id))
        .map(r => r.id);

      const response = await fetch('/api/admin/duplicates/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          groupId: currentGroup.group_id,
          keeperIds, 
          loserIds 
        }),
      });

      if (!response.ok) {
        throw new Error('Merge failed');
      }

      setSelectedIds(new Set());
      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error('Merge error:', error);
      alert('Failed to merge restaurants. Please try again.');
    } finally {
      setMerging(false);
    }
  };

  const handleKeepAll = () => {
    setSkipped(prev => new Set([...prev, currentIndex]));
    setSelectedIds(new Set());
    setCurrentIndex(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setSelectedIds(new Set());
      setCurrentIndex(prev => prev - 1);
    }
  };

  const selectRecommended = () => {
    const bestRestaurants = currentGroup.restaurants.filter(r => scores.get(r.id) === maxScore);
    setSelectedIds(new Set(bestRestaurants.map(r => r.id)));
  };

  const progress = ((currentIndex + 1) / groups.length) * 100;
  const remaining = groups.length - currentIndex - skipped.size;

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">
            Progress: {currentIndex + 1} of {groups.length} groups
          </span>
          <span className="text-sm text-slate-500">
            {remaining} remaining
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-1">
              {currentGroup.restaurants.length} Potential Duplicates Found
            </h3>
            <p className="text-sm text-slate-700 mb-2">
              Click on restaurant cards to select which ones to keep. You can keep multiple if they're actually different locations.
            </p>
            <div className="flex gap-4 text-xs text-slate-500">
              <span>Max Confidence: <strong>{(currentGroup.maxConfidence * 100).toFixed(0)}%</strong></span>
              <span>Restaurants in group: <strong>{currentGroup.restaurants.length}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className={`grid gap-4 mb-6 ${
        currentGroup.restaurants.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
        currentGroup.restaurants.length === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      }`}>
        {currentGroup.restaurants.map(restaurant => (
          <RestaurantCard 
            key={restaurant.id}
            restaurant={restaurant} 
            score={scores.get(restaurant.id)!}
            isRecommended={scores.get(restaurant.id) === maxScore}
            isSelected={selectedIds.has(restaurant.id)}
            onToggle={() => toggleSelection(restaurant.id)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleBack}
            disabled={currentIndex === 0 || merging}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Back
          </button>

          <button
            onClick={selectRecommended}
            disabled={merging}
            className="px-6 py-3 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ⭐ Select Recommended
          </button>

          <button
            onClick={handleMerge}
            disabled={merging || selectedIds.size === 0}
            className="px-8 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {merging ? 'Merging...' : `Merge (Keep ${selectedIds.size})`}
          </button>

          <button
            onClick={handleKeepAll}
            disabled={merging}
            className="px-6 py-3 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Keep All
          </button>
        </div>
        
        <div className="text-center text-sm text-slate-500">
          {selectedIds.size === 0 && 'Click restaurant cards to select which ones to keep'}
          {selectedIds.size > 0 && `${selectedIds.size} selected • ${currentGroup.restaurants.length - selectedIds.size} will be hidden`}
        </div>
      </div>

      {currentIndex >= groups.length - 1 && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-900 font-semibold">
            🎉 All duplicate groups reviewed! {skipped.size} groups kept separate.
          </p>
        </div>
      )}
    </div>
  );
}
