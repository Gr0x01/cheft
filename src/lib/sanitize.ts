import DOMPurify from 'isomorphic-dompurify';

export function sanitizeNarrative(text: string | null): string {
  if (!text) return '';
  
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}
