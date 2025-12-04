'use client';

interface InstagramEmbedProps {
  postUrl: string;
  className?: string;
}

export function InstagramEmbed({ postUrl, className = '' }: InstagramEmbedProps) {
  const match = postUrl.match(/^https:\/\/www\.instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)\/?\??.*$/);
  const postId = match?.[2];
  
  if (!postId || !/^[A-Za-z0-9_-]+$/.test(postId)) {
    return null;
  }

  const sanitizedPostId = encodeURIComponent(postId);

  return (
    <iframe
      src={`https://www.instagram.com/p/${sanitizedPostId}/embed/`}
      className={`w-full h-full border-0 ${className}`}
      scrolling="no"
      allowTransparency
      title={`Instagram post ${sanitizedPostId}`}
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      aria-label="Instagram post preview"
    />
  );
}
