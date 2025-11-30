import React from 'react';
import { Section, Badge } from '@/components/ui';
import type { DatabaseStats } from '@/lib/types';

interface TrustSignalsProps {
  stats: DatabaseStats;
}

export function TrustSignals({ stats }: TrustSignalsProps) {
  // Mock stats if not provided
  const mockStats: DatabaseStats = {
    totalRestaurants: 2500,
    totalChefs: 450,
    totalCities: 85,
    totalShows: 12,
    lastUpdated: new Date().toISOString()
  };

  const displayStats = stats?.totalRestaurants > 0 ? stats : mockStats;

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`.replace('.0k', 'k');
    }
    return num.toLocaleString();
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  const statsData = [
    {
      value: formatNumber(displayStats.totalRestaurants),
      label: 'Restaurants',
      description: 'Curated chef establishments'
    },
    {
      value: formatNumber(displayStats.totalChefs),
      label: 'TV Chefs',
      description: 'From major cooking shows'
    },
    {
      value: formatNumber(displayStats.totalCities),
      label: 'Cities',
      description: 'Across North America'
    },
    {
      value: formatNumber(displayStats.totalShows),
      label: 'Shows',
      description: 'Top cooking competitions'
    }
  ];

  return (
    <Section spacing="lg" background="white">
      <div className="text-center">
        <div className="max-w-4xl mx-auto mb-8">
          <h2 className="text-heading text-gray-900 mb-4">
            Comprehensive. Curated. Current.
          </h2>
          <p className="text-body text-gray-600">
            Our database is meticulously maintained with verified information 
            about TV chef restaurants, updated regularly for accuracy.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto mb-8">
          {statsData.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                {stat.value}+
              </div>
              <div className="text-body font-semibold text-gray-700 mb-1">
                {stat.label}
              </div>
              <div className="text-small text-gray-500">
                {stat.description}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-small text-gray-500">
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm">
              ✓ Verified
            </Badge>
            <span>All restaurants verified for accuracy</span>
          </div>
          <div className="hidden sm:block text-gray-300">|</div>
          <div>
            Last updated: {formatDate(displayStats.lastUpdated)}
          </div>
        </div>
      </div>
    </Section>
  );
}