'use client';

import { Image, FileText, MapPin, Star } from 'lucide-react';
import { CompletenessChart } from '@/components/admin/data-quality/CompletenessChart';
import { QuickFixButton } from '@/components/admin/data-quality/QuickFixButton';
import { DrillDownModal } from '@/components/admin/data-quality/DrillDownModal';
import { useState } from 'react';

type ChefPreview = {
  id: string;
  name: string;
  slug: string;
};

type RestaurantPreview = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
};

interface DataStats {
  chefs: {
    total: number;
    withPhotos: number;
    withBios: number;
  };
  restaurants: {
    total: number;
    withPhotos: number;
    withRatings: number;
    withPlaceIds: number;
  };
}

interface MissingData {
  chefsNoPhotos: ChefPreview[];
  chefsNoBios: ChefPreview[];
  restaurantsNoPlaces: RestaurantPreview[];
}

interface DataDashboardClientProps {
  stats: DataStats;
  missing: MissingData;
}

export function DataDashboardClient({ stats, missing }: DataDashboardClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    entities: (ChefPreview | RestaurantPreview)[];
    type: 'chef' | 'restaurant';
  }>({ title: '', entities: [], type: 'chef' });

  const handleDrillDown = (type: 'photos' | 'bios' | 'places') => {
    if (type === 'photos') {
      setModalData({
        title: 'Chefs Missing Photos',
        entities: missing.chefsNoPhotos,
        type: 'chef',
      });
    } else if (type === 'bios') {
      setModalData({
        title: 'Chefs Missing Bios',
        entities: missing.chefsNoBios,
        type: 'chef',
      });
    } else if (type === 'places') {
      setModalData({
        title: 'Restaurants Missing Google Places',
        entities: missing.restaurantsNoPlaces,
        type: 'restaurant',
      });
    }
    setModalOpen(true);
  };

  const handleQuickFix = async () => {
    console.log('Quick fix triggered - enrichment job would be created here');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="bg-gradient-to-r from-copper-500 to-copper-600 rounded-2xl shadow-xl shadow-copper-500/30 p-8 text-white mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="font-display text-4xl font-black tracking-tight drop-shadow-lg">
            Data Quality Dashboard
          </h1>
          <p className="font-mono text-sm uppercase tracking-widest text-copper-100 mt-2 drop-shadow-md">
            Track Completeness · Identify Gaps · Take Action
          </p>
        </div>
      </div>

      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-copper-500 rounded-full" />
          <h2 className="font-display text-xl font-bold text-slate-900">Chef Data</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CompletenessChart
            icon={Image}
            label="Chefs with Photos"
            value={stats.chefs.withPhotos}
            total={stats.chefs.total}
            color="blue"
            onDrillDown={() => handleDrillDown('photos')}
          />
          <CompletenessChart
            icon={FileText}
            label="Chefs with Bios"
            value={stats.chefs.withBios}
            total={stats.chefs.total}
            color="green"
            onDrillDown={() => handleDrillDown('bios')}
          />
        </div>
      </div>

      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-copper-500 rounded-full" />
          <h2 className="font-display text-xl font-bold text-slate-900">Restaurant Data</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CompletenessChart
            icon={MapPin}
            label="Google Places Linked"
            value={stats.restaurants.withPlaceIds}
            total={stats.restaurants.total}
            color="copper"
            onDrillDown={() => handleDrillDown('places')}
          />
          <CompletenessChart
            icon={Star}
            label="Restaurants with Ratings"
            value={stats.restaurants.withRatings}
            total={stats.restaurants.total}
            color="green"
          />
          <CompletenessChart
            icon={Image}
            label="Restaurants with Photos"
            value={stats.restaurants.withPhotos}
            total={stats.restaurants.total}
            color="blue"
          />
        </div>
      </div>

      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-copper-500 rounded-full" />
          <h2 className="font-display text-xl font-bold text-slate-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickFixButton
            label="Enrich Missing Photos"
            count={stats.chefs.total - stats.chefs.withPhotos}
            estimatedCost={0.05}
            onTrigger={handleQuickFix}
          />
          <QuickFixButton
            label="Enrich Missing Bios"
            count={stats.chefs.total - stats.chefs.withBios}
            estimatedCost={0.10}
            onTrigger={handleQuickFix}
          />
          <QuickFixButton
            label="Link Google Places"
            count={stats.restaurants.total - stats.restaurants.withPlaceIds}
            estimatedCost={0.03}
            onTrigger={handleQuickFix}
          />
        </div>
      </div>

      <DrillDownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        entities={modalData.entities}
        entityType={modalData.type}
      />
    </div>
  );
}
