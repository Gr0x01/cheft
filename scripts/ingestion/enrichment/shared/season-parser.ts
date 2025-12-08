export interface ParsedSeason {
  season: number | null;
  year: number | null;
}

export function parseSeasonOrYear(input: string | number | null | undefined): ParsedSeason[] {
  if (input === null || input === undefined) {
    return [{ season: null, year: null }];
  }

  const str = String(input).trim();
  if (!str) {
    return [{ season: null, year: null }];
  }

  const yearRangeMatch = str.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
  if (yearRangeMatch) {
    const startYear = parseInt(yearRangeMatch[1], 10);
    const endYear = parseInt(yearRangeMatch[2], 10);
    if (endYear < startYear || endYear - startYear > 20) {
      return [{ season: null, year: null }];
    }
    const results: ParsedSeason[] = [];
    for (let y = startYear; y <= endYear; y++) {
      results.push({ season: null, year: y });
    }
    return results;
  }

  const seasonMatch = str.match(/^[Ss](?:eason)?\s*(\d+)$/);
  if (seasonMatch) {
    return [{ season: parseInt(seasonMatch[1], 10), year: null }];
  }

  const yearMatch = str.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    if (year >= 1990 && year <= 2100) {
      return [{ season: null, year }];
    }
  }

  const numMatch = str.match(/^(\d{1,2})$/);
  if (numMatch) {
    return [{ season: parseInt(numMatch[1], 10), year: null }];
  }

  return [{ season: null, year: null }];
}

export function formatSeasonDisplay(season: number | null, year: number | null): string {
  if (season !== null) {
    return `Season ${season}`;
  }
  if (year !== null) {
    return String(year);
  }
  return 'Unknown';
}

export function normalizeShowName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/['']/g, "'")
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const SHOW_ALIASES: Record<string, string> = {
  'toc': 'tournament of champions',
  'ggg': "guy's grocery games",
  'ddd': 'diners drive-ins and dives',
  'iron chef america': 'iron chef',
};

export function resolveShowAlias(name: string): string {
  const normalized = normalizeShowName(name);
  return SHOW_ALIASES[normalized] || normalized;
}
