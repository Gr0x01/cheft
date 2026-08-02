/**
 * Test data fixtures for TV Chef Map tests
 */

export const testChefs = [
  {
    name: 'Tom Colicchio',
    restaurant: 'Craft',
    city: 'New York',
    show: 'Top Chef'
  },
  {
    name: 'Stephanie Izard',
    restaurant: 'Girl & the Goat',
    city: 'Chicago',
    show: 'Top Chef'
  }
];

export const testSearchQueries = [
  'Top Chef winners in Chicago',
  'restaurants in New York',
  'Italian cuisine',
  'fine dining under $100'
];

export const mockRestaurant = {
  id: 1,
  name: 'Test Restaurant',
  chef_name: 'Test Chef',
  city: 'Test City',
  state: 'Test State',
  cuisine: 'Test Cuisine',
  price_tier: '$',
  latitude: 40.7128,
  longitude: -74.0060,
  website: 'https://test-restaurant.com',
  show_name: 'Top Chef',
  season: 'Season 1'
};
// Console noise that doesn't indicate a broken page: browser/extension chatter and
// resource-loading failures from the dev server under parallel load. Shared so the
// homepage and restaurant-map error checks can't drift apart on what counts as real.
export const nonCriticalConsolePatterns = [
  'favicon.ico',
  'chrome-extension',
  'baseline-browser-mapping',
  'Download the React DevTools',
  'hydration',
  'Hydration',
  'ResizeObserver',
  'net::ERR_',
  'Failed to load resource',
  '404',
];
