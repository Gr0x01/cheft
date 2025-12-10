'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface InstagramEmbedProps {
  postUrl: string;
  className?: string;
}

export function InstagramEmbed({ postUrl, className = '' }: InstagramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const match = postUrl.match(/^https:\/\/www\.instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)\/?\??.*$/);
  const postId = match?.[2];
  
  if (!postId || !/^[A-Za-z0-9_-]+$/.test(postId)) {
    return null;
  }

  const sanitizedUrl = `https://www.instagram.com/p/${postId}/`;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let scriptElement: HTMLScriptElement | null = null;
    let timeoutId: NodeJS.Timeout;

    const loadInstagramEmbed = () => {
      const existingScript = document.querySelector('script[src="https://www.instagram.com/embed.js"]');
      
      if (existingScript) {
        if ((window as any).instgrm) {
          (window as any).instgrm.Embeds.process();
          timeoutId = setTimeout(() => setIsLoading(false), 1000);
        } else {
          timeoutId = setTimeout(() => setHasError(true), 3000);
        }
      } else {
        scriptElement = document.createElement('script');
        scriptElement.src = 'https://www.instagram.com/embed.js';
        scriptElement.async = true;
        scriptElement.onload = () => {
          if ((window as any).instgrm) {
            (window as any).instgrm.Embeds.process();
            timeoutId = setTimeout(() => setIsLoading(false), 1000);
          } else {
            setHasError(true);
          }
        };
        scriptElement.onerror = () => {
          setHasError(true);
          setIsLoading(false);
        };
        document.body.appendChild(scriptElement);
      }
    };

    loadInstagramEmbed();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (scriptElement && scriptElement.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
      }
    };
  }, [postUrl]);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 ${className}`}>
        <a
          href={sanitizedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-3 text-slate-600 hover:text-pink-600 transition-colors p-6"
        >
          <ExternalLink className="w-8 h-8" />
          <span className="text-sm font-medium">View on Instagram</span>
        </a>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
        </div>
      )}
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={sanitizedUrl}
        data-instgrm-version="14"
        style={{
          background: '#FFF',
          border: 0,
          borderRadius: '3px',
          boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
          margin: '1px',
          maxWidth: '540px',
          minWidth: '326px',
          padding: 0,
          width: 'calc(100% - 2px)',
        }}
      />
    </div>
  );
}
