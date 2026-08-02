'use client';

/**
 * global-error replaces the root layout, so no provider or context from it exists here —
 * this page must stay free of both. Next 16 crashes prerendering this route with
 * "Cannot read properties of null (reading 'useContext')" (vercel/next.js#94667), hence
 * force-dynamic: there is nothing to gain from prerendering an error page anyway.
 */
export const dynamic = 'force-dynamic';

export default function GlobalError() {
  return (
    <html lang="en">
      <body className="antialiased">
        <main style={{ maxWidth: '32rem', margin: '0 auto', padding: '6rem 1.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#475569', marginBottom: '2rem' }}>
            An unexpected error occurred. Try reloading the page, or head back to the homepage.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1.25rem',
              background: '#B87333',
              color: 'white',
              textDecoration: 'none',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
            }}
          >
            BACK TO CHEFT
          </a>
        </main>
      </body>
    </html>
  );
}
