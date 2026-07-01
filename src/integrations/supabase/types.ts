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
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          event_date: string | null
          event_time: string | null
          id: string
          name: string
          sort_order: number
          venue_name: string | null
          wedding_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          id?: string
          name: string
          sort_order?: number
          venue_name?: string | null
          wedding_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_time?: string | null
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
          food_allergies: string[]
          full_name: string
          household_group: string | null
          id: string
          phone: string | null
          rsvp_token: string
          wedding_id: string
        }
        Insert: {
          accessibility_notes?: string | null
          created_at?: string
          dietary_notes?: string | null
          dietary_tags?: string[]
          email?: string | null
          food_allergies?: string[]
          full_name: string
          household_group?: string | null
          id?: string
          phone?: string | null
          rsvp_token?: string
          wedding_id: string
        }
        Update: {
          accessibility_notes?: string | null
          created_at?: string
          dietary_notes?: string | null
          dietary_tags?: string[]
          email?: string | null
          food_allergies?: string[]
          full_name?: string
          household_group?: string | null
          id?: string
          phone?: string | null
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
          condition: string | null
          created_at: string
          description: string | null
          id: string
          photos: string[]
          price: number | null
          seller_id: string
          status: string
          title: string
        }
        Insert: {
          category?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          photos?: string[]
          price?: number | null
          seller_id: string
          status?: string
          title: string
        }
        Update: {
          category?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          photos?: string[]
          price?: number | null
          seller_id?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
        }
        Insert: {
          id?: string
          is_default?: boolean
          name: string
        }
        Update: {
          id?: string
          is_default?: boolean
          name?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          business_name: string
          category_id: string | null
          created_at: string
          description: string | null
          destinations_serviced: string[]
          gallery_urls: string[]
          hero_image: string | null
          home_city: string | null
          home_country: string | null
          id: string
          owner_id: string | null
          price_max: number | null
          price_min: number | null
          status: Database["public"]["Enums"]["vendor_status"]
          tags: string[]
        }
        Insert: {
          business_name: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          destinations_serviced?: string[]
          gallery_urls?: string[]
          hero_image?: string | null
          home_city?: string | null
          home_country?: string | null
          id?: string
          owner_id?: string | null
          price_max?: number | null
          price_min?: number | null
          status?: Database["public"]["Enums"]["vendor_status"]
          tags?: string[]
        }
        Update: {
          business_name?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          destinations_serviced?: string[]
          gallery_urls?: string[]
          hero_image?: string | null
          home_city?: string | null
          home_country?: string | null
          id?: string
          owner_id?: string | null
          price_max?: number | null
          price_min?: number | null
          status?: Database["public"]["Enums"]["vendor_status"]
          tags?: string[]
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
          capacity: number | null
          city: string
          country: string
          created_at: string
          description: string | null
          gallery_urls: string[]
          hero_image: string | null
          id: string
          name: string
          price_range: string | null
        }
        Insert: {
          capacity?: number | null
          city: string
          country: string
          created_at?: string
          description?: string | null
          gallery_urls?: string[]
          hero_image?: string | null
          id?: string
          name: string
          price_range?: string | null
        }
        Update: {
          capacity?: number | null
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          gallery_urls?: string[]
          hero_image?: string | null
          id?: string
          name?: string
          price_range?: string | null
        }
        Relationships: []
      }
      wedding_tables: {
        Row: {
          event_id: string
          id: string
          label: string
          seats: number
          sort_order: number
        }
        Insert: {
          event_id: string
          id?: string
          label: string
          seats?: number
          sort_order?: number
        }
        Update: {
          event_id?: string
          id?: string
          label?: string
          seats?: number
          sort_order?: number
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
          site_published: boolean
          site_template_id: string
          slug: string | null
          updated_at: string
        }
        Insert: {
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
          site_published?: boolean
          site_template_id?: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
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
          site_published?: boolean
          site_template_id?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_rsvp_context: {
        Args: { _token: string }
        Returns: {
          city: string
          current_plus_ones: number
          current_status: Database["public"]["Enums"]["rsvp_status"]
          event_date: string
          event_id: string
          event_name: string
          event_time: string
          guest_id: string
          guest_name: string
          partner_a: string
          partner_b: string
          venue_name: string
          wedding_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
    }
    Enums: {
      app_role: "couple" | "vendor" | "admin"
      message_kind:
        | "save_the_date"
        | "rsvp_request"
        | "reminder"
        | "thank_you"
        | "custom"
      message_status: "queued" | "sending" | "sent" | "delivered" | "failed"
      rsvp_status: "pending" | "attending" | "declined" | "maybe"
      vendor_status: "pending" | "approved" | "rejected"
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
      app_role: ["couple", "vendor", "admin"],
      message_kind: [
        "save_the_date",
        "rsvp_request",
        "reminder",
        "thank_you",
        "custom",
      ],
      message_status: ["queued", "sending", "sent", "delivered", "failed"],
      rsvp_status: ["pending", "attending", "declined", "maybe"],
      vendor_status: ["pending", "approved", "rejected"],
    },
  },
} as const
