'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { getStorageUrl } from '@/lib/utils/storage';

interface PhotoGalleryModalProps {
  photos: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  restaurantName: string;
}

export function PhotoGalleryModal({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  restaurantName,
}: PhotoGalleryModalProps) {
  const handlePrevious = useCallback(() => {
    onNavigate(currentIndex === 0 ? photos.length - 1 : currentIndex - 1);
  }, [currentIndex, photos.length, onNavigate]);

  const handleNext = useCallback(() => {
    onNavigate(currentIndex === photos.length - 1 ? 0 : currentIndex + 1);
  }, [currentIndex, photos.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, handlePrevious, handleNext]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.95)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 transition-colors hover:bg-white/10"
        aria-label="Close gallery"
      >
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 relative flex items-center justify-center p-4">
          {photos.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 z-10 p-3 transition-all hover:scale-110"
                style={{ background: 'var(--accent-primary)' }}
                aria-label="Previous photo"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 z-10 p-3 transition-all hover:scale-110"
                style={{ background: 'var(--accent-primary)' }}
                aria-label="Next photo"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div className="relative w-full h-full max-w-6xl max-h-[80vh]">
            <Image
              src={getStorageUrl('restaurant-photos', photos[currentIndex])!}
              alt={`${restaurantName} - Photo ${currentIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="font-mono text-sm text-white">
                {currentIndex + 1} / {photos.length}
              </span>
            </div>
            
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
                {photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => onNavigate(index)}
                    className={`relative flex-shrink-0 w-20 h-20 transition-all ${
                      index === currentIndex ? 'ring-4 ring-blue-500 scale-110' : 'opacity-50 hover:opacity-100'
                    }`}
                    aria-label={`View photo ${index + 1}`}
                    aria-current={index === currentIndex ? 'true' : 'false'}
                  >
                    <Image
                      src={getStorageUrl('restaurant-photos', photo)!}
                      alt={`${restaurantName} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
