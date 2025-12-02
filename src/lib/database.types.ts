export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      chef_shows: {
        Row: {
          id: string
          chef_id: string
          show_id: string
          season: string | null
          season_name: string | null
          result: 'winner' | 'finalist' | 'contestant' | 'judge' | null
          is_primary: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          chef_id: string
          show_id: string
          season?: string | null
          season_name?: string | null
          result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null
          is_primary?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          chef_id?: string
          show_id?: string
          season?: string | null
          season_name?: string | null
          result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null
          is_primary?: boolean | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_shows_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_shows_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          }
        ]
      }
      chefs: {
        Row: {
          id: string
          name: string
          slug: string
          mini_bio: string | null
          country: string | null
          james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null
          photo_url: string | null
          photo_source: 'wikipedia' | 'tmdb' | 'llm_search' | 'manual' | null
          social_links: Json | null
          notable_awards: string[] | null
          instagram_handle: string | null
          cookbook_titles: string[] | null
          youtube_channel: string | null
          current_role: string | null
          mentor: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          mini_bio?: string | null
          country?: string | null
          james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null
          photo_url?: string | null
          photo_source?: 'wikipedia' | 'tmdb' | 'llm_search' | 'manual' | null
          social_links?: Json | null
          notable_awards?: string[] | null
          instagram_handle?: string | null
          cookbook_titles?: string[] | null
          youtube_channel?: string | null
          current_role?: string | null
          mentor?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          mini_bio?: string | null
          country?: string | null
          james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null
          photo_url?: string | null
          photo_source?: 'wikipedia' | 'tmdb' | 'llm_search' | 'manual' | null
          social_links?: Json | null
          notable_awards?: string[] | null
          instagram_handle?: string | null
          cookbook_titles?: string[] | null
          youtube_channel?: string | null
          current_role?: string | null
          mentor?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          id: string
          name: string
          state: string | null
          country: string | null
          slug: string
          restaurant_count: number | null
          chef_count: number | null
          hero_image_url: string | null
          meta_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          state?: string | null
          country?: string | null
          slug: string
          restaurant_count?: number | null
          chef_count?: number | null
          hero_image_url?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          state?: string | null
          country?: string | null
          slug?: string
          restaurant_count?: number | null
          chef_count?: number | null
          hero_image_url?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_changes: {
        Row: {
          id: string
          table_name: string
          record_id: string | null
          change_type: 'insert' | 'update' | 'delete'
          old_data: Json | null
          new_data: Json | null
          source: string
          confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id?: string | null
          change_type: 'insert' | 'update' | 'delete'
          old_data?: Json | null
          new_data?: Json | null
          source: string
          confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string | null
          change_type?: 'insert' | 'update' | 'delete'
          old_data?: Json | null
          new_data?: Json | null
          source?: string
          confidence?: number | null
          created_at?: string
        }
        Relationships: []
      }
      enrichment_jobs: {
        Row: {
          id: string
          chef_id: string
          queue_item_id: string | null
          status: 'queued' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          locked_until: string | null
          locked_by: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          chef_id: string
          queue_item_id?: string | null
          status: 'queued' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          locked_until?: string | null
          locked_by?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          chef_id?: string
          queue_item_id?: string | null
          status?: 'queued' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          locked_until?: string | null
          locked_by?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_jobs_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrichment_jobs_queue_item_id_fkey"
            columns: ["queue_item_id"]
            isOneToOne: false
            referencedRelation: "review_queue"
            referencedColumns: ["id"]
          }
        ]
      }
      excluded_names: {
        Row: {
          id: string
          name: string
          show_id: string | null
          reason: string | null
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          show_id?: string | null
          reason?: string | null
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          show_id?: string | null
          reason?: string | null
          source?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "excluded_names_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          }
        ]
      }
      restaurant_embeddings: {
        Row: {
          id: string
          restaurant_id: string
          embedding: string | null
          text_content: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          embedding?: string | null
          text_content?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          embedding?: string | null
          text_content?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_embeddings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
        ]
      }
      restaurants: {
        Row: {
          id: string
          name: string
          slug: string
          chef_id: string
          chef_role: 'owner' | 'executive_chef' | 'partner' | 'consultant' | null
          address: string | null
          city: string
          state: string | null
          country: string | null
          lat: number | null
          lng: number | null
          price_tier: '$' | '$$' | '$$$' | '$$$$' | null
          cuisine_tags: string[] | null
          status: 'open' | 'closed' | 'unknown' | null
          website_url: string | null
          maps_url: string | null
          source_notes: string | null
          last_verified_at: string | null
          verification_source: string | null
          is_public: boolean | null
          description: string | null
          google_place_id: string | null
          google_rating: number | null
          google_review_count: number | null
          google_price_level: number | null
          google_photos: Json | null
          photo_urls: string[] | null
          last_enriched_at: string | null
          phone: string | null
          reservation_url: string | null
          signature_dishes: string[] | null
          michelin_stars: number | null
          year_opened: number | null
          hours: Json | null
          vibe_tags: string[] | null
          dietary_options: string[] | null
          awards: string[] | null
          gift_card_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          chef_id: string
          chef_role?: 'owner' | 'executive_chef' | 'partner' | 'consultant' | null
          address?: string | null
          city: string
          state?: string | null
          country?: string | null
          lat?: number | null
          lng?: number | null
          price_tier?: '$' | '$$' | '$$$' | '$$$$' | null
          cuisine_tags?: string[] | null
          status?: 'open' | 'closed' | 'unknown' | null
          website_url?: string | null
          maps_url?: string | null
          source_notes?: string | null
          last_verified_at?: string | null
          verification_source?: string | null
          is_public?: boolean | null
          description?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          google_price_level?: number | null
          google_photos?: Json | null
          photo_urls?: string[] | null
          last_enriched_at?: string | null
          phone?: string | null
          reservation_url?: string | null
          signature_dishes?: string[] | null
          michelin_stars?: number | null
          year_opened?: number | null
          hours?: Json | null
          vibe_tags?: string[] | null
          dietary_options?: string[] | null
          awards?: string[] | null
          gift_card_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          chef_id?: string
          chef_role?: 'owner' | 'executive_chef' | 'partner' | 'consultant' | null
          address?: string | null
          city?: string
          state?: string | null
          country?: string | null
          lat?: number | null
          lng?: number | null
          price_tier?: '$' | '$$' | '$$$' | '$$$$' | null
          cuisine_tags?: string[] | null
          status?: 'open' | 'closed' | 'unknown' | null
          website_url?: string | null
          maps_url?: string | null
          source_notes?: string | null
          last_verified_at?: string | null
          verification_source?: string | null
          is_public?: boolean | null
          description?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          google_price_level?: number | null
          google_photos?: Json | null
          photo_urls?: string[] | null
          last_enriched_at?: string | null
          phone?: string | null
          reservation_url?: string | null
          signature_dishes?: string[] | null
          michelin_stars?: number | null
          year_opened?: number | null
          hours?: Json | null
          vibe_tags?: string[] | null
          dietary_options?: string[] | null
          awards?: string[] | null
          gift_card_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chefs"
            referencedColumns: ["id"]
          }
        ]
      }
      review_queue: {
        Row: {
          id: string
          type: string
          data: Json
          source: string | null
          confidence: number | null
          status: 'pending' | 'approved' | 'rejected' | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          data: Json
          source?: string | null
          confidence?: number | null
          status?: 'pending' | 'approved' | 'rejected' | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          data?: Json
          source?: string | null
          confidence?: number | null
          status?: 'pending' | 'approved' | 'rejected' | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      shows: {
        Row: {
          id: string
          name: string
          slug: string
          network: string | null
          wikipedia_source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          network?: string | null
          wikipedia_source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          network?: string | null
          wikipedia_source?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

// Legacy type aliases for backward compatibility
export type { Tables as TablesRow, TablesInsert as InsertTables, TablesUpdate as UpdateTables }