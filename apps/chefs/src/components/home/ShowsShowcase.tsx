'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface Show {
  id: string;
  name: string;
  slug: string;
  network: string | null;
  chef_count: number;
  restaurant_count: number;
}

interface ShowsShowcaseProps {
  shows: Show[];
}

function ShowCard({ show, index }: { show: Show; index: number }) {
  return (
    <Link
      href={`/shows/${show.slug}`}
      className="shows-showcase-card"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="shows-showcase-card-accent" />
      <div className="shows-showcase-card-content">
        <div className="shows-showcase-card-header">
          {show.network && (
            <span className="shows-showcase-card-network">{show.network}</span>
          )}
          <h3 className="shows-showcase-card-name">{show.name}</h3>
        </div>
        <div className="shows-showcase-card-stats">
          <div className="shows-showcase-stat">
            <span className="shows-showcase-stat-value">{show.chef_count}</span>
            <span className="shows-showcase-stat-label">Chefs</span>
          </div>
          <div className="shows-showcase-stat">
            <span className="shows-showcase-stat-value">{show.restaurant_count}</span>
            <span className="shows-showcase-stat-label">Restaurants</span>
          </div>
        </div>
        <div className="shows-showcase-card-cta">
          <span>Explore</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

export function ShowsShowcase({ shows }: ShowsShowcaseProps) {
  if (shows.length === 0) return null;

  const sortedShows = [...shows].sort((a, b) => {
    if (a.slug === 'top-chef') return -1;
    if (b.slug === 'top-chef') return 1;
    return (b.chef_count + b.restaurant_count) - (a.chef_count + a.restaurant_count);
  });

  return (
    <section className="shows-showcase">
      <div className="shows-showcase-container">
        <div className="shows-showcase-header">
          <div className="shows-showcase-title-group">
            <h2 className="shows-showcase-title">Browse by Show</h2>
          </div>
          <Link href="/shows" className="shows-showcase-view-all">
            <span>All Shows</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="shows-showcase-grid">
          {sortedShows.slice(0, 4).map((show, index) => (
            <ShowCard key={show.id} show={show} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
