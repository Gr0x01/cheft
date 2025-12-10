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