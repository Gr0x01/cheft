/**
 * Which show pages are substantial enough to put in front of search engines.
 *
 * A show page is essentially a grid of its chefs, so chef count is the honest proxy for how
 * much unique content it has. 126 of 192 shows have two chefs or fewer and render ~20 unique
 * words; that block of near-duplicate pages is the biggest contributor to Search Console's
 * "crawled - currently not indexed" (1,616 pages as of 2026-08-02).
 *
 * Deliberately NOT keyed on `shows.is_public`. That flag is stale: Chopped (68 chefs),
 * Beat Bobby Flay (59) and Iron Chef America (42) are all marked non-public despite earning
 * real organic traffic, while empty shows like Top Chef Charlotte (0 chefs) are marked public.
 *
 * Threshold validated against 90 days of PostHog data: every show earning meaningful traffic
 * has at least five chefs, so a cut at three keeps a safety margin.
 */
export const MIN_INDEXABLE_SHOW_CHEFS = 3;

export function isShowWorthIndexing(chefCount: number): boolean {
  return chefCount >= MIN_INDEXABLE_SHOW_CHEFS;
}
