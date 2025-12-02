import Link from 'next/link';

interface EmptyStateProps {
  message: string;
  actionText?: string;
  actionHref?: string;
}

export function EmptyState({ message, actionText = 'CLEAR FILTERS →', actionHref }: EmptyStateProps) {
  return (
    <div className="text-center py-20">
      <p className="font-ui text-lg" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
      {actionHref && (
        <Link 
          href={actionHref} 
          className="mt-4 inline-block font-mono text-sm tracking-wider"
          style={{ color: 'var(--accent-primary)' }}
        >
          {actionText}
        </Link>
      )}
    </div>
  );
}
