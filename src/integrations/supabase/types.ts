export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliate_partners: {
        Row: {
          business_name: string
          country: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["vendor_status"]
          website_url: string
        }
        Insert: {
          business_name: string
          country: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["vendor_status"]
          website_url: string
        }
        Update: {
          business_name?: string
          country?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["vendor_status"]
          website_url?: string
        }
        Relationships: []
      }
      booking_leads: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          currency: string | null
          event_date: string | null
          guest_count: number | null
          id: string
          message: string | null
          sender_user_id: string
          status: string
          target_vendor_id: string | null
          target_venue_id: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string
          utm_source: string
          wedding_id: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          event_date?: string | null
          guest_count?: number | null
          id?: string
          message?: string | null
          sender_user_id: string
          status?: string
          target_vendor_id?: string | null
          target_venue_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string
          utm_source?: string
          wedding_id?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          event_date?: string | null
          guest_count?: number | null
          id?: string
          message?: string | null
          sender_user_id?: string
          status?: string
          target_vendor_id?: string | null
          target_venue_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string
          utm_source?: string
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_leads_target_vendor_id_fkey"
            columns: ["target_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_leads_target_venue_id_fkey"
            columns: ["target_venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_leads_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          message: string | null
          quoted_price: number | null
          status: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          message?: string | null
          quoted_price?: number | null
          status?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          message?: string | null
          quoted_price?: number | null
          status?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          category_completion: Json
          city: string | null
          completion_done: boolean
          completion_fraction_current: number
          completion_fraction_total: number
          completion_mode: string
          completion_percent: number
          country: string | null
          created_at: string
          description: string | null
          enabled_categories: string[]
          event_date: string | null
          event_end_time: string | null
          event_time: string | null
          food_included: boolean
          id: string
          name: string
          sort_order: number
          venue_name: string | null
          wedding_id: string
        }
        Insert: {
          address?: string | null
          category_completion?: Json
          city?: string | null
          completion_done?: boolean
          completion_fraction_current?: number
          completion_fraction_total?: number
          completion_mode?: string
          completion_percent?: number
          country?: string | null
          created_at?: string
          description?: string | null
          enabled_categories?: string[]
          event_date?: string | null
          event_end_time?: string | null
          event_time?: string | null
          food_included?: boolean
          id?: string
          name: string
          sort_order?: number
          venue_name?: string | null
          wedding_id: string
        }
        Update: {
          address?: string | null
          category_completion?: Json
          city?: string | null
          completion_done?: boolean
          completion_fraction_current?: number
          completion_fraction_total?: number
          completion_mode?: string
          completion_percent?: number
          country?: string | null
          created_at?: string
          description?: string | null
          enabled_categories?: string[]
          event_date?: string | null
          event_end_time?: string | null
          event_time?: string | null
          food_included?: boolean
          id?: string
          name?: string
          sort_order?: number
          venue_name?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_event_invites: {
        Row: {
          event_id: string
          guest_id: string
          id: string
          plus_ones: number
          rsvp_at: string | null
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
        }
        Insert: {
          event_id: string
          guest_id: string
          id?: string
          plus_ones?: number
          rsvp_at?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Update: {
          event_id?: string
          guest_id?: string
          id?: string
          plus_ones?: number
          rsvp_at?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Relationships: [
          {
            foreignKeyName: "guest_event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_event_invites_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          accessibility_notes: string | null
          created_at: string
          dietary_notes: string | null
          dietary_tags: string[]
          email: string | null
          first_name: string | null
          food_allergies: string[]
          full_name: string
          household_group: string | null
          id: string
          last_name: string | null
          phone: string | null
          rsvp_submitted_at: string | null
          rsvp_token: string
          wedding_id: string
        }
        Insert: {
          accessibility_notes?: string | null
          created_at?: string
          dietary_notes?: string | null
          dietary_tags?: string[]
          email?: string | null
          first_name?: string | null
          food_allergies?: string[]
          full_name: string
          household_group?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          rsvp_submitted_at?: string | null
          rsvp_token?: string
          wedding_id: string
        }
        Update: {
          accessibility_notes?: string | null
          created_at?: string
          dietary_notes?: string | null
          dietary_tags?: string[]
          email?: string | null
          first_name?: string | null
          food_allergies?: string[]
          full_name?: string
          household_group?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          rsvp_submitted_at?: string | null
          rsvp_token?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          category: string | null
          city: string | null
          condition: string | null
          country_code: string | null
          created_at: string
          description: string | null
          id: string
          listing_kind: string
          photos: string[]
          price: number | null
          seller_id: string
          sold_at: string | null
          status: string
          title: string
        }
        Insert: {
          category?: string | null
          city?: string | null
          condition?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          listing_kind?: string
          photos?: string[]
          price?: number | null
          seller_id: string
          sold_at?: string | null
          status?: string
          title: string
        }
        Update: {
          category?: string | null
          city?: string | null
          condition?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          listing_kind?: string
          photos?: string[]
          price?: number | null
          seller_id?: string
          sold_at?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      message_sends: {
        Row: {
          body: string
          channel: string
          created_at: string
          delivered_at: string | null
          error: string | null
          guest_id: string | null
          id: string
          provider_message_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"]
          template_id: string | null
          to_phone: string
          wedding_id: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          guest_id?: string | null
          id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          template_id?: string | null
          to_phone: string
          wedding_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          guest_id?: string | null
          id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          template_id?: string | null
          to_phone?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_sends_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_sends_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          name: string
          wedding_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          name: string
          wedding_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          name?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_drafts: {
        Row: {
          completed_at: string | null
          created_at: string
          data: Json
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data?: Json
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data?: Json
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          onboarding_completed_at: string | null
          onboarding_completed_roles: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_completed_roles?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_completed_roles?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registries: {
        Row: {
          country_code: string | null
          created_at: string
          currency_code: string | null
          id: string
          is_public: boolean
          message: string | null
          updated_at: string
          wedding_id: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          currency_code?: string | null
          id?: string
          is_public?: boolean
          message?: string | null
          updated_at?: string
          wedding_id: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          currency_code?: string | null
          id?: string
          is_public?: boolean
          message?: string | null
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registries_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      registry_items: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          is_most_wanted: boolean
          price_cents: number | null
          product_url: string | null
          quantity: number
          registry_id: string
          reserved_count: number
          retailer: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_most_wanted?: boolean
          price_cents?: number | null
          product_url?: string | null
          quantity?: number
          registry_id: string
          reserved_count?: number
          retailer?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_most_wanted?: boolean
          price_cents?: number | null
          product_url?: string | null
          quantity?: number
          registry_id?: string
          reserved_count?: number
          retailer?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registry_items_registry_id_fkey"
            columns: ["registry_id"]
            isOneToOne: false
            referencedRelation: "registries"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          id: string
          rating: number
          target_id: string
          target_type: string
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          id?: string
          rating: number
          target_id: string
          target_type: string
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          id?: string
          rating?: number
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      rsvp_questions: {
        Row: {
          created_at: string
          depends_on_question_id: string | null
          depends_on_value: string | null
          event_ids: string[]
          id: string
          is_required: boolean
          options: string[]
          question_text: string
          question_type: Database["public"]["Enums"]["rsvp_question_type"]
          sort_order: number
          updated_at: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          depends_on_question_id?: string | null
          depends_on_value?: string | null
          event_ids?: string[]
          id?: string
          is_required?: boolean
          options?: string[]
          question_text: string
          question_type?: Database["public"]["Enums"]["rsvp_question_type"]
          sort_order?: number
          updated_at?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          depends_on_question_id?: string | null
          depends_on_value?: string | null
          event_ids?: string[]
          id?: string
          is_required?: boolean
          options?: string[]
          question_text?: string
          question_type?: Database["public"]["Enums"]["rsvp_question_type"]
          sort_order?: number
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_questions_depends_on_question_id_fkey"
            columns: ["depends_on_question_id"]
            isOneToOne: false
            referencedRelation: "rsvp_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_questions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_responses: {
        Row: {
          answer_text: string | null
          answered_at: string
          event_id: string | null
          guest_id: string
          id: string
          question_id: string
        }
        Insert: {
          answer_text?: string | null
          answered_at?: string
          event_id?: string | null
          guest_id: string
          id?: string
          question_id: string
        }
        Update: {
          answer_text?: string | null
          answered_at?: string
          event_id?: string | null
          guest_id?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_responses_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "rsvp_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_assignments: {
        Row: {
          guest_id: string
          id: string
          table_id: string
        }
        Insert: {
          guest_id: string
          id?: string
          table_id: string
        }
        Update: {
          guest_id?: string
          id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_assignments_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "wedding_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_fixtures: {
        Row: {
          color: string | null
          created_at: string
          event_id: string
          height: number
          id: string
          kind: string
          label: string | null
          pos_x: number
          pos_y: number
          rotation: number
          shape: string
          updated_at: string
          width: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          event_id: string
          height?: number
          id?: string
          kind: string
          label?: string | null
          pos_x?: number
          pos_y?: number
          rotation?: number
          shape?: string
          updated_at?: string
          width?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          event_id?: string
          height?: number
          id?: string
          kind?: string
          label?: string | null
          pos_x?: number
          pos_y?: number
          rotation?: number
          shape?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "seating_fixtures_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_layouts: {
        Row: {
          background_color: string
          canvas_height: number
          canvas_width: number
          created_at: string
          event_id: string
          id: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          canvas_height?: number
          canvas_width?: number
          created_at?: string
          event_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          canvas_height?: number
          canvas_width?: number
          created_at?: string
          event_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seating_layouts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_categories: {
        Row: {
          id: string
          is_default: boolean
          name: string
          parent_id: string | null
          slug: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          is_default?: boolean
          name: string
          parent_id?: string | null
          slug?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          is_default?: boolean
          name?: string
          parent_id?: string | null
          slug?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vendor_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          business_name: string
          category_id: string | null
          contact_email: string | null
          contact_name: string | null
          countries_served: string[]
          created_at: string
          currency: string | null
          description: string | null
          destinations_serviced: string[]
          gallery_urls: string[]
          hero_image: string | null
          home_city: string | null
          home_country: string | null
          id: string
          instagram: string | null
          long_description: string | null
          owner_id: string | null
          photos: string[]
          price_max: number | null
          price_min: number | null
          price_tier: number | null
          status: Database["public"]["Enums"]["vendor_status"]
          subcategory_ids: string[]
          tags: string[]
          updated_at: string
          video_url: string | null
          website: string | null
          whatsapp: string | null
          years_in_business: number | null
        }
        Insert: {
          business_name: string
          category_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          countries_served?: string[]
          created_at?: string
          currency?: string | null
          description?: string | null
          destinations_serviced?: string[]
          gallery_urls?: string[]
          hero_image?: string | null
          home_city?: string | null
          home_country?: string | null
          id?: string
          instagram?: string | null
          long_description?: string | null
          owner_id?: string | null
          photos?: string[]
          price_max?: number | null
          price_min?: number | null
          price_tier?: number | null
          status?: Database["public"]["Enums"]["vendor_status"]
          subcategory_ids?: string[]
          tags?: string[]
          updated_at?: string
          video_url?: string | null
          website?: string | null
          whatsapp?: string | null
          years_in_business?: number | null
        }
        Update: {
          business_name?: string
          category_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          countries_served?: string[]
          created_at?: string
          currency?: string | null
          description?: string | null
          destinations_serviced?: string[]
          gallery_urls?: string[]
          hero_image?: string | null
          home_city?: string | null
          home_country?: string | null
          id?: string
          instagram?: string | null
          long_description?: string | null
          owner_id?: string | null
          photos?: string[]
          price_max?: number | null
          price_min?: number | null
          price_tier?: number | null
          status?: Database["public"]["Enums"]["vendor_status"]
          subcategory_ids?: string[]
          tags?: string[]
          updated_at?: string
          video_url?: string | null
          website?: string | null
          whatsapp?: string | null
          years_in_business?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          capacity: number | null
          capacity_seated: number | null
          capacity_standing: number | null
          city: string
          contact_email: string | null
          country: string
          created_at: string
          currency: string | null
          description: string | null
          facilities: string[]
          gallery_urls: string[]
          hero_image: string | null
          id: string
          long_description: string | null
          name: string
          owner_id: string | null
          photos: string[]
          price_range: string | null
          price_tier: number | null
          restrictions: string[]
          status: Database["public"]["Enums"]["venue_status"]
          updated_at: string
          video_url: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          capacity_seated?: number | null
          capacity_standing?: number | null
          city: string
          contact_email?: string | null
          country: string
          created_at?: string
          currency?: string | null
          description?: string | null
          facilities?: string[]
          gallery_urls?: string[]
          hero_image?: string | null
          id?: string
          long_description?: string | null
          name: string
          owner_id?: string | null
          photos?: string[]
          price_range?: string | null
          price_tier?: number | null
          restrictions?: string[]
          status?: Database["public"]["Enums"]["venue_status"]
          updated_at?: string
          video_url?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          capacity_seated?: number | null
          capacity_standing?: number | null
          city?: string
          contact_email?: string | null
          country?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          facilities?: string[]
          gallery_urls?: string[]
          hero_image?: string | null
          id?: string
          long_description?: string | null
          name?: string
          owner_id?: string | null
          photos?: string[]
          price_range?: string | null
          price_tier?: number | null
          restrictions?: string[]
          status?: Database["public"]["Enums"]["venue_status"]
          updated_at?: string
          video_url?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      website_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          image_url: string | null
          section_type: string
          sort_order: number
          updated_at: string
          visible: boolean
          wedding_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          section_type: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
          wedding_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          section_type?: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_sections_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          sort_order: number
          url: string
          wedding_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          url: string
          wedding_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          url?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_photos_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_tables: {
        Row: {
          event_id: string
          height: number
          id: string
          label: string
          mat_color: string | null
          pos_x: number
          pos_y: number
          rotation: number
          seats: number
          shape: string
          sort_order: number
          width: number
        }
        Insert: {
          event_id: string
          height?: number
          id?: string
          label: string
          mat_color?: string | null
          pos_x?: number
          pos_y?: number
          rotation?: number
          seats?: number
          shape?: string
          sort_order?: number
          width?: number
        }
        Update: {
          event_id?: string
          height?: number
          id?: string
          label?: string
          mat_color?: string | null
          pos_x?: number
          pos_y?: number
          rotation?: number
          seats?: number
          shape?: string
          sort_order?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "wedding_tables_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      weddings: {
        Row: {
          accent_color: string | null
          attendance_accept_label: string
          attendance_allow_maybe: boolean
          attendance_decline_label: string
          attendance_maybe_label: string
          attendance_question_text: string
          budget_currency: string
          budget_limit: number | null
          budget_setup_completed: boolean
          cover_photo_url: string | null
          created_at: string
          destination_city: string | null
          destination_country: string | null
          est_guest_count: number | null
          hero_image_url: string | null
          id: string
          owner_id: string
          partner_a: string
          partner_b: string
          site_config: Json
          site_customization: Json
          site_published: boolean
          site_sections: Json
          site_template_id: string
          slug: string | null
          story_html: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          accent_color?: string | null
          attendance_accept_label?: string
          attendance_allow_maybe?: boolean
          attendance_decline_label?: string
          attendance_maybe_label?: string
          attendance_question_text?: string
          budget_currency?: string
          budget_limit?: number | null
          budget_setup_completed?: boolean
          cover_photo_url?: string | null
          created_at?: string
          destination_city?: string | null
          destination_country?: string | null
          est_guest_count?: number | null
          hero_image_url?: string | null
          id?: string
          owner_id: string
          partner_a: string
          partner_b: string
          site_config?: Json
          site_customization?: Json
          site_published?: boolean
          site_sections?: Json
          site_template_id?: string
          slug?: string | null
          story_html?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          accent_color?: string | null
          attendance_accept_label?: string
          attendance_allow_maybe?: boolean
          attendance_decline_label?: string
          attendance_maybe_label?: string
          attendance_question_text?: string
          budget_currency?: string
          budget_limit?: number | null
          budget_setup_completed?: boolean
          cover_photo_url?: string | null
          created_at?: string
          destination_city?: string | null
          destination_country?: string | null
          est_guest_count?: number | null
          hero_image_url?: string | null
          id?: string
          owner_id?: string
          partner_a?: string
          partner_b?: string
          site_config?: Json
          site_customization?: Json
          site_published?: boolean
          site_sections?: Json
          site_template_id?: string
          slug?: string | null
          story_html?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      menu_sections: {
        Row: {
          created_at: string
          event_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_sections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          created_at: string
          description: string | null
          dietary_tags: string[]
          id: string
          name: string
          section_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          dietary_tags?: string[]
          id?: string
          name: string
          section_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          dietary_tags?: string[]
          id?: string
          name?: string
          section_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "menu_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          custom_fields: Json
          description: string | null
          event_id: string | null
          id: string
          name: string
          paid_by: string | null
          paid_date: string | null
          payment_method: string | null
          sort_order: number
          status: string
          wedding_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          custom_fields?: Json
          description?: string | null
          event_id?: string | null
          id?: string
          name: string
          paid_by?: string | null
          paid_date?: string | null
          payment_method?: string | null
          sort_order?: number
          status?: string
          wedding_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          custom_fields?: Json
          description?: string | null
          event_id?: string | null
          id?: string
          name?: string
          paid_by?: string | null
          paid_date?: string | null
          payment_method?: string | null
          sort_order?: number
          status?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_custom_columns: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          type: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          type: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          type?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_custom_columns_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_rsvp_context: {
        Args: { _token: string }
        Returns: {
          attendance_accept_label: string
          attendance_allow_maybe: boolean
          attendance_decline_label: string
          attendance_maybe_label: string
          attendance_question_text: string
          city: string | null
          current_plus_ones: number
          current_status: Database["public"]["Enums"]["rsvp_status"]
          event_date: string | null
          event_id: string | null
          event_name: string | null
          event_time: string | null
          guest_id: string
          guest_name: string
          partner_a: string
          partner_b: string
          rsvp_submitted_at: string | null
          venue_name: string | null
          wedding_id: string
        }[]
      }
      get_rsvp_questions: {
        Args: { _token: string }
        Returns: {
          depends_on_question_id: string | null
          depends_on_value: string | null
          event_id: string | null
          event_name: string | null
          existing_answer: string | null
          is_required: boolean
          options: string[]
          question_id: string
          question_text: string
          question_type: Database["public"]["Enums"]["rsvp_question_type"]
          sort_order: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_rsvp_submitted: {
        Args: { _submitted: boolean; _token: string }
        Returns: undefined
      }
      submit_rsvp: {
        Args: {
          _event_id: string
          _plus_ones: number
          _status: Database["public"]["Enums"]["rsvp_status"]
          _token: string
        }
        Returns: undefined
      }
      submit_rsvp_answer: {
        Args: {
          _answer_text: string
          _event_id: string | null
          _question_id: string
          _token: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "couple" | "vendor" | "admin" | "venue" | "seller" | "planner"
      message_kind:
        | "save_the_date"
        | "rsvp_request"
        | "reminder"
        | "thank_you"
        | "custom"
      message_status: "queued" | "sending" | "sent" | "delivered" | "failed"
      rsvp_question_type: "yes_no" | "multiple_choice" | "short_text"
      rsvp_status: "pending" | "attending" | "declined" | "maybe"
      vendor_status: "pending" | "approved" | "rejected"
      venue_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["couple", "vendor", "admin", "venue", "seller", "planner"],
      message_kind: [
        "save_the_date",
        "rsvp_request",
        "reminder",
        "thank_you",
        "custom",
      ],
      message_status: ["queued", "sending", "sent", "delivered", "failed"],
      rsvp_question_type: ["yes_no", "multiple_choice", "short_text"],
      rsvp_status: ["pending", "attending", "declined", "maybe"],
      vendor_status: ["pending", "approved", "rejected"],
      venue_status: ["pending", "approved", "rejected"],
    },
  },
} as const
