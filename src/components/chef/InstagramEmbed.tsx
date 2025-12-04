'use client';

import { useEffect, useState } from 'react';

interface InstagramEmbedProps {
  postUrl: string;
  className?: string;
}

interface OEmbedResponse {
  html: string;
  version: string;
  provider_name: string;
}

export function InstagramEmbed({ postUrl, className = '' }: InstagramEmbedProps) {
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadEmbed() {
      try {
        const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(postUrl)}&maxwidth=500&hidecaption=false`;
        
        const response = await fetch(oembedUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch embed');
        }
        
        const data: OEmbedResponse = await response.json();
        setEmbedHtml(data.html);

        const script = document.createElement('script');
        script.src = '//www.instagram.com/embed.js';
        script.async = true;
        document.body.appendChild(script);

        if ((window as any).instgrm) {
          (window as any).instgrm.Embeds.process();
        }

      } catch (err) {
        console.error('Instagram embed error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadEmbed();
  }, [postUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div 
          className="w-full max-w-[500px] h-[600px] animate-pulse rounded"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <div className="p-4 flex items-center gap-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <div className="w-10 h-10 rounded-full" style={{ background: 'var(--bg-secondary)' }}></div>
            <div className="flex-1">
              <div className="h-3 w-32 mb-2 rounded" style={{ background: 'var(--bg-secondary)' }}></div>
              <div className="h-2 w-24 rounded" style={{ background: 'var(--bg-secondary)' }}></div>
            </div>
          </div>
          <div className="w-full h-[400px]" style={{ background: 'var(--bg-secondary)' }}></div>
        </div>
      </div>
    );
  }

  if (error || !embedHtml) {
    return null;
  }

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: embedHtml }}
    />
  );
}
