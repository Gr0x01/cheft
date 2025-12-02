interface ShowBadge {
  show?: { name: string } | null;
  season?: string | null;
  result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
  is_primary?: boolean;
}

type ShowType = 'competition' | 'series' | 'hosting' | 'guest';

export function abbreviateShowName(showName: string): string {
  const abbreviations: Record<string, string> = {
    'Top Chef': 'TC',
    'Iron Chef America': 'ICA',
    'Iron Chef': 'IC',
    'Tournament of Champions': 'TOC',
    'Next Level Chef': 'NLC',
    'Chopped': 'CHOPPED',
    'Hells Kitchen': 'HK',
    'MasterChef': 'MC',
    'Beat Bobby Flay': 'BBF',
    'The Bear': 'BEAR',
  };

  return abbreviations[showName] || showName.split(' ').map(w => w[0]).join('').toUpperCase();
}

export function getShowType(showName: string, result?: string | null): ShowType {
  const competitionShows = ['Top Chef', 'Iron Chef', 'Tournament of Champions', 'Next Level Chef', 'Chopped', 'Hells Kitchen', 'MasterChef', 'Beat Bobby Flay'];
  const seriesShows = ['The Bear'];
  
  if (result === 'judge') return 'hosting';
  if (seriesShows.includes(showName)) return 'series';
  if (competitionShows.includes(showName)) return 'competition';
  
  return 'guest';
}

export function sortShowsByImportance(shows: ShowBadge[]): ShowBadge[] {
  const resultOrder: Record<string, number> = {
    winner: 0,
    finalist: 1,
    judge: 2,
    contestant: 3,
  };

  return [...shows].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    
    const aOrder = a.result ? resultOrder[a.result] : 4;
    const bOrder = b.result ? resultOrder[b.result] : 4;
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    
    return (a.show?.name || '').localeCompare(b.show?.name || '');
  });
}

export function formatSeasonDisplay(season: string | null | undefined): string {
  if (!season) return '';
  
  if (season.toLowerCase().startsWith('season')) {
    const num = season.replace(/season\s*/i, '');
    return `S${num}`;
  }
  
  return season;
}
