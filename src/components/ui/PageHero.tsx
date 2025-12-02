import { ReactNode } from 'react';
import { Breadcrumbs } from '../seo/Breadcrumbs';

interface Stat {
  value: number | string | null;
  label: string;
}

interface PageHeroProps {
  title: string;
  subtitle?: string;
  stats?: Stat[];
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  children?: ReactNode;
}

export function PageHero({ title, subtitle, stats, breadcrumbItems, children }: PageHeroProps) {
  return (
    <section 
      className="relative overflow-hidden border-b"
      style={{ background: 'var(--slate-900)', borderColor: 'var(--accent-primary)' }}
    >
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-20">
        {breadcrumbItems && (
          <Breadcrumbs
            items={breadcrumbItems}
            className="mb-8 [&_a]:text-white/50 [&_a:hover]:text-white [&_span]:text-white [&_svg]:text-white/30"
          />
        )}
        
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-4 font-ui text-lg" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {subtitle}
              </p>
            )}
          </div>
          
          {stats && stats.length > 0 && (
            <div className="flex gap-6">
              {stats.map((stat, index) => (
                <div key={index}>
                  {index > 0 && (
                    <div 
                      className="w-px"
                      style={{ background: 'rgba(255,255,255,0.2)' }}
                    />
                  )}
                  <div className="text-center">
                    <div className="font-mono text-3xl font-bold text-white">{stat.value}</div>
                    <div className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--accent-primary)' }}>
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {children}
      </div>
      
      <div 
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: 'var(--accent-primary)' }}
      />
    </section>
  );
}
