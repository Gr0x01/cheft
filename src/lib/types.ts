// Database types for TV Chef Map

export interface Show {
  id: string;
  name: string;
  network: string | null;
  created_at: string;
}

export interface ChefShow {
  id: string;
  chef_id: string;
  show_id: string;
  season: string | null;
  season_name: string | null;
  result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
  is_primary: boolean;
  created_at: string;
  show?: Show;
}

export interface Chef {
  id: string;
  name: string;
  slug: string;
  mini_bio: string | null;
  country: string | null;
  james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null;
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
  chef_shows?: ChefShow[];
}

export interface RestaurantChef {
  id: string;
  restaurant_id: string;
  chef_id: string;
  role: 'owner' | 'co-owner' | 'partner' | 'executive_chef' | 'consultant' | null;
  is_primary: boolean;
  chef?: Chef;
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
  photo_urls?: string[] | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  michelin_stars?: number | null;
  chef?: Chef;
  chefs?: RestaurantChef[];
}

export interface RestaurantEmbedding {
  id: string;
  restaurant_id: string;
  embedding: number[];
  created_at: string;
}

export interface ChefWithPrimaryShow extends Chef {
  primary_show?: Show | null;
  top_chef_season?: string | null;
  top_chef_result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
}

export interface RestaurantWithDetails extends Restaurant {
  chef: ChefWithPrimaryShow;
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