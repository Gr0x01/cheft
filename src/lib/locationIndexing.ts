// Cities, states and countries below this are noindex, follow — crawlable and still passing
// equity to the restaurants they link, but not submitted. Backfilling the missing cities took
// the table from 162 rows to 414, and 291 of those hold one or two restaurants; submitting
// them would feed the "Crawled – currently not indexed" bucket that is already this site's
// largest. Validated against 90 days of PostHog: no location page with fewer than three
// restaurants cleared 8 views, while every high-traffic one has at least three.
// Matches MIN_INDEXABLE_SHOW_CHEFS in showIndexing.ts.
export const MIN_INDEXABLE_LOCATION_RESTAURANTS = 3;

export function isLocationWorthIndexing(restaurantCount: number): boolean {
  return restaurantCount >= MIN_INDEXABLE_LOCATION_RESTAURANTS;
}
