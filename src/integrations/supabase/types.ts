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
      bookings: {
        Row: {
          address: string
          consent_source_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          service: string
          sms_consent_at: string | null
          sms_consent_text: string | null
          sms_opt_in: boolean
          status: string
        }
        Insert: {
          address: string
          consent_source_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          service: string
          sms_consent_at?: string | null
          sms_consent_text?: string | null
          sms_opt_in?: boolean
          status?: string
        }
        Update: {
          address?: string
          consent_source_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          preferred_date?: string
          preferred_time?: string
          service?: string
          sms_consent_at?: string | null
          sms_consent_text?: string | null
          sms_opt_in?: boolean
          status?: string
        }
        Relationships: []
      }
      cleaning_plans: {
        Row: {
          blurb: string
          cadence: string
          created_at: string
          display_order: number
          featured: boolean
          id: string
          is_active: boolean
          items: string[]
          name: string
          price: string
          price_key_large: string | null
          price_key_medium: string | null
          price_key_small: string | null
          price_large: number | null
          price_medium: number | null
          price_small: number | null
          updated_at: string
        }
        Insert: {
          blurb?: string
          cadence?: string
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          is_active?: boolean
          items?: string[]
          name: string
          price?: string
          price_key_large?: string | null
          price_key_medium?: string | null
          price_key_small?: string | null
          price_large?: number | null
          price_medium?: number | null
          price_small?: number | null
          updated_at?: string
        }
        Update: {
          blurb?: string
          cadence?: string
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          is_active?: boolean
          items?: string[]
          name?: string
          price?: string
          price_key_large?: string | null
          price_key_medium?: string | null
          price_key_small?: string | null
          price_large?: number | null
          price_medium?: number | null
          price_small?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          body: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string | null
          occurred_at: string
          subject: string | null
          type: string
        }
        Insert: {
          body?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          occurred_at?: string
          subject?: string | null
          type?: string
        }
        Update: {
          body?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          occurred_at?: string
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          marketing_opt_in: boolean
          notes: string | null
          phone: string | null
          source: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          marketing_opt_in?: boolean
          notes?: string | null
          phone?: string | null
          source?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          marketing_opt_in?: boolean
          notes?: string | null
          phone?: string | null
          source?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          booking_id: string | null
          closed_at: string | null
          contact_id: string | null
          created_at: string
          estimated_value: number | null
          id: string
          next_follow_up: string | null
          notes: string | null
          owner_id: string | null
          pool_size: string | null
          priority: string
          quoted_price: number | null
          service_interest: string | null
          source: string
          stage: string
          title: string
          updated_at: string
          vegetation_level: string | null
        }
        Insert: {
          booking_id?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          next_follow_up?: string | null
          notes?: string | null
          owner_id?: string | null
          pool_size?: string | null
          priority?: string
          quoted_price?: number | null
          service_interest?: string | null
          source?: string
          stage?: string
          title: string
          updated_at?: string
          vegetation_level?: string | null
        }
        Update: {
          booking_id?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          next_follow_up?: string | null
          notes?: string | null
          owner_id?: string | null
          pool_size?: string | null
          priority?: string
          quoted_price?: number | null
          service_interest?: string | null
          source?: string
          stage?: string
          title?: string
          updated_at?: string
          vegetation_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          details: string | null
          due_date: string | null
          id: string
          is_done: boolean
          lead_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          details?: string | null
          due_date?: string | null
          id?: string
          is_done?: boolean
          lead_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          details?: string | null
          due_date?: string | null
          id?: string
          is_done?: boolean
          lead_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      pool_designs: {
        Row: {
          category: Database["public"]["Enums"]["pool_category"]
          created_at: string
          description: string
          display_order: number
          est_price_high: number | null
          est_price_low: number | null
          features: string[]
          id: string
          image_path: string
          media_type: Database["public"]["Enums"]["pool_media_type"]
          stage_order: number | null
          style: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["pool_category"]
          created_at?: string
          description: string
          display_order?: number
          est_price_high?: number | null
          est_price_low?: number | null
          features?: string[]
          id?: string
          image_path: string
          media_type?: Database["public"]["Enums"]["pool_media_type"]
          stage_order?: number | null
          style: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["pool_category"]
          created_at?: string
          description?: string
          display_order?: number
          est_price_high?: number | null
          est_price_low?: number | null
          features?: string[]
          id?: string
          image_path?: string
          media_type?: Database["public"]["Enums"]["pool_media_type"]
          stage_order?: number | null
          style?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          compare_at_price: number | null
          created_at: string
          description: string
          display_order: number
          featured: boolean
          id: string
          image_key: string | null
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          sku: string
          slug: string
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string
          display_order?: number
          featured?: boolean
          id?: string
          image_key?: string | null
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          sku: string
          slug: string
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string
          display_order?: number
          featured?: boolean
          id?: string
          image_key?: string | null
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          sku?: string
          slug?: string
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          description: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          min_subtotal: number
          starts_at: string | null
          times_used: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          min_subtotal?: number
          starts_at?: string | null
          times_used?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          min_subtotal?: number
          starts_at?: string | null
          times_used?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_pricing: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          plan_name: string | null
          pool_size: string
          price: number | null
          price_key: string | null
          size_rank: number
          sku: string
          updated_at: string
          vegetation_level: string
          vegetation_rank: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          plan_name?: string | null
          pool_size: string
          price?: number | null
          price_key?: string | null
          size_rank?: number
          sku: string
          updated_at?: string
          vegetation_level: string
          vegetation_rank?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          plan_name?: string | null
          pool_size?: string
          price?: number | null
          price_key?: string | null
          size_rank?: number
          sku?: string
          updated_at?: string
          vegetation_level?: string
          vegetation_rank?: number
        }
        Relationships: []
      }
      shop_orders: {
        Row: {
          address: string | null
          created_at: string
          customer_name: string
          email: string
          id: string
          item_name: string
          item_sku: string | null
          notes: string | null
          order_type: string
          phone: string | null
          quantity: number
          status: string
          unit_price: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_name: string
          email: string
          id?: string
          item_name: string
          item_sku?: string | null
          notes?: string | null
          order_type?: string
          phone?: string | null
          quantity?: number
          status?: string
          unit_price?: number | null
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_name?: string
          email?: string
          id?: string
          item_name?: string
          item_sku?: string | null
          notes?: string | null
          order_type?: string
          phone?: string | null
          quantity?: number
          status?: string
          unit_price?: number | null
        }
        Relationships: []
      }
      store_order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total?: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sku?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          customer_name: string
          discount: number
          email: string
          id: string
          notes: string | null
          order_number: string
          paid_at: string | null
          payment_status: string
          phone: string | null
          postal_code: string | null
          promo_code: string | null
          shipping: number
          state: string | null
          status: string
          stripe_session_id: string | null
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          customer_name: string
          discount?: number
          email: string
          id?: string
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          payment_status?: string
          phone?: string | null
          postal_code?: string | null
          promo_code?: string | null
          shipping?: number
          state?: string | null
          status?: string
          stripe_session_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          customer_name?: string
          discount?: number
          email?: string
          id?: string
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          payment_status?: string
          phone?: string | null
          postal_code?: string | null
          promo_code?: string | null
          shipping?: number
          state?: string | null
          status?: string
          stripe_session_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          address: string | null
          amount: number | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          customer_name: string | null
          email: string | null
          environment: string
          id: string
          notes: string | null
          phone: string | null
          plan_id: string | null
          plan_name: string | null
          pool_size: string | null
          price_key: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          amount?: number | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          customer_name?: string | null
          email?: string | null
          environment?: string
          id?: string
          notes?: string | null
          phone?: string | null
          plan_id?: string | null
          plan_name?: string | null
          pool_size?: string | null
          price_key?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          amount?: number | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          customer_name?: string | null
          email?: string | null
          environment?: string
          id?: string
          notes?: string | null
          phone?: string | null
          plan_id?: string | null
          plan_name?: string | null
          pool_size?: string | null
          price_key?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cleaning_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_promo_code: {
        Args: { p_code: string; p_subtotal: number }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      place_store_order: {
        Args: {
          p_address: string
          p_city: string
          p_customer_name: string
          p_email: string
          p_items: Json
          p_notes: string
          p_phone: string
          p_postal_code: string
          p_promo_code?: string
          p_state: string
        }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      pool_category: "design" | "plan" | "construction"
      pool_media_type: "image" | "video"
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
      pool_category: ["design", "plan", "construction"],
      pool_media_type: ["image", "video"],
    },
  },
} as const
