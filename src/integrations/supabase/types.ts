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
      business_private: {
        Row: {
          business_id: string
          updated_at: string
          vat_tax_number: string | null
        }
        Insert: {
          business_id: string
          updated_at?: string
          vat_tax_number?: string | null
        }
        Update: {
          business_id?: string
          updated_at?: string
          vat_tax_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_private_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          business_description: string
          business_type: Database["public"]["Enums"]["business_type"]
          country: string | null
          city: string | null
          address: string | null
          social_media: string | null
          instagram_url: string | null
          tiktok_url: string | null
          facebook_url: string | null
          youtube_url: string | null
          website_url: string | null
          booking_link_url: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          legal_business_name: string
          updated_at: string
          user_id: string | null
          verification_status: Database["public"]["Enums"]["business_verification_status"]
        }
        Insert: {
          business_description: string
          business_type: Database["public"]["Enums"]["business_type"]
          country?: string | null
          city?: string | null
          address?: string | null
          social_media?: string | null
          instagram_url?: string | null
          tiktok_url?: string | null
          facebook_url?: string | null
          youtube_url?: string | null
          website_url?: string | null
          booking_link_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          legal_business_name: string
          updated_at?: string
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["business_verification_status"]
        }
        Update: {
          business_description?: string
          business_type?: Database["public"]["Enums"]["business_type"]
          country?: string | null
          city?: string | null
          address?: string | null
          social_media?: string | null
          instagram_url?: string | null
          tiktok_url?: string | null
          facebook_url?: string | null
          youtube_url?: string | null
          website_url?: string | null
          booking_link_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          legal_business_name?: string
          updated_at?: string
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["business_verification_status"]
        }
        Relationships: []
      }
      business_claims: {
        Row: {
          id: string
          business_id: string
          claimant_user_id: string
          claimant_email: string
          message: string | null
          status: "pending" | "approved" | "rejected"
          created_at: string
          decided_at: string | null
        }
        Insert: {
          id?: string
          business_id: string
          claimant_user_id: string
          claimant_email: string
          message?: string | null
          status?: "pending" | "approved" | "rejected"
          created_at?: string
          decided_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          claimant_user_id?: string
          claimant_email?: string
          message?: string | null
          status?: "pending" | "approved" | "rejected"
          created_at?: string
          decided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_suggestions: {
        Row: {
          id: string
          business_id: string
          suggested_by_user_id: string
          suggested_by_email: string
          message: string
          status: "pending" | "approved" | "rejected"
          created_at: string
          decided_at: string | null
        }
        Insert: {
          id?: string
          business_id: string
          suggested_by_user_id: string
          suggested_by_email: string
          message: string
          status?: "pending" | "approved" | "rejected"
          created_at?: string
          decided_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          suggested_by_user_id?: string
          suggested_by_email?: string
          message?: string
          status?: "pending" | "approved" | "rejected"
          created_at?: string
          decided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_suggestions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_listings: {
        Row: {
          id: string
          user_id: string
          business_id: string
          listing_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_id: string
          listing_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_id?: string
          listing_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vendor_services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_documents: {
        Row: {
          business_id: string
          file_name: string
          file_url: string
          id: string
          uploaded_at: string
        }
        Insert: {
          business_id: string
          file_name: string
          file_url: string
          id?: string
          uploaded_at?: string
        }
        Update: {
          business_id?: string
          file_name?: string
          file_url?: string
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_media: {
        Row: {
          business_id: string
          created_at: string
          id: string
          listing_id: string | null
          media_type: Database["public"]["Enums"]["business_media_type"]
          sort_order: number
          url: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          listing_id?: string | null
          media_type: Database["public"]["Enums"]["business_media_type"]
          sort_order?: number
          url: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          media_type?: Database["public"]["Enums"]["business_media_type"]
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_media_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "vendor_services"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          allocated_amount: number | null
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
          dress_code: string | null
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
          allocated_amount?: number | null
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
          dress_code?: string | null
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
          allocated_amount?: number | null
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
          dress_code?: string | null
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
          rsvp_source: Database["public"]["Enums"]["rsvp_source"]
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
        }
        Insert: {
          event_id: string
          guest_id: string
          id?: string
          plus_ones?: number
          rsvp_at?: string | null
          rsvp_source?: Database["public"]["Enums"]["rsvp_source"]
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Update: {
          event_id?: string
          guest_id?: string
          id?: string
          plus_ones?: number
          rsvp_at?: string | null
          rsvp_source?: Database["public"]["Enums"]["rsvp_source"]
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
          tags: string[]
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
          tags?: string[]
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
          tags?: string[]
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
      lead_forms: {
        Row: {
          business_id: string
          created_at: string
          id: string
          title: string
          vendor_service_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          title?: string
          vendor_service_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          title?: string
          vendor_service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_forms_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_forms_vendor_service_id_fkey"
            columns: ["vendor_service_id"]
            isOneToOne: false
            referencedRelation: "vendor_services"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_form_fields: {
        Row: {
          field_type: Database["public"]["Enums"]["lead_form_field_type"]
          id: string
          label: string
          lead_form_id: string
          options: Json
          required: boolean
          sort_order: number
        }
        Insert: {
          field_type: Database["public"]["Enums"]["lead_form_field_type"]
          id?: string
          label: string
          lead_form_id: string
          options?: Json
          required?: boolean
          sort_order?: number
        }
        Update: {
          field_type?: Database["public"]["Enums"]["lead_form_field_type"]
          id?: string
          label?: string
          lead_form_id?: string
          options?: Json
          required?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_form_fields_lead_form_id_fkey"
            columns: ["lead_form_id"]
            isOneToOne: false
            referencedRelation: "lead_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_form_submissions: {
        Row: {
          created_at: string
          id: string
          lead_form_id: string | null
          responses: Json
          vendor_service_id: string | null
          business_id: string | null
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_form_id?: string | null
          responses?: Json
          vendor_service_id?: string | null
          business_id?: string | null
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_form_id?: string | null
          responses?: Json
          vendor_service_id?: string | null
          business_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_form_submissions_lead_form_id_fkey"
            columns: ["lead_form_id"]
            isOneToOne: false
            referencedRelation: "lead_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_form_submissions_vendor_service_id_fkey"
            columns: ["vendor_service_id"]
            isOneToOne: false
            referencedRelation: "vendor_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_form_submissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_form_submissions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_details: {
        Row: {
          business_id: string
          capacity_min: number | null
          capacity_max: number | null
          capacity_seated: number | null
          capacity_standing: number | null
          type_of_space: string[]
          facilities_included: string[]
          facilities_excluded: string[]
          price_range_min: number | null
          price_range_max: number | null
          currency: string
          about_sections: Json
          faqs: Json
          price_start_from: number | null
          price_start_from_currency: string | null
          minimum_spend: number | null
          minimum_spend_currency: string | null
          price_details: string | null
          price_includes: string[]
          price_additional_costs: string[]
        }
        Insert: {
          business_id: string
          capacity_min?: number | null
          capacity_max?: number | null
          capacity_seated?: number | null
          capacity_standing?: number | null
          type_of_space?: string[]
          facilities_included?: string[]
          facilities_excluded?: string[]
          price_range_min?: number | null
          price_range_max?: number | null
          currency?: string
          about_sections?: Json
          faqs?: Json
          price_start_from?: number | null
          price_start_from_currency?: string | null
          minimum_spend?: number | null
          minimum_spend_currency?: string | null
          price_details?: string | null
          price_includes?: string[]
          price_additional_costs?: string[]
        }
        Update: {
          business_id?: string
          capacity_min?: number | null
          capacity_max?: number | null
          capacity_seated?: number | null
          capacity_standing?: number | null
          type_of_space?: string[]
          facilities_included?: string[]
          facilities_excluded?: string[]
          price_range_min?: number | null
          price_range_max?: number | null
          currency?: string
          about_sections?: Json
          faqs?: Json
          price_start_from?: number | null
          price_start_from_currency?: string | null
          minimum_spend?: number | null
          minimum_spend_currency?: string | null
          price_details?: string | null
          price_includes?: string[]
          price_additional_costs?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "venue_details_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
          to_email: string | null
          to_phone: string | null
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
          to_email?: string | null
          to_phone?: string | null
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
          to_email?: string | null
          to_phone?: string | null
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
          contribution_instructions: string | null
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
          contribution_instructions?: string | null
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
          contribution_instructions?: string | null
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
          kind: string
          purchased_at: string | null
          purchased_by: string | null
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
          kind?: string
          purchased_at?: string | null
          purchased_by?: string | null
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
          kind?: string
          purchased_at?: string | null
          purchased_by?: string | null
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
          id: string
          business_id: string
          wedding_id: string
          rating: number
          review_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          wedding_id: string
          rating: number
          review_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          wedding_id?: string
          rating?: number
          review_text?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_questions: {
        Row: {
          created_at: string
          depends_on_question_id: string | null
          depends_on_value: string | null
          event_ids: string[]
          guest_column_label: string | null
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
          guest_column_label?: string | null
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
          guest_column_label?: string | null
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
          seat_index: number | null
          table_id: string
        }
        Insert: {
          guest_id: string
          id?: string
          seat_index?: number | null
          table_id: string
        }
        Update: {
          guest_id?: string
          id?: string
          seat_index?: number | null
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
      seating_areas: {
        Row: {
          color: string
          created_at: string
          event_id: string
          height: number
          id: string
          label: string
          pos_x: number
          pos_y: number
          sort_order: number
          updated_at: string
          width: number
        }
        Insert: {
          color?: string
          created_at?: string
          event_id: string
          height?: number
          id?: string
          label: string
          pos_x?: number
          pos_y?: number
          sort_order?: number
          updated_at?: string
          width?: number
        }
        Update: {
          color?: string
          created_at?: string
          event_id?: string
          height?: number
          id?: string
          label?: string
          pos_x?: number
          pos_y?: number
          sort_order?: number
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "seating_areas_event_id_fkey"
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
          suggested_lead_fields: Json
        }
        Insert: {
          id?: string
          is_default?: boolean
          name: string
          parent_id?: string | null
          slug?: string | null
          sort_order?: number
          suggested_lead_fields?: Json
        }
        Update: {
          id?: string
          is_default?: boolean
          name?: string
          parent_id?: string | null
          slug?: string | null
          sort_order?: number
          suggested_lead_fields?: Json
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
      vendor_services: {
        Row: {
          business_id: string
          category_id: string | null
          category_ids: string[]
          created_at: string
          currency: string
          description: string | null
          id: string
          price_range_max: number | null
          price_range_min: number | null
          price_start_from: number | null
          price_start_from_currency: string | null
          minimum_spend: number | null
          minimum_spend_currency: string | null
          about_sections: Json
          faqs: Json
          price_details: string | null
          price_includes: string[]
          price_additional_costs: string[]
          service_name: string | null
          status: Database["public"]["Enums"]["vendor_service_status"]
        }
        Insert: {
          business_id: string
          category_id?: string | null
          category_ids?: string[]
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          price_range_max?: number | null
          price_range_min?: number | null
          price_start_from?: number | null
          price_start_from_currency?: string | null
          minimum_spend?: number | null
          minimum_spend_currency?: string | null
          about_sections?: Json
          faqs?: Json
          price_details?: string | null
          price_includes?: string[]
          price_additional_costs?: string[]
          service_name?: string | null
          status?: Database["public"]["Enums"]["vendor_service_status"]
        }
        Update: {
          business_id?: string
          category_id?: string | null
          category_ids?: string[]
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          price_range_max?: number | null
          price_range_min?: number | null
          price_start_from?: number | null
          price_start_from_currency?: string | null
          minimum_spend?: number | null
          minimum_spend_currency?: string | null
          about_sections?: Json
          faqs?: Json
          price_details?: string | null
          price_includes?: string[]
          price_additional_costs?: string[]
          service_name?: string | null
          status?: Database["public"]["Enums"]["vendor_service_status"]
        }
        Relationships: [
          {
            foreignKeyName: "vendor_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_services_category_id_fkey"
            columns: ["category_id"]
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
          business_license_url: string | null
          capacity: number | null
          capacity_seated: number | null
          capacity_standing: number | null
          city: string
          contact_email: string | null
          country: string
          created_at: string
          currency: string | null
          description: string | null
          event_spaces: Json
          facilities: string[]
          gallery_urls: string[]
          hero_image: string | null
          id: string
          is_featured: boolean
          long_description: string | null
          menu_options: string[]
          name: string
          owner_id: string | null
          packages: Json
          photos: string[]
          price_max: number | null
          price_min: number | null
          price_range: string | null
          price_tier: number | null
          rentals_available: string[]
          restrictions: string[]
          setting: string[]
          status: Database["public"]["Enums"]["venue_status"]
          transportation: string[]
          updated_at: string
          venue_type: string[]
          video_url: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          business_license_url?: string | null
          capacity?: number | null
          capacity_seated?: number | null
          capacity_standing?: number | null
          city: string
          contact_email?: string | null
          country: string
          created_at?: string
          currency?: string | null
          description?: string | null
          event_spaces?: Json
          facilities?: string[]
          gallery_urls?: string[]
          hero_image?: string | null
          id?: string
          is_featured?: boolean
          long_description?: string | null
          menu_options?: string[]
          name: string
          owner_id?: string | null
          packages?: Json
          photos?: string[]
          price_max?: number | null
          price_min?: number | null
          price_range?: string | null
          price_tier?: number | null
          rentals_available?: string[]
          restrictions?: string[]
          setting?: string[]
          status?: Database["public"]["Enums"]["venue_status"]
          transportation?: string[]
          updated_at?: string
          venue_type?: string[]
          video_url?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          business_license_url?: string | null
          capacity?: number | null
          capacity_seated?: number | null
          capacity_standing?: number | null
          city?: string
          contact_email?: string | null
          country?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          event_spaces?: Json
          facilities?: string[]
          gallery_urls?: string[]
          hero_image?: string | null
          id?: string
          is_featured?: boolean
          long_description?: string | null
          menu_options?: string[]
          name?: string
          owner_id?: string | null
          packages?: Json
          photos?: string[]
          price_max?: number | null
          price_min?: number | null
          price_range?: string | null
          price_tier?: number | null
          rentals_available?: string[]
          restrictions?: string[]
          setting?: string[]
          status?: Database["public"]["Enums"]["venue_status"]
          transportation?: string[]
          updated_at?: string
          venue_type?: string[]
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
      wedding_enquiry_defaults: {
        Row: {
          wedding_id: string
          full_name: string | null
          email: string | null
          phone: string | null
          approx_guests: number | null
          preferred_dates: string | null
          updated_at: string
        }
        Insert: {
          wedding_id: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          approx_guests?: number | null
          preferred_dates?: string | null
          updated_at?: string
        }
        Update: {
          wedding_id?: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          approx_guests?: number | null
          preferred_dates?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_enquiry_defaults_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
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
          seat_arrangement: string | null
          seat_layout: Json | null
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
          seat_arrangement?: string | null
          seat_layout?: Json | null
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
          seat_arrangement?: string | null
          seat_layout?: Json | null
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
          budget_allocation_mode: string
          budget_currency: string
          budget_limit: number | null
          budget_setup_completed: boolean
          couple_photo_pan_x: number
          couple_photo_pan_y: number
          couple_photo_zoom: number
          couple_photo_url: string | null
          cover_photo_url: string | null
          created_at: string
          dashboard_layout: Json | null
          destination_city: string | null
          destination_country: string | null
          est_guest_count: number | null
          hero_image_url: string | null
          id: string
          owner_id: string
          partner_a: string
          partner_b: string
          rsvp_mode: string
          seating_shape_defaults: Json | null
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
          budget_allocation_mode?: string
          budget_currency?: string
          budget_limit?: number | null
          budget_setup_completed?: boolean
          couple_photo_pan_x?: number
          couple_photo_pan_y?: number
          couple_photo_zoom?: number
          couple_photo_url?: string | null
          cover_photo_url?: string | null
          created_at?: string
          dashboard_layout?: Json | null
          destination_city?: string | null
          destination_country?: string | null
          est_guest_count?: number | null
          hero_image_url?: string | null
          id?: string
          owner_id: string
          partner_a: string
          partner_b: string
          rsvp_mode?: string
          seating_shape_defaults?: Json | null
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
          budget_allocation_mode?: string
          budget_currency?: string
          budget_limit?: number | null
          budget_setup_completed?: boolean
          couple_photo_pan_x?: number
          couple_photo_pan_y?: number
          couple_photo_zoom?: number
          couple_photo_url?: string | null
          cover_photo_url?: string | null
          created_at?: string
          dashboard_layout?: Json | null
          destination_city?: string | null
          destination_country?: string | null
          est_guest_count?: number | null
          hero_image_url?: string | null
          id?: string
          owner_id?: string
          partner_a?: string
          partner_b?: string
          rsvp_mode?: string
          seating_shape_defaults?: Json | null
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
      wedding_collaborators: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          user_id: string | null
          wedding_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          user_id?: string | null
          wedding_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          user_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_collaborators_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
          wedding_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          wedding_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_waitlist: {
        Row: {
          created_at: string
          feature: string
          id: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_waitlist_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string | null
          rating: number
          wedding_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          rating: number
          wedding_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          rating?: number
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
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
          due_date: string | null
          event_id: string | null
          id: string
          name: string
          paid_by: string | null
          paid_date: string | null
          reminder_at: string | null
          reminder_sent_at: string | null
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
          due_date?: string | null
          event_id?: string | null
          id?: string
          name: string
          paid_by?: string | null
          paid_date?: string | null
          reminder_at?: string | null
          reminder_sent_at?: string | null
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
          due_date?: string | null
          event_id?: string | null
          id?: string
          name?: string
          paid_by?: string | null
          paid_date?: string | null
          reminder_at?: string | null
          reminder_sent_at?: string | null
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
          allocated_amount: number | null
          created_at: string
          id: string
          name: string
          sort_order: number
          wedding_id: string
        }
        Insert: {
          allocated_amount?: number | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          wedding_id: string
        }
        Update: {
          allocated_amount?: number | null
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
      food_tags: {
        Row: {
          abbr: string | null
          color: string
          created_at: string
          emoji: string | null
          id: string
          kind: string
          name: string
          wedding_id: string
        }
        Insert: {
          abbr?: string | null
          color?: string
          created_at?: string
          emoji?: string | null
          id?: string
          kind?: string
          name: string
          wedding_id: string
        }
        Update: {
          abbr?: string | null
          color?: string
          created_at?: string
          emoji?: string | null
          id?: string
          kind?: string
          name?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_tags_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          account_email: string | null
          created_at: string
          id: string
          provider: string
          wedding_id: string
        }
        Insert: {
          account_email?: string | null
          created_at?: string
          id?: string
          provider?: string
          wedding_id: string
        }
        Update: {
          account_email?: string | null
          created_at?: string
          id?: string
          provider?: string
          wedding_id?: string
        }
        Relationships: []
      }
      integration_links: {
        Row: {
          auto_sync: boolean
          created_at: string
          id: string
          integration_id: string
          kind: string
          last_error: string | null
          last_synced_at: string | null
          sheet_title: string
          spreadsheet_id: string
          spreadsheet_url: string
          wedding_id: string
        }
        Insert: {
          auto_sync?: boolean
          created_at?: string
          id?: string
          integration_id: string
          kind: string
          last_error?: string | null
          last_synced_at?: string | null
          sheet_title: string
          spreadsheet_id: string
          spreadsheet_url: string
          wedding_id: string
        }
        Update: {
          auto_sync?: boolean
          created_at?: string
          id?: string
          integration_id?: string
          kind?: string
          last_error?: string | null
          last_synced_at?: string | null
          sheet_title?: string
          spreadsheet_id?: string
          spreadsheet_url?: string
          wedding_id?: string
        }
        Relationships: []
      }
      guest_tags: {
        Row: {
          color: string
          created_at: string
          emoji: string | null
          id: string
          name: string
          wedding_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          wedding_id: string
        }
        Update: {
          color?: string
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_tags_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          amount: number | null
          created_at: string
          due_date: string
          expense_id: string | null
          id: string
          is_done: boolean
          notes: string | null
          title: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          due_date: string
          expense_id?: string | null
          id?: string
          is_done?: boolean
          notes?: string | null
          title: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          due_date?: string
          expense_id?: string | null
          id?: string
          is_done?: boolean
          notes?: string | null
          title?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      enquiry_rates: {
        Row: {
          id: string
          country_code: string | null
          amount_cents: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          country_code?: string | null
          amount_cents: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          country_code?: string | null
          amount_cents?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string
          stripe_payment_method_id: string
          card_brand: string | null
          card_last4: string | null
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id: string
          stripe_payment_method_id: string
          card_brand?: string | null
          card_last4?: string | null
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string
          stripe_payment_method_id?: string
          card_brand?: string | null
          card_last4?: string | null
          is_default?: boolean
          created_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          wedding_id: string
          business_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wedding_id: string
          business_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wedding_id?: string
          business_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_role: string
          sender_user_id: string | null
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_role: string
          sender_user_id?: string | null
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_role?: string
          sender_user_id?: string | null
          body?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          id: string
          wedding_id: string
          business_id: string
          vendor_service_id: string | null
          lead_form_submission_id: string
          conversation_id: string
          status: Database["public"]["Enums"]["enquiry_status"]
          created_at: string
        }
        Insert: {
          id?: string
          wedding_id: string
          business_id: string
          vendor_service_id?: string | null
          lead_form_submission_id: string
          conversation_id: string
          status?: Database["public"]["Enums"]["enquiry_status"]
          created_at?: string
        }
        Update: {
          id?: string
          wedding_id?: string
          business_id?: string
          vendor_service_id?: string | null
          lead_form_submission_id?: string
          conversation_id?: string
          status?: Database["public"]["Enums"]["enquiry_status"]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_vendor_service_id_fkey"
            columns: ["vendor_service_id"]
            isOneToOne: false
            referencedRelation: "vendor_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_lead_form_submission_id_fkey"
            columns: ["lead_form_submission_id"]
            isOneToOne: false
            referencedRelation: "lead_form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_charges: {
        Row: {
          id: string
          enquiry_id: string | null
          stripe_payment_intent_id: string | null
          amount_cents: number
          currency: string
          status: Database["public"]["Enums"]["enquiry_charge_status"]
          charged_at: string
        }
        Insert: {
          id?: string
          enquiry_id?: string | null
          stripe_payment_intent_id?: string | null
          amount_cents: number
          currency: string
          status: Database["public"]["Enums"]["enquiry_charge_status"]
          charged_at?: string
        }
        Update: {
          id?: string
          enquiry_id?: string | null
          stripe_payment_intent_id?: string | null
          amount_cents?: number
          currency?: string
          status?: Database["public"]["Enums"]["enquiry_charge_status"]
          charged_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_charges_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_guest_for_rsvp: {
        Args: { _full_name: string; _slug: string }
        Returns: { guest_id: string; rsvp_token: string }[]
      }
      get_guest_rsvp_token: {
        Args: { _guest_id: string; _slug: string }
        Returns: string
      }
      get_my_current_wedding: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Tables"]["weddings"]["Row"]
      }
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
      get_wedding_rsvp_context: {
        Args: { _slug: string }
        Returns: {
          attendance_accept_label: string
          attendance_allow_maybe: boolean
          attendance_decline_label: string
          attendance_maybe_label: string
          attendance_question_text: string
          city: string | null
          event_date: string | null
          event_id: string | null
          event_name: string | null
          event_time: string | null
          partner_a: string
          partner_b: string
          venue_name: string | null
          wedding_id: string
        }[]
      }
      get_wedding_rsvp_questions: {
        Args: { _slug: string }
        Returns: {
          depends_on_question_id: string | null
          depends_on_value: string | null
          event_id: string | null
          event_name: string | null
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
      has_wedding_access: {
        Args: { _wedding_id: string }
        Returns: boolean
      }
      match_guests_by_name: {
        Args: { _full_name: string; _slug: string }
        Returns: { guest_id: string; full_name: string; household_group: string | null }[]
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
      business_media_type: "photo" | "video"
      business_type: "vendor" | "venue"
      business_verification_status: "pending" | "verified" | "rejected"
      enquiry_status: "new" | "replied" | "closed"
      enquiry_charge_status: "succeeded" | "failed" | "skipped"
      lead_form_field_type: "text" | "number" | "textarea" | "date" | "select"
      message_kind:
        | "save_the_date"
        | "rsvp_request"
        | "reminder"
        | "thank_you"
        | "custom"
      message_status: "queued" | "sending" | "sent" | "delivered" | "failed"
      rsvp_question_type: "yes_no" | "multiple_choice" | "short_text"
      rsvp_source: "guest_submitted" | "manual"
      rsvp_status: "pending" | "attending" | "declined" | "maybe"
      vendor_service_status: "active" | "inactive"
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
      business_media_type: ["photo", "video"],
      business_type: ["vendor", "venue"],
      business_verification_status: ["pending", "verified", "rejected"],
      enquiry_status: ["new", "replied", "closed"],
      enquiry_charge_status: ["succeeded", "failed", "skipped"],
      lead_form_field_type: ["text", "number", "textarea", "date", "select"],
      message_kind: [
        "save_the_date",
        "rsvp_request",
        "reminder",
        "thank_you",
        "custom",
      ],
      message_status: ["queued", "sending", "sent", "delivered", "failed"],
      rsvp_question_type: ["yes_no", "multiple_choice", "short_text"],
      rsvp_source: ["guest_submitted", "manual"],
      rsvp_status: ["pending", "attending", "declined", "maybe"],
      vendor_service_status: ["active", "inactive"],
      vendor_status: ["pending", "approved", "rejected"],
      venue_status: ["pending", "approved", "rejected"],
    },
  },
} as const
