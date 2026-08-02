/**
 * Plain script tags instead of next-plausible's <PlausibleProvider>.
 *
 * PlausibleProvider renders via next/script, which reads HeadManagerContext during render
 * and intermittently crashed static prerendering under Next 16 ("Cannot read properties of
 * null (reading 'useContext')") — failing whichever page a build worker happened to hit.
 *
 * The markup below is exactly what PlausibleProvider emits with the proxy enabled, so the
 * withPlausibleProxy() rewrites in next.config.ts still do their job: the script and the
 * event endpoint are served from our own domain, which is what gets past ad blockers.
 * Paths must stay in sync with those rewrites (/js/script.js and /proxy/api/event).
 */
const PLAUSIBLE_DOMAIN = 'cheft.app';
const PROXIED_SCRIPT = '/js/script.js';
const PROXIED_API = '/proxy/api/event';

export function PlausibleAnalytics() {
  // Matches next-plausible's default: production only, so local runs don't pollute stats.
  if (process.env.NODE_ENV !== 'production') return null;

  return (
    <>
      <script async defer data-domain={PLAUSIBLE_DOMAIN} data-api={PROXIED_API} src={PROXIED_SCRIPT} />
      <script
        dangerouslySetInnerHTML={{
          __html:
            'window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }',
        }}
      />
    </>
  );
}
