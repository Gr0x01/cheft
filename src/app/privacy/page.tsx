import { Metadata } from 'next';
import { Header } from '@/components/ui/Header';
import { PageHero } from '@/components/ui/PageHero';
import { Footer } from '@/components/ui/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | Cheft',
  description:
    'Privacy policy for Cheft - learn how we collect, use, and protect your data.',
  openGraph: {
    title: 'Privacy Policy | Cheft',
    description:
      'Privacy policy for Cheft - learn how we collect, use, and protect your data.',
    type: 'website',
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen overflow-auto" style={{ background: 'var(--bg-primary)', paddingTop: '64px' }}>
      <Header />

      <PageHero
        title="Privacy Policy"
        subtitle="How we handle your data"
        breadcrumbItems={[{ label: 'Privacy' }]}
      />

      <main className="max-w-4xl mx-auto px-4 py-16 sm:py-20">
        <div className="space-y-12">
          <p className="font-ui text-sm" style={{ color: 'var(--text-muted)' }}>
            Last updated: December 2025
          </p>

          <section>
            <h2 className="font-display text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              What We Collect
            </h2>
            <p className="font-ui text-lg leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              We collect minimal data to improve the site:
            </p>
            <ul className="font-ui text-lg leading-relaxed list-disc list-inside space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Analytics data</strong> – page views, clicks, and general usage patterns via PostHog</li>
              <li><strong>Session recordings</strong> – anonymized recordings of how visitors interact with the site (no personal info captured)</li>
              <li><strong>Cookies</strong> – used for admin authentication only; regular visitors don&apos;t need to log in</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              How We Use It
            </h2>
            <p className="font-ui text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              We use this data to understand which features work well and where to improve. We don&apos;t sell your data, show you ads, or share information with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Third-Party Services
            </h2>
            <p className="font-ui text-lg leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              We use the following services that may collect data:
            </p>
            <ul className="font-ui text-lg leading-relaxed list-disc list-inside space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>PostHog</strong> – product analytics and session replay</li>
              <li><strong>Supabase</strong> – database and authentication</li>
              <li><strong>Google Places</strong> – restaurant photos and ratings</li>
              <li><strong>Vercel</strong> – hosting and performance analytics</li>
            </ul>
            <p className="font-ui text-lg leading-relaxed mt-4" style={{ color: 'var(--text-secondary)' }}>
              Each of these services has their own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Your Choices
            </h2>
            <p className="font-ui text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Most browsers let you block cookies or clear browsing data. You can also use browser extensions to opt out of analytics tracking. We respect Do Not Track signals where possible.
            </p>
          </section>

          <section>
            <h2 className="font-display text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Contact
            </h2>
            <p className="font-ui text-lg leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
              Questions about this policy? Email us at{' '}
              <a
                href="mailto:info@cheft.app"
                className="underline hover:no-underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                info@cheft.app
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
