export interface ChefNarrativeContext {
  name: string;
  mini_bio: string | null;
  james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null;
  current_position: string | null;
  shows: Array<{
    show_name: string;
    season: string | null;
    result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
    is_primary: boolean;
  }>;
  restaurants: Array<{
    name: string;
    city: string;
    state: string | null;
    cuisine_tags: string[] | null;
    status: 'open' | 'closed' | 'unknown';
  }>;
  restaurant_count: number;
  cities: string[];
}

export interface RestaurantNarrativeContext {
  name: string;
  chef_name: string;
  city: string;
  state: string | null;
  cuisine_tags: string[] | null;
  price_tier: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  status: 'open' | 'closed' | 'unknown';
  chef_shows: Array<{
    show_name: string;
    result: 'winner' | 'finalist' | 'contestant' | 'judge' | null;
  }>;
  chef_james_beard: 'semifinalist' | 'nominated' | 'winner' | null;
  other_restaurant_count: number;
}

export interface CityNarrativeContext {
  name: string;
  state: string | null;
  restaurant_count: number;
  chef_count: number;
  top_restaurants: Array<{
    name: string;
    chef_name: string;
    cuisine_tags: string[] | null;
    price_tier: string | null;
    google_rating: number | null;
    michelin_stars: number | null;
  }>;
  show_winner_count: number;
  james_beard_winner_count: number;
  cuisine_distribution: Record<string, number>;
  price_distribution: Record<string, number>;
}

export interface NarrativeResult {
  success: boolean;
  narrative: string | null;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  error?: string;
}
