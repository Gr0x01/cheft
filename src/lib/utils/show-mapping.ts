export function extractShowSlugFromWikiUrl(sourceUrl: string): string {
  const showSlugMatch = sourceUrl.match(/wikipedia\.org\/wiki\/(.+?)(?:[#_]|$)/i);
  
  if (!showSlugMatch) {
    return 'tournament-of-champions';
  }
  
  const wikiPage = showSlugMatch[1].toLowerCase();
  
  const showMappings: Record<string, string> = {
    'top_chef': 'top-chef',
    'iron_chef': 'iron-chef-america',
    'next_level': 'next-level-chef',
    'chopped': 'chopped',
    'hells_kitchen': 'hells-kitchen',
    'hell\'s_kitchen': 'hells-kitchen',
    'masterchef': 'masterchef',
    'master_chef': 'masterchef',
    'beat_bobby_flay': 'beat-bobby-flay',
  };
  
  for (const [key, slug] of Object.entries(showMappings)) {
    if (wikiPage.includes(key)) {
      return slug;
    }
  }
  
  return 'tournament-of-champions';
}
