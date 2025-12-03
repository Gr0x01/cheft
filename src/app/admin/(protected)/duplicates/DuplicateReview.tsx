'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getStorageUrl } from '@/lib/utils/storage';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  address: string | null;
  google_place_id: string | null;
  google_rating: number | null;
  photo_urls: string[] | null;
  status: 'open' | 'closed' | 'unknown' | null;
  price_tier: string | null;
  website_url: string | null;
  chef_id: string;
}

interface DuplicateGroup {
  restaurants: Restaurant[];
  confidence: number;
  reasoning: string;
  similarity: number;
}

interface DuplicateReviewProps {
  groups: DuplicateGroup[];
}

function calculateDataScore(restaurant: Restaurant): number {
  let score = 0;
  if (restaurant.google_place_id) score += 10;
  if (restaurant.photo_urls && restaurant.photo_urls.length > 0) score += 5;
  if (restaurant.google_rating) score += 3;
  if (restaurant.website_url) score += 2;
  if (restaurant.status === 'open') score += 1;
  return score;
}

function RestaurantCard({ restaurant, score, isRecommended }: { 
  restaurant: Restaurant; 
  score: number;
  isRecommended: boolean;
}) {
  const photoUrl = getStorageUrl('restaurant-photos', restaurant.photo_urls?.[0]);

  return (
    <div className={`bg-white border-2 rounded-lg overflow-hidden ${
      isRecommended ? 'border-green-500' : 'border-slate-200'
    }`}>
      {isRecommended && (
        <div className="bg-green-500 text-white text-xs font-semibold px-3 py-1">
          ⭐ RECOMMENDED (Score: {score})
        </div>
      )}
      
      {photoUrl ? (
        <div className="relative w-full h-48 bg-gray-100">
          <Image
            src={photoUrl}
            alt={restaurant.name}
            fill
            className="object-cover"
            sizes="400px"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-slate-900 flex items-center justify-center">
          <svg className="w-16 h-16 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
        </div>
      )}

      <div className="p-4">
        <h3 className="font-bold text-lg text-slate-900 mb-2">{restaurant.name}</h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-slate-600">
              {restaurant.address || 'No address'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`font-medium ${
              restaurant.status === 'open' ? 'text-green-600' : 
              restaurant.status === 'closed' ? 'text-red-600' : 
              'text-slate-500'
            }`}>
              {restaurant.status?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>

          {restaurant.google_rating && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-slate-700">
                {restaurant.google_rating.toFixed(1)} rating
              </span>
            </div>
          )}

          {restaurant.price_tier && (
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-semibold">{restaurant.price_tier}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 mt-3">
            <div className="text-xs text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Google Place ID:</span>
                <span className={restaurant.google_place_id ? 'text-green-600' : 'text-red-600'}>
                  {restaurant.google_place_id ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Photos:</span>
                <span className={restaurant.photo_urls?.length ? 'text-green-600' : 'text-red-600'}>
                  {restaurant.photo_urls?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Website:</span>
                <span className={restaurant.website_url ? 'text-green-600' : 'text-red-600'}>
                  {restaurant.website_url ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DuplicateReview({ groups }: DuplicateReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [merging, setMerging] = useState(false);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());

  const currentGroup = groups[currentIndex];
  if (!currentGroup) return null;

  const [restaurant1, restaurant2] = currentGroup.restaurants;
  const score1 = calculateDataScore(restaurant1);
  const score2 = calculateDataScore(restaurant2);

  const handleMerge = async (winnerId: string, loserId: string) => {
    setMerging(true);
    try {
      const response = await fetch('/api/admin/duplicates/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerId, loserId }),
      });

      if (!response.ok) {
        throw new Error('Merge failed');
      }

      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error('Merge error:', error);
      alert('Failed to merge restaurants. Please try again.');
    } finally {
      setMerging(false);
    }
  };

  const handleKeepBoth = () => {
    setSkipped(prev => new Set([...prev, currentIndex]));
    setCurrentIndex(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const progress = ((currentIndex + 1) / groups.length) * 100;
  const remaining = groups.length - currentIndex - skipped.size;

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">
            Progress: {currentIndex + 1} of {groups.length}
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
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">AI Analysis</h3>
            <p className="text-sm text-slate-700">{currentGroup.reasoning}</p>
            <div className="mt-2 flex gap-4 text-xs text-slate-500">
              <span>Confidence: <strong>{(currentGroup.confidence * 100).toFixed(0)}%</strong></span>
              <span>Similarity: <strong>{(currentGroup.similarity * 100).toFixed(0)}%</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RestaurantCard 
          restaurant={restaurant1} 
          score={score1}
          isRecommended={score1 > score2}
        />
        <RestaurantCard 
          restaurant={restaurant2} 
          score={score2}
          isRecommended={score2 > score1}
        />
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={handleBack}
          disabled={currentIndex === 0}
          className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← Back
        </button>

        <button
          onClick={() => handleMerge(restaurant1.id, restaurant2.id)}
          disabled={merging}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {merging ? 'Merging...' : '← Keep Left'}
        </button>

        <button
          onClick={() => handleMerge(restaurant2.id, restaurant1.id)}
          disabled={merging}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {merging ? 'Merging...' : 'Keep Right →'}
        </button>

        <button
          onClick={handleKeepBoth}
          disabled={merging}
          className="px-6 py-3 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Keep Both
        </button>
      </div>

      {currentIndex >= groups.length - 1 && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-900 font-semibold">
            🎉 All duplicates reviewed! {skipped.size} pairs kept separate.
          </p>
        </div>
      )}
    </div>
  );
}
