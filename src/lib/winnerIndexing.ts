/**
 * Winners pages repeat information from chef and restaurant pages, so only the broader
 * roundups are substantial enough to put in front of search engines.
 */
export const MIN_INDEXABLE_WINNERS = 3;

export function isWinnersPageWorthIndexing(winnerCount: number): boolean {
  return winnerCount >= MIN_INDEXABLE_WINNERS;
}
