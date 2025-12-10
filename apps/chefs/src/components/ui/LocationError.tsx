import Link from 'next/link';

interface LocationErrorProps {
  type: 'state' | 'country';
  message?: string;
}

export function LocationError({ type, message }: LocationErrorProps) {
  const defaultMessage = type === 'state' 
    ? 'Unable to load states. Please try again later.'
    : 'Unable to load countries. Please try again later.';

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center px-4">
        <h1 
          className="font-display text-2xl font-bold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Something went wrong
        </h1>
        <p 
          className="font-ui text-base mb-8"
          style={{ color: 'var(--text-muted)' }}
        >
          {message || defaultMessage}
        </p>
        <Link
          href={type === 'state' ? '/states' : '/countries'}
          className="inline-flex items-center gap-2 font-mono text-sm font-semibold px-6 py-3 transition-colors"
          style={{ background: 'var(--accent-primary)', color: 'white' }}
        >
          GO BACK
        </Link>
      </div>
    </div>
  );
}
