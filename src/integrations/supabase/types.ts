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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          area: string
          created_at: string
          details: Json
          id: string
          record_id: string | null
          record_type: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          area?: string
          created_at?: string
          details?: Json
          id?: string
          record_id?: string | null
          record_type?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          area?: string
          created_at?: string
          details?: Json
          id?: string
          record_id?: string | null
          record_type?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          note: string | null
          roles: Database["public"]["Enums"]["app_role"][]
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          note?: string | null
          roles?: Database["public"]["Enums"]["app_role"][]
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          note?: string | null
          roles?: Database["public"]["Enums"]["app_role"][]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      contact_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          page_path: string | null
          placement: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          page_path?: string | null
          placement?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          page_path?: string | null
          placement?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
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
      ss_accounts: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ss_alerts: {
        Row: {
          body: string | null
          created_at: string
          customer_id: string | null
          id: string
          is_resolved: boolean
          priority: string
          resolved_at: string | null
          tech_id: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_resolved?: boolean
          priority?: string
          resolved_at?: string | null
          tech_id?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_resolved?: boolean
          priority?: string
          resolved_at?: string | null
          tech_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_alerts_tech_id_fkey"
            columns: ["tech_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_broadcasts: {
        Row: {
          body: string
          channels: Json
          created_at: string
          id: string
          recipient_count: number
          segment: string
          sent_at: string
          subject: string
        }
        Insert: {
          body: string
          channels?: Json
          created_at?: string
          id?: string
          recipient_count?: number
          segment?: string
          sent_at?: string
          subject: string
        }
        Update: {
          body?: string
          channels?: Json
          created_at?: string
          id?: string
          recipient_count?: number
          segment?: string
          sent_at?: string
          subject?: string
        }
        Relationships: []
      }
      ss_bundles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          items: Json
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      ss_custom_fields: {
        Row: {
          created_at: string
          field_type: string
          id: string
          is_warning: boolean
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          is_warning?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          is_warning?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      ss_customers: {
        Row: {
          address: string | null
          assigned_tech_id: string | null
          billing_mode: string
          billing_timing: string
          charge_for_chems: boolean
          city: string | null
          created_at: string
          custom_fields: Json
          email: string | null
          equipment: Json
          full_name: string
          gallons: number
          gate_code: string | null
          id: string
          internal_notes: string | null
          invoice_day: number
          lat: number | null
          lng: number | null
          monthly_price: number
          phone: string | null
          pool_type: string
          postal_code: string | null
          referral_code: string | null
          route_day: string | null
          route_frequency: string
          service_level: string
          state: string
          status: Database["public"]["Enums"]["ss_cust_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          assigned_tech_id?: string | null
          billing_mode?: string
          billing_timing?: string
          charge_for_chems?: boolean
          city?: string | null
          created_at?: string
          custom_fields?: Json
          email?: string | null
          equipment?: Json
          full_name: string
          gallons?: number
          gate_code?: string | null
          id?: string
          internal_notes?: string | null
          invoice_day?: number
          lat?: number | null
          lng?: number | null
          monthly_price?: number
          phone?: string | null
          pool_type?: string
          postal_code?: string | null
          referral_code?: string | null
          route_day?: string | null
          route_frequency?: string
          service_level?: string
          state?: string
          status?: Database["public"]["Enums"]["ss_cust_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          assigned_tech_id?: string | null
          billing_mode?: string
          billing_timing?: string
          charge_for_chems?: boolean
          city?: string | null
          created_at?: string
          custom_fields?: Json
          email?: string | null
          equipment?: Json
          full_name?: string
          gallons?: number
          gate_code?: string | null
          id?: string
          internal_notes?: string | null
          invoice_day?: number
          lat?: number | null
          lng?: number | null
          monthly_price?: number
          phone?: string | null
          pool_type?: string
          postal_code?: string | null
          referral_code?: string | null
          route_day?: string | null
          route_frequency?: string
          service_level?: string
          state?: string
          status?: Database["public"]["Enums"]["ss_cust_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_customers_assigned_tech_id_fkey"
            columns: ["assigned_tech_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          spent_on: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          spent_on?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          spent_on?: string
          vendor?: string | null
        }
        Relationships: []
      }
      ss_feed: {
        Row: {
          body: string | null
          created_at: string
          customer_id: string
          id: string
          kind: string
          sent_by_sms: boolean
          title: string
          visit_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          customer_id: string
          id?: string
          kind?: string
          sent_by_sms?: boolean
          title: string
          visit_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          kind?: string
          sent_by_sms?: boolean
          title?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_feed_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_feed_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "ss_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_inventory: {
        Row: {
          created_at: string
          id: string
          low_threshold: number
          name: string
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          low_threshold?: number
          name: string
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          low_threshold?: number
          name?: string
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      ss_invoice_items: {
        Row: {
          account_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total: number
          quantity: number
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total?: number
          quantity?: number
          unit_price?: number
        }
        Update: {
          account_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "ss_invoice_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ss_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ss_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_invoices: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          due_date: string | null
          id: string
          invoice_number: string
          issued_on: string
          kind: string
          paid_at: string | null
          status: string
          stripe_payment_url: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_on?: string
          kind?: string
          paid_at?: string | null
          status?: string
          stripe_payment_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_on?: string
          kind?: string
          paid_at?: string | null
          status?: string
          stripe_payment_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_jobs: {
        Row: {
          auto_flag_source: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          details: string | null
          due_date: string | null
          id: string
          price: number
          status: string
          tech_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          auto_flag_source?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          details?: string | null
          due_date?: string | null
          id?: string
          price?: number
          status?: string
          tech_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          auto_flag_source?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          details?: string | null
          due_date?: string | null
          id?: string
          price?: number
          status?: string
          tech_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_jobs_tech_id_fkey"
            columns: ["tech_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_leads: {
        Row: {
          address: string | null
          city: string | null
          cleanup_price: number | null
          condition: string
          converted_customer_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          message: string | null
          monthly_value: number
          phone: string | null
          photo_url: string | null
          pool_size: string | null
          service_type: string
          source: string
          spa_addon: number
          spa_option: string
          stage: Database["public"]["Enums"]["ss_stage"]
          stage_changed_at: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          cleanup_price?: number | null
          condition?: string
          converted_customer_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          message?: string | null
          monthly_value?: number
          phone?: string | null
          photo_url?: string | null
          pool_size?: string | null
          service_type?: string
          source?: string
          spa_addon?: number
          spa_option?: string
          stage?: Database["public"]["Enums"]["ss_stage"]
          stage_changed_at?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          cleanup_price?: number | null
          condition?: string
          converted_customer_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          message?: string | null
          monthly_value?: number
          phone?: string | null
          photo_url?: string | null
          pool_size?: string | null
          service_type?: string
          source?: string
          spa_addon?: number
          spa_option?: string
          stage?: Database["public"]["Enums"]["ss_stage"]
          stage_changed_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_leads_converted_customer_id_fkey"
            columns: ["converted_customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_ledger: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string | null
          credit: number
          customer_id: string | null
          debit: number
          entry_date: string
          id: string
          memo: string
          ref_id: string | null
          reference: string | null
          source: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          credit?: number
          customer_id?: string | null
          debit?: number
          entry_date?: string
          id?: string
          memo: string
          ref_id?: string | null
          reference?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          credit?: number
          customer_id?: string | null
          debit?: number
          entry_date?: string
          id?: string
          memo?: string
          ref_id?: string | null
          reference?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ss_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          id: string
          invoice_id: string | null
          kind: string
          method: string
          note: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          kind?: string
          method?: string
          note?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          kind?: string
          method?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ss_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_price_book: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          recurs_days: number | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          recurs_days?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          recurs_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ss_project_files: {
        Row: {
          created_at: string
          description: string | null
          design_id: string | null
          id: string
          media_type: string
          project_id: string
          size_bytes: number | null
          stage_id: string | null
          storage_path: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          design_id?: string | null
          id?: string
          media_type?: string
          project_id: string
          size_bytes?: number | null
          stage_id?: string | null
          storage_path: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          design_id?: string | null
          id?: string
          media_type?: string
          project_id?: string
          size_bytes?: number | null
          stage_id?: string | null
          storage_path?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_project_files_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "pool_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ss_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_project_files_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "ss_project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_project_stages: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          project_id: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          project_id: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ss_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_projects: {
        Row: {
          address: string | null
          budget_high: number | null
          budget_low: number | null
          city: string | null
          created_at: string
          customer_id: string | null
          id: string
          kind: string
          lead_id: string | null
          notes: string | null
          start_date: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          budget_high?: number | null
          budget_low?: number | null
          city?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          budget_high?: number | null
          budget_low?: number | null
          city?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ss_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_purchase_orders: {
        Row: {
          created_at: string
          id: string
          items: Json
          ordered_at: string | null
          received_at: string | null
          status: string
          total: number
          updated_at: string
          vendor: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          ordered_at?: string | null
          received_at?: string | null
          status?: string
          total?: number
          updated_at?: string
          vendor: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          ordered_at?: string | null
          received_at?: string | null
          status?: string
          total?: number
          updated_at?: string
          vendor?: string
        }
        Relationships: []
      }
      ss_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      ss_staff: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          initials: string | null
          is_active: boolean
          level: Database["public"]["Enums"]["ss_level"]
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          initials?: string | null
          is_active?: boolean
          level?: Database["public"]["Enums"]["ss_level"]
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          initials?: string | null
          is_active?: boolean
          level?: Database["public"]["Enums"]["ss_level"]
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ss_suppression: {
        Row: {
          created_at: string
          email: string
          id: string
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reason?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reason?: string
        }
        Relationships: []
      }
      ss_truck_items: {
        Row: {
          created_at: string
          id: string
          is_stocked: boolean
          label: string
          sort_order: number
          truck_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_stocked?: boolean
          label: string
          sort_order?: number
          truck_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_stocked?: boolean
          label?: string
          sort_order?: number
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_truck_items_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "ss_trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_trucks: {
        Row: {
          assigned_tech_id: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          assigned_tech_id?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          assigned_tech_id?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_trucks_assigned_tech_id_fkey"
            columns: ["assigned_tech_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_visits: {
        Row: {
          after_photo_url: string | null
          arrived_at: string | null
          before_photo_url: string | null
          checklist: Json
          chem_cost: number
          completed_at: string | null
          created_at: string
          customer_id: string
          dosing: Json
          en_route_at: string | null
          feedback: string | null
          id: string
          issue_reported: string | null
          minutes_on_site: number | null
          notes: string | null
          readings: Json
          scheduled_date: string
          started_at: string | null
          status: string
          stop_order: number
          tech_id: string | null
          updated_at: string
        }
        Insert: {
          after_photo_url?: string | null
          arrived_at?: string | null
          before_photo_url?: string | null
          checklist?: Json
          chem_cost?: number
          completed_at?: string | null
          created_at?: string
          customer_id: string
          dosing?: Json
          en_route_at?: string | null
          feedback?: string | null
          id?: string
          issue_reported?: string | null
          minutes_on_site?: number | null
          notes?: string | null
          readings?: Json
          scheduled_date?: string
          started_at?: string | null
          status?: string
          stop_order?: number
          tech_id?: string | null
          updated_at?: string
        }
        Update: {
          after_photo_url?: string | null
          arrived_at?: string | null
          before_photo_url?: string | null
          checklist?: Json
          chem_cost?: number
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          dosing?: Json
          en_route_at?: string | null
          feedback?: string | null
          id?: string
          issue_reported?: string | null
          minutes_on_site?: number | null
          notes?: string | null
          readings?: Json
          scheduled_date?: string
          started_at?: string | null
          status?: string
          stop_order?: number
          tech_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_visits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_visits_tech_id_fkey"
            columns: ["tech_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_workflow_tasks: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          is_required: boolean
          label: string
          photo_required: boolean
          sort_order: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          is_required?: boolean
          label: string
          photo_required?: boolean
          sort_order?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          is_required?: boolean
          label?: string
          photo_required?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ss_workflow_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
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
      ss_is_office: { Args: never; Returns: boolean }
      ss_is_owner: { Args: never; Returns: boolean }
      ss_is_staff: { Args: never; Returns: boolean }
      ss_my_customer_id: { Args: never; Returns: string }
      ss_my_level: {
        Args: { _uid: string }
        Returns: Database["public"]["Enums"]["ss_level"]
      }
      ss_my_pool: {
        Args: never
        Returns: {
          address: string
          city: string
          full_name: string
          gallons: number
          id: string
          monthly_price: number
          pool_type: string
          referral_code: string
          route_day: string
          service_level: string
          status: Database["public"]["Enums"]["ss_cust_status"]
        }[]
      }
      ss_my_staff_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user" | "crm_manager" | "store_manager"
      pool_category: "design" | "plan" | "construction"
      pool_media_type: "image" | "video"
      ss_cust_status: "active" | "inactive"
      ss_level: "owner" | "office_manager" | "technician" | "contractor"
      ss_stage:
        | "new_lead"
        | "contacted"
        | "quote_sent"
        | "follow_up"
        | "won"
        | "lost"
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
      app_role: ["admin", "user", "crm_manager", "store_manager"],
      pool_category: ["design", "plan", "construction"],
      pool_media_type: ["image", "video"],
      ss_cust_status: ["active", "inactive"],
      ss_level: ["owner", "office_manager", "technician", "contractor"],
      ss_stage: [
        "new_lead",
        "contacted",
        "quote_sent",
        "follow_up",
        "won",
        "lost",
      ],
    },
  },
} as const
