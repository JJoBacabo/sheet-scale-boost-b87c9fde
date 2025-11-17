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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      archived_user_data: {
        Row: {
          anonymized_at: string
          can_restore: boolean
          encrypted_snapshot: string | null
          id: string
          metadata: Json | null
          original_user_id: string
          restoration_expires_at: string
        }
        Insert: {
          anonymized_at?: string
          can_restore?: boolean
          encrypted_snapshot?: string | null
          id?: string
          metadata?: Json | null
          original_user_id: string
          restoration_expires_at?: string
        }
        Update: {
          anonymized_at?: string
          can_restore?: boolean
          encrypted_snapshot?: string | null
          id?: string
          metadata?: Json | null
          original_user_id?: string
          restoration_expires_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          new_state: Database["public"]["Enums"]["subscription_state"] | null
          old_state: Database["public"]["Enums"]["subscription_state"] | null
          subscription_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          new_state?: Database["public"]["Enums"]["subscription_state"] | null
          old_state?: Database["public"]["Enums"]["subscription_state"] | null
          subscription_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          new_state?: Database["public"]["Enums"]["subscription_state"] | null
          old_state?: Database["public"]["Enums"]["subscription_state"] | null
          subscription_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          color: string | null
          content: Json
          created_at: string
          height: number
          id: string
          position_x: number
          position_y: number
          type: string
          updated_at: string
          user_id: string
          width: number
        }
        Insert: {
          color?: string | null
          content?: Json
          created_at?: string
          height?: number
          id?: string
          position_x?: number
          position_y?: number
          type: string
          updated_at?: string
          user_id: string
          width?: number
        }
        Update: {
          color?: string | null
          content?: Json
          created_at?: string
          height?: number
          id?: string
          position_x?: number
          position_y?: number
          type?: string
          updated_at?: string
          user_id?: string
          width?: number
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          campaign_name: string
          clicks: number | null
          conversions: number | null
          cpa: number | null
          cpc: number | null
          created_at: string
          decision_suggestion: string | null
          id: string
          impressions: number | null
          platform: string | null
          roas: number | null
          status: string | null
          total_revenue: number | null
          total_spent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_name: string
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          decision_suggestion?: string | null
          id?: string
          impressions?: number | null
          platform?: string | null
          roas?: number | null
          status?: string | null
          total_revenue?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_name?: string
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          decision_suggestion?: string | null
          id?: string
          impressions?: number | null
          platform?: string | null
          roas?: number | null
          status?: string | null
          total_revenue?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_roas: {
        Row: {
          atc: number | null
          campaign_id: string
          campaign_name: string
          cog: number | null
          cpc: number | null
          created_at: string
          date: string
          decision: string | null
          decision_reason: string | null
          id: string
          margin_euros: number | null
          margin_percentage: number | null
          product_price: number | null
          purchases: number | null
          roas: number | null
          total_spent: number | null
          units_sold: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          atc?: number | null
          campaign_id: string
          campaign_name: string
          cog?: number | null
          cpc?: number | null
          created_at?: string
          date?: string
          decision?: string | null
          decision_reason?: string | null
          id?: string
          margin_euros?: number | null
          margin_percentage?: number | null
          product_price?: number | null
          purchases?: number | null
          roas?: number | null
          total_spent?: number | null
          units_sold?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          atc?: number | null
          campaign_id?: string
          campaign_name?: string
          cog?: number | null
          cpc?: number | null
          created_at?: string
          date?: string
          decision?: string | null
          decision_reason?: string | null
          id?: string
          margin_euros?: number | null
          margin_percentage?: number | null
          product_price?: number | null
          purchases?: number | null
          roas?: number | null
          total_spent?: number | null
          units_sold?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          access_token: string | null
          connected_at: string
          created_at: string
          expires_at: string | null
          id: string
          integration_type: string
          metadata: Json | null
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          integration_type: string
          metadata?: Json | null
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          integration_type?: string
          metadata?: Json | null
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          cadence: string
          campaign_limit: number
          code: string
          created_at: string
          currency: string
          features_enabled: Json
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          price_amount: number
          store_limit: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          cadence: string
          campaign_limit?: number
          code: string
          created_at?: string
          currency?: string
          features_enabled?: Json
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          price_amount: number
          store_limit?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          cadence?: string
          campaign_limit?: number
          code?: string
          created_at?: string
          currency?: string
          features_enabled?: Json
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          price_amount?: number
          store_limit?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          cost_price: number | null
          created_at: string
          id: string
          image_url: string | null
          integration_id: string | null
          last_sold_at: string | null
          product_name: string
          profit_margin: number | null
          quantity_sold: number | null
          selling_price: number | null
          shopify_product_id: string | null
          sku: string | null
          total_revenue: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          integration_id?: string | null
          last_sold_at?: string | null
          product_name: string
          profit_margin?: number | null
          quantity_sold?: number | null
          selling_price?: number | null
          shopify_product_id?: string | null
          sku?: string | null
          total_revenue?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          integration_id?: string | null
          last_sold_at?: string | null
          product_name?: string
          profit_margin?: number | null
          quantity_sold?: number | null
          selling_price?: number | null
          shopify_product_id?: string | null
          sku?: string | null
          total_revenue?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          facebook_access_token: string | null
          facebook_token_expires_at: string | null
          facebook_user_id: string | null
          facebook_user_name: string | null
          full_name: string | null
          id: string
          last_login: string | null
          subscription_plan: string | null
          subscription_status: string | null
          total_logins: number | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          facebook_access_token?: string | null
          facebook_token_expires_at?: string | null
          facebook_user_id?: string | null
          facebook_user_name?: string | null
          full_name?: string | null
          id?: string
          last_login?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          total_logins?: number | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          facebook_access_token?: string | null
          facebook_token_expires_at?: string | null
          facebook_user_id?: string | null
          facebook_user_name?: string | null
          full_name?: string | null
          id?: string
          last_login?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          total_logins?: number | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profit_sheet_entries: {
        Row: {
          ad_account_id: string
          created_at: string
          date: string
          id: string
          manual_refunds: number | null
          other_expenses: number | null
          shopify_integration_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_account_id: string
          created_at?: string
          date: string
          id?: string
          manual_refunds?: number | null
          other_expenses?: number | null
          shopify_integration_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_account_id?: string
          created_at?: string
          date?: string
          id?: string
          manual_refunds?: number | null
          other_expenses?: number | null
          shopify_integration_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_ads: {
        Row: {
          ad_library_id: string
          ad_text: string | null
          created_at: string
          id: string
          impressions: string | null
          page_name: string
          saved_at: string
          snapshot_url: string
          spend: string | null
          user_id: string
        }
        Insert: {
          ad_library_id: string
          ad_text?: string | null
          created_at?: string
          id?: string
          impressions?: string | null
          page_name: string
          saved_at?: string
          snapshot_url: string
          spend?: string | null
          user_id: string
        }
        Update: {
          ad_library_id?: string
          ad_text?: string | null
          created_at?: string
          id?: string
          impressions?: string | null
          page_name?: string
          saved_at?: string
          snapshot_url?: string
          spend?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sheets_sync_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          last_sync_at: string
          products_created: number | null
          products_updated: number | null
          sheet_id: string
          sheet_name: string | null
          sync_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync_at?: string
          products_created?: number | null
          products_updated?: number | null
          sheet_id: string
          sheet_name?: string | null
          sync_status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync_at?: string
          products_created?: number | null
          products_updated?: number | null
          sheet_id?: string
          sheet_name?: string | null
          sync_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          amount: number | null
          billing_period: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          period_end: string | null
          period_start: string | null
          plan_name: string
          status: string
          stripe_invoice_id: string | null
          stripe_subscription_id: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          billing_period: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          plan_name: string
          status: string
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          billing_period?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          plan_name?: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          archive_scheduled_at: string | null
          archived_at: string | null
          billing_period: string
          campaign_limit: number | null
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          features_enabled: Json | null
          grace_period_ends_at: string | null
          id: string
          last_state_change_at: string | null
          plan_code: string | null
          plan_name: string
          readonly_mode: boolean
          state: Database["public"]["Enums"]["subscription_state"]
          state_change_reason: string | null
          status: string
          store_limit: number | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archive_scheduled_at?: string | null
          archived_at?: string | null
          billing_period: string
          campaign_limit?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          features_enabled?: Json | null
          grace_period_ends_at?: string | null
          id?: string
          last_state_change_at?: string | null
          plan_code?: string | null
          plan_name: string
          readonly_mode?: boolean
          state?: Database["public"]["Enums"]["subscription_state"]
          state_change_reason?: string | null
          status?: string
          store_limit?: number | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archive_scheduled_at?: string | null
          archived_at?: string | null
          billing_period?: string
          campaign_limit?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          features_enabled?: Json | null
          grace_period_ends_at?: string | null
          id?: string
          last_state_change_at?: string | null
          plan_code?: string | null
          plan_name?: string
          readonly_mode?: boolean
          state?: Database["public"]["Enums"]["subscription_state"]
          state_change_reason?: string | null
          status?: string
          store_limit?: number | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_quote_sessions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          password: string | null
          supplier_email: string | null
          supplier_name: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          password?: string | null
          supplier_email?: string | null
          supplier_name: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          password?: string | null
          supplier_email?: string | null
          supplier_name?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_quotes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          product_id: string
          quoted_price: number | null
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          product_id: string
          quoted_price?: number | null
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          product_id?: string
          quoted_price?: number | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "supplier_quote_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chats: {
        Row: {
          admin_id: string | null
          category: string | null
          created_at: string
          id: string
          language: string
          messages: Json
          notes: string | null
          resolved_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          language?: string
          messages?: Json
          notes?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          language?: string
          messages?: Json
          notes?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          campaigns_limit: number
          campaigns_used: number
          created_at: string
          id: string
          reset_at: string | null
          stores_limit: number
          stores_used: number
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaigns_limit?: number
          campaigns_used?: number
          created_at?: string
          id?: string
          reset_at?: string | null
          stores_limit?: number
          stores_used?: number
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campaigns_limit?: number
          campaigns_used?: number
          created_at?: string
          id?: string
          reset_at?: string | null
          stores_limit?: number
          stores_used?: number
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_quote_token: { Args: { session_token: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      subscription_state: "active" | "expired" | "suspended" | "archived"
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
      subscription_state: ["active", "expired", "suspended", "archived"],
    },
  },
} as const
