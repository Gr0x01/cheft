'use client';

import Image, { type ImageProps } from 'next/image';
import { useState, type ReactNode } from 'react';

type ImageWithFallbackProps = Omit<ImageProps, 'src' | 'onError'> & {
  src?: string | null;
  fallback: ReactNode;
};

/**
 * Renders a next/image that degrades to `fallback` when the src is missing
 * or fails to load (e.g. expired Google photo URLs). Keeps the card layout
 * intact instead of showing a broken-image icon.
 */
export function ImageWithFallback({ src, fallback, ...rest }: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return <>{fallback}</>;
  }

  // alt is provided by the caller via {...rest}; the linter can't see it statically.
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image src={src} onError={() => setErrored(true)} {...rest} />;
}
