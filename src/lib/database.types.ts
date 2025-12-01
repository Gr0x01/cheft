export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chefs: {
        Row: {
          id: string
          name: string
          slug: string
          mini_bio: string | null
          country: string
          james_beard_status: 'semifinalist' | 'nominated' | 'winner' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          mini_bio?: string | null
          country?: string
          james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          mini_bio?: string | null
          country?: string
          james_beard_status?: 'semifinalist' | 'nominated' | 'winner' | null
          created_at?: string
          updated_at?: string
        }
      }
      chef_shows: {
        Row: {
          id: string
          chef_id: string
          show_id: string
          season: string | null
          season_name: string | null
          result: 'winner' | 'finalist' | 'contestant' | 'judge' | null
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          chef_id: string
          show_id: string
          season?: string | null
          season_name?: string | null
          result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          chef_id?: string
          show_id?: string
          season?: string | null
          season_name?: string | null
          result?: 'winner' | 'finalist' | 'contestant' | 'judge' | null
          is_primary?: boolean
          created_at?: string
        }
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
      }
      restaurants: {
        Row: {
          id: string
          name: string
          slug: string
          chef_id: string
          chef_role: 'owner' | 'executive_chef' | 'partner' | 'consultant'
          address: string | null
          city: string
          state: string | null
          country: string
          lat: number | null
          lng: number | null
          price_tier: '$' | '$$' | '$$$' | '$$$$' | null
          cuisine_tags: string[] | null
          status: 'open' | 'closed' | 'unknown'
          website_url: string | null
          maps_url: string | null
          source_notes: string | null
          last_verified_at: string | null
          verification_source: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          chef_id: string
          chef_role?: 'owner' | 'executive_chef' | 'partner' | 'consultant'
          address?: string | null
          city: string
          state?: string | null
          country?: string
          lat?: number | null
          lng?: number | null
          price_tier?: '$' | '$$' | '$$$' | '$$$$' | null
          cuisine_tags?: string[] | null
          status?: 'open' | 'closed' | 'unknown'
          website_url?: string | null
          maps_url?: string | null
          source_notes?: string | null
          last_verified_at?: string | null
          verification_source?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          chef_id?: string
          chef_role?: 'owner' | 'executive_chef' | 'partner' | 'consultant'
          address?: string | null
          city?: string
          state?: string | null
          country?: string
          lat?: number | null
          lng?: number | null
          price_tier?: '$' | '$$' | '$$$' | '$$$$' | null
          cuisine_tags?: string[] | null
          status?: 'open' | 'closed' | 'unknown'
          website_url?: string | null
          maps_url?: string | null
          source_notes?: string | null
          last_verified_at?: string | null
          verification_source?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      restaurant_embeddings: {
        Row: {
          id: string
          restaurant_id: string
          embedding: number[] | null
          text_content: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          embedding?: number[] | null
          text_content?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          embedding?: number[] | null
          text_content?: string | null
          created_at?: string
        }
      }
      review_queue: {
        Row: {
          id: string
          type: 'new_chef' | 'new_restaurant' | 'update' | 'status_change'
          data: Json
          source: string | null
          confidence: number | null
          status: 'pending' | 'approved' | 'rejected'
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: 'new_chef' | 'new_restaurant' | 'update' | 'status_change'
          data: Json
          source?: string | null
          confidence?: number | null
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'new_chef' | 'new_restaurant' | 'update' | 'status_change'
          data?: Json
          source?: string | null
          confidence?: number | null
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
        }
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
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
