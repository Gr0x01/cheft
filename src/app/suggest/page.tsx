import type { Metadata } from 'next';
import { ChefHat, Mail, MapPin } from 'lucide-react';
import { Footer } from '@/components/ui/Footer';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';

export const metadata: Metadata = {
  title: 'Suggest a Restaurant | Cheft',
  description: 'Tell Cheft about a restaurant owned by a chef from a TV cooking competition.',
  alternates: {
    canonical: '/suggest',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const suggestionEmail =
  'mailto:info@cheft.app?subject=Restaurant%20suggestion&body=Restaurant%20name%3A%0ACity%20and%20country%3A%0AChef%3A%0ATV%20show%3A%0ARestaurant%20website%3A%0A%0AAnything%20else%20we%20should%20know%3A';

const details = [
  { icon: ChefHat, label: 'Chef', copy: 'The chef’s name and the cooking show they appeared on' },
  { icon: MapPin, label: 'Restaurant', copy: 'The restaurant name, city, and country' },
  { icon: Mail, label: 'Source', copy: 'A restaurant website or another useful link, if you have one' },
];

export default function SuggestPage() {
  return (
    <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
      <Header />

      <PageHero
        title="Make a Suggestion"
        subtitle="Know a TV chef restaurant we missed? Send it our way."
        breadcrumbItems={[{ label: 'Suggest a restaurant' }]}
      />

      <main className="max-w-4xl mx-auto px-4 py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-start">
          <section>
            <p className="font-mono text-xs font-bold tracking-[0.18em] uppercase mb-4" style={{ color: 'var(--accent-primary)' }}>
              What to send
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              A few details are plenty.
            </h2>
            <p className="font-ui text-base leading-relaxed mt-4" style={{ color: 'var(--text-secondary)' }}>
              We review each suggestion before adding it, so the directory stays useful and accurate.
            </p>
          </section>

          <section className="border" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-secondary)' }}>
            <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {details.map(({ icon: Icon, label, copy }) => (
                <div key={label} className="flex gap-4 p-5 sm:p-6 border-b last:border-b-0" style={{ borderColor: 'var(--border-light)' }}>
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center"
                    style={{ background: 'var(--accent-primary)', color: 'white' }}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-bold tracking-wider uppercase" style={{ color: 'var(--text-primary)' }}>
                      {label}
                    </h3>
                    <p className="font-ui text-sm leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 sm:p-6">
              <a
                href={suggestionEmail}
                className="inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 font-mono text-sm font-bold tracking-wide transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ background: 'var(--accent-primary)', color: 'white', '--tw-ring-color': 'var(--accent-primary)' } as React.CSSProperties}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                EMAIL YOUR SUGGESTION
              </a>
              <p className="font-ui text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
                This opens a pre-filled email to info@cheft.app.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
