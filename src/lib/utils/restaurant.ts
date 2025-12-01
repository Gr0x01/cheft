import DOMPurify from 'isomorphic-dompurify';

export interface RestaurantStatus {
  isOpen: boolean;
  isClosed: boolean;
  isUnknown: boolean;
  displayStatus: string;
  statusColor: string;
}

export interface ChefAchievements {
  isShowWinner: boolean;
  isJBWinner: boolean;
  isJBNominee: boolean;
  isJBSemifinalist: boolean;
}

export function getRestaurantStatus(
  status: 'open' | 'closed' | 'unknown'
): RestaurantStatus {
  return {
    isOpen: status === 'open',
    isClosed: status === 'closed',
    isUnknown: status === 'unknown',
    displayStatus: status === 'open' ? 'OPEN' : status === 'closed' ? 'CLOSED' : 'UNKNOWN',
    statusColor:
      status === 'open'
        ? 'var(--accent-success)'
        : status === 'closed'
        ? '#dc2626'
        : 'var(--text-muted)',
  };
}

export function getChefAchievements(chef: {
  james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null;
  chef_shows?: Array<{
    result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
    is_primary?: boolean;
  }>;
}): ChefAchievements {
  return {
    isShowWinner: chef.chef_shows?.some(cs => cs.is_primary && cs.result === 'winner') ?? false,
    isJBWinner: chef.james_beard_status === 'winner',
    isJBNominee: chef.james_beard_status === 'nominated',
    isJBSemifinalist: chef.james_beard_status === 'semifinalist',
  };
}

export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

export function validateImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    const allowedDomains = [
      'upload.wikimedia.org',
      'googleusercontent.com',
      'lh3.googleusercontent.com',
      'images.unsplash.com',
    ];
    
    if (allowedDomains.some(domain => parsed.hostname.includes(domain))) {
      return url;
    }
    
    return null;
  } catch {
    return null;
  }
}
