/**
 * Placeholder for a filter bar while its Suspense boundary resolves on the client.
 *
 * Filter bars read the URL via useSearchParams, which forces their Suspense subtree to
 * client-render. Keeping that boundary tight around the bar — and this skeleton shaped
 * like the bar rather than the results below it — is what lets the result grid stay in
 * the prerendered HTML where crawlers can see it.
 */
export function FilterBarSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div
        className="border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <div className="w-44 h-8 bg-slate-200" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-20 h-7 bg-slate-200" />
          ))}
        </div>
      </div>
      <div
        className="border-b py-2.5"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="w-48 h-3 bg-slate-200" />
          <div className="w-24 h-3 bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
