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
      activity_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          created_at: string
          position: number
          product_slug: string
        }
        Insert: {
          bundle_id: string
          created_at?: string
          position?: number
          product_slug: string
        }
        Update: {
          bundle_id?: string
          created_at?: string
          position?: number
          product_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          original_price: number | null
          price: number
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          original_price?: number | null
          price?: number
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          original_price?: number | null
          price?: number
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_slug: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_slug: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_slug?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_amount: number | null
          updated_at: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_amount?: number | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_amount?: number | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      hero_banners: {
        Row: {
          active: boolean
          background_color: string | null
          button_label: string
          button_link: string
          created_at: string
          gradient_from: string
          gradient_to: string
          heading: string
          id: string
          image_only: boolean
          image_url: string | null
          position: number
          show_button: boolean
          subheading: string
          text_color: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          background_color?: string | null
          button_label?: string
          button_link?: string
          created_at?: string
          gradient_from?: string
          gradient_to?: string
          heading?: string
          id?: string
          image_only?: boolean
          image_url?: string | null
          position?: number
          show_button?: boolean
          subheading?: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          background_color?: string | null
          button_label?: string
          button_link?: string
          created_at?: string
          gradient_from?: string
          gradient_to?: string
          heading?: string
          id?: string
          image_only?: boolean
          image_url?: string | null
          position?: number
          show_button?: boolean
          subheading?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          sent_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          sent_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          sent_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          download_token: string
          hidden_at: string | null
          id: string
          order_id: string
          product_code: string | null
          product_format: string | null
          product_image: string | null
          product_slug: string
          product_title: string
          quantity: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          download_token?: string
          hidden_at?: string | null
          id?: string
          order_id: string
          product_code?: string | null
          product_format?: string | null
          product_image?: string | null
          product_slug: string
          product_title: string
          quantity?: number
          unit_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          download_token?: string
          hidden_at?: string | null
          id?: string
          order_id?: string
          product_code?: string | null
          product_format?: string | null
          product_image?: string | null
          product_slug?: string
          product_title?: string
          quantity?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          delivery_status: string
          discount_amount: number
          hidden_at: string | null
          id: string
          order_number: string
          payment_method: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          delivery_status?: string
          discount_amount?: number
          hidden_at?: string | null
          id?: string
          order_number?: string
          payment_method?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          delivery_status?: string
          discount_amount?: number
          hidden_at?: string | null
          id?: string
          order_number?: string
          payment_method?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          created_at: string
          id: string
          notified_at: string | null
          product_id: string
          target_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notified_at?: string | null
          product_id: string
          target_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notified_at?: string | null
          product_id?: string
          target_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          product_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          product_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          product_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_comments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ratings: {
        Row: {
          created_at: string
          id: string
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ratings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          currency: string
          delivery_type: string
          description: string | null
          featured: boolean
          file_url: string | null
          format: string | null
          id: string
          image_url: string | null
          original_price: number | null
          preview_type: string | null
          preview_url: string | null
          price: number
          product_code: string | null
          rating: number | null
          sales_count: number
          slug: string
          status: string
          tagline: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          currency?: string
          delivery_type?: string
          description?: string | null
          featured?: boolean
          file_url?: string | null
          format?: string | null
          id?: string
          image_url?: string | null
          original_price?: number | null
          preview_type?: string | null
          preview_url?: string | null
          price?: number
          product_code?: string | null
          rating?: number | null
          sales_count?: number
          slug: string
          status?: string
          tagline?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          delivery_type?: string
          description?: string | null
          featured?: boolean
          file_url?: string | null
          format?: string | null
          id?: string
          image_url?: string | null
          original_price?: number | null
          preview_type?: string | null
          preview_url?: string | null
          price?: number
          product_code?: string | null
          rating?: number | null
          sales_count?: number
          slug?: string
          status?: string
          tagline?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          created_at: string
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          position: number
          starts_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          position?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          position?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_purchased_product: {
        Args: { _product_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
