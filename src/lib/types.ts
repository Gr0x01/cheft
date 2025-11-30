// Database types for TV Chef Map

export interface Show {
  id: string;
  name: string;
  network: string | null;
  created_at: string;
}

export interface Chef {
  id: string;
  name: string;
  slug: string;
  primary_show_id: string | null;
  other_shows: string[] | null;
  top_chef_season: string | null;
  top_chef_result: 'winner' | 'finalist' | 'contestant' | null;
  mini_bio: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
  primary_show?: Show; // Joined data
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  chef_id: string;
  city: string;
  state: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  price_tier: '$' | '$$' | '$$$' | '$$$$';
  cuisine_tags: string[] | null;
  status: 'open' | 'closed' | 'unknown';
  website_url: string | null;
  maps_url: string | null;
  source_notes: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  chef?: Chef; // Joined data
}

export interface RestaurantEmbedding {
  id: string;
  restaurant_id: string;
  embedding: number[];
  created_at: string;
}

// Extended types for API responses
export interface RestaurantWithDetails extends Restaurant {
  chef: Chef & { primary_show?: Show };
}

// Search and filter types
export interface SearchFilters {
  city?: string;
  state?: string;
  country?: string;
  show_names?: string[];
  price_tiers?: ('$' | '$$' | '$$$' | '$$$$')[];
  cuisine_keywords?: string[];
  result_priority?: ('winner' | 'finalist' | 'contestant')[];
  status?: ('open' | 'closed' | 'unknown')[];
}

export interface NaturalLanguageSearchRequest {
  query: string;
}

export interface SearchResult {
  restaurant: RestaurantWithDetails;
  score?: number; // For semantic/similarity search
}

export interface NaturalLanguageSearchResponse {
  filters: SearchFilters;
  results: SearchResult[];
  query_interpretation?: string; // Optional: how we interpreted the query
}

// Admin types
export interface EnrichRestaurantRequest {
  restaurantId: string;
  sources?: {
    type: 'url' | 'raw_html';
    value: string;
  }[];
}

export interface EnrichRestaurantResponse {
  success: boolean;
  updated_fields: string[];
  errors?: string[];
}

// Map types
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapMarker {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  restaurant: RestaurantWithDetails;
}

// UI state types
export interface AppState {
  restaurants: RestaurantWithDetails[];
  filteredRestaurants: RestaurantWithDetails[];
  searchQuery: string;
  filters: SearchFilters;
  selectedRestaurant: RestaurantWithDetails | null;
  isLoading: boolean;
  error: string | null;
}

export interface MapViewState {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
  bounds?: MapBounds;
}

// Homepage specific types
export interface DatabaseStats {
  totalRestaurants: number;
  totalChefs: number;
  totalCities: number;
  totalShows: number;
  lastUpdated: string;
}

export interface FeaturedWinner {
  id: string;
  chef: Chef;
  restaurant: Restaurant;
  show: Show;
  season?: string;
  achievement: string;
  imageUrl?: string;
}

export interface PopularCity {
  name: string;
  state?: string;
  country: string;
  restaurantCount: number;
  imageUrl?: string;
  slug: string;
}

export interface PopularShow {
  show: Show;
  chefCount: number;
  restaurantCount: number;
  currentSeason?: string;
  imageUrl?: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  action: 'link' | 'search' | 'location';
}

export interface SearchSuggestion {
  text: string;
  type: 'example' | 'recent' | 'popular';
  category?: string;
}

export interface HomepageData {
  stats: DatabaseStats;
  featuredWinners: FeaturedWinner[];
  popularCities: PopularCity[];
  popularShows: PopularShow[];
  quickActions: QuickAction[];
  searchSuggestions: SearchSuggestion[];
}