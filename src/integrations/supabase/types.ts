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
          campaign_id: string | null
          created_at: string
          event_type: string
          id: string
          landing_page: string | null
          page_path: string | null
          placement: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          landing_page?: string | null
          page_path?: string | null
          placement?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          landing_page?: string | null
          page_path?: string | null
          placement?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
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
      inspection_events: {
        Row: {
          campaign_id: string | null
          channel: string | null
          created_at: string
          detail: string | null
          event_type: string
          id: string
          landing_page: string | null
          outcome: string | null
          page_path: string | null
          recipient: string | null
          referrer: string | null
          request_id: string
          session_id: string | null
          status_from: string | null
          status_to: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          campaign_id?: string | null
          channel?: string | null
          created_at?: string
          detail?: string | null
          event_type: string
          id?: string
          landing_page?: string | null
          outcome?: string | null
          page_path?: string | null
          recipient?: string | null
          referrer?: string | null
          request_id: string
          session_id?: string | null
          status_from?: string | null
          status_to?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          campaign_id?: string | null
          channel?: string | null
          created_at?: string
          detail?: string | null
          event_type?: string
          id?: string
          landing_page?: string | null
          outcome?: string | null
          page_path?: string | null
          recipient?: string | null
          referrer?: string | null
          request_id?: string
          session_id?: string | null
          status_from?: string | null
          status_to?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "inspection_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_requests: {
        Row: {
          address: string
          campaign_id: string | null
          consent_text: string | null
          contact_consent: boolean
          converted_at: string | null
          converted_customer_id: string | null
          created_at: string
          crm_lead_id: string | null
          crm_synced_at: string | null
          email: string
          full_name: string
          id: string
          landing_page: string | null
          lead_type: string | null
          notes: string | null
          page_path: string | null
          phone: string
          pool_details: string | null
          postal_code: string
          preferred_contact_time: string | null
          preferred_date: string | null
          promo_code: string | null
          promo_detail: string | null
          promo_status: string | null
          reference_number: string
          referrer: string | null
          session_id: string | null
          sms_opt_in: boolean
          source: string | null
          status: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          address: string
          campaign_id?: string | null
          consent_text?: string | null
          contact_consent?: boolean
          converted_at?: string | null
          converted_customer_id?: string | null
          created_at?: string
          crm_lead_id?: string | null
          crm_synced_at?: string | null
          email: string
          full_name: string
          id?: string
          landing_page?: string | null
          lead_type?: string | null
          notes?: string | null
          page_path?: string | null
          phone: string
          pool_details?: string | null
          postal_code: string
          preferred_contact_time?: string | null
          preferred_date?: string | null
          promo_code?: string | null
          promo_detail?: string | null
          promo_status?: string | null
          reference_number?: string
          referrer?: string | null
          session_id?: string | null
          sms_opt_in?: boolean
          source?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          address?: string
          campaign_id?: string | null
          consent_text?: string | null
          contact_consent?: boolean
          converted_at?: string | null
          converted_customer_id?: string | null
          created_at?: string
          crm_lead_id?: string | null
          crm_synced_at?: string | null
          email?: string
          full_name?: string
          id?: string
          landing_page?: string | null
          lead_type?: string | null
          notes?: string | null
          page_path?: string | null
          phone?: string
          pool_details?: string | null
          postal_code?: string
          preferred_contact_time?: string | null
          preferred_date?: string | null
          promo_code?: string | null
          promo_detail?: string | null
          promo_status?: string | null
          reference_number?: string
          referrer?: string | null
          session_id?: string | null
          sms_opt_in?: boolean
          source?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_requests_converted_customer_id_fkey"
            columns: ["converted_customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
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
      security_check_runs: {
        Row: {
          check_key: string
          created_at: string
          details: Json
          id: string
          passed: boolean
          summary: string
          triggered_by: string
        }
        Insert: {
          check_key: string
          created_at?: string
          details?: Json
          id?: string
          passed: boolean
          summary: string
          triggered_by?: string
        }
        Update: {
          check_key?: string
          created_at?: string
          details?: Json
          id?: string
          passed?: boolean
          summary?: string
          triggered_by?: string
        }
        Relationships: []
      }
      security_findings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_email: string | null
          created_at: string
          description: string | null
          id: string
          internal_id: string
          remediation: string | null
          resolved_at: string | null
          scanner: string
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          internal_id: string
          remediation?: string | null
          resolved_at?: string | null
          scanner?: string
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          internal_id?: string
          remediation?: string | null
          resolved_at?: string | null
          scanner?: string
          severity?: string
          status?: string
          title?: string
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
      ss_access_attempts: {
        Row: {
          code_norm: string
          created_at: string
          id: string
          reason: string | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          code_norm: string
          created_at?: string
          id?: string
          reason?: string | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          code_norm?: string
          created_at?: string
          id?: string
          reason?: string | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      ss_access_codes: {
        Row: {
          address: string | null
          city: string | null
          code: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          email: string | null
          expires_at: string | null
          full_name: string | null
          id: string
          last_send_email: boolean | null
          last_send_error: string | null
          last_send_ok: boolean | null
          last_send_sms: boolean | null
          note: string | null
          phone: string | null
          postal_code: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          last_send_email?: boolean | null
          last_send_error?: string | null
          last_send_ok?: boolean | null
          last_send_sms?: boolean | null
          note?: string | null
          phone?: string | null
          postal_code?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          last_send_email?: boolean | null
          last_send_error?: string | null
          last_send_ok?: boolean | null
          last_send_sms?: boolean | null
          note?: string | null
          phone?: string | null
          postal_code?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_access_codes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_access_requests: {
        Row: {
          address: string
          city: string | null
          created_at: string
          customer_id: string | null
          email: string | null
          full_name: string | null
          id: string
          note: string | null
          phone: string | null
          postal_code: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          note?: string | null
          phone?: string | null
          postal_code?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          note?: string | null
          phone?: string | null
          postal_code?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_access_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
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
      ss_addons: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          kind: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          kind?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          kind?: string
          label?: string
          sort_order?: number
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
      ss_appointment_webhook_events: {
        Row: {
          appointment_id: string | null
          arrival_window: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_phone: string | null
          error: string | null
          event_id: string
          id: string
          message: string | null
          notified_email: boolean
          notified_sms: boolean
          payload: Json
          previous_status: string | null
          scheduled_date: string | null
          status: string
          technician: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          arrival_window?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          error?: string | null
          event_id: string
          id?: string
          message?: string | null
          notified_email?: boolean
          notified_sms?: boolean
          payload?: Json
          previous_status?: string | null
          scheduled_date?: string | null
          status: string
          technician?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          arrival_window?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          error?: string | null
          event_id?: string
          id?: string
          message?: string | null
          notified_email?: boolean
          notified_sms?: boolean
          payload?: Json
          previous_status?: string | null
          scheduled_date?: string | null
          status?: string
          technician?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ss_automation_runs: {
        Row: {
          automation_id: string
          created_at: string
          detail: string | null
          id: string
          payload: Json
          status: string
          subject_label: string | null
          trigger_event: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          detail?: string | null
          id?: string
          payload?: Json
          status?: string
          subject_label?: string | null
          trigger_event: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          payload?: Json
          status?: string
          subject_label?: string | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "ss_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_automations: {
        Row: {
          actions: Json
          active: boolean
          conditions: Json
          created_at: string
          created_by: string | null
          delay_minutes: number
          description: string | null
          id: string
          last_run_at: string | null
          name: string
          run_count: number
          trigger_event: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          active?: boolean
          conditions?: Json
          created_at?: string
          created_by?: string | null
          delay_minutes?: number
          description?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          run_count?: number
          trigger_event: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          active?: boolean
          conditions?: Json
          created_at?: string
          created_by?: string | null
          delay_minutes?: number
          description?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          run_count?: number
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      ss_backup_sync: {
        Row: {
          created_at: string
          dirty: boolean
          entity: string
          id: string
          last_error: string | null
          record_id: string
          row_index: number | null
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dirty?: boolean
          entity: string
          id?: string
          last_error?: string | null
          record_id: string
          row_index?: number | null
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dirty?: boolean
          entity?: string
          id?: string
          last_error?: string | null
          record_id?: string
          row_index?: number | null
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ss_bank_details: {
        Row: {
          account_holder: string | null
          account_number: string | null
          ach_instructions: string | null
          bank_name: string | null
          created_at: string
          id: string
          mail_city: string | null
          mail_line1: string | null
          mail_line2: string | null
          mail_postal: string | null
          mail_state: string | null
          memo_instructions: string | null
          payee_name: string
          routing_number: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          ach_instructions?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          mail_city?: string | null
          mail_line1?: string | null
          mail_line2?: string | null
          mail_postal?: string | null
          mail_state?: string | null
          memo_instructions?: string | null
          payee_name?: string
          routing_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          ach_instructions?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          mail_city?: string | null
          mail_line1?: string | null
          mail_line2?: string | null
          mail_postal?: string | null
          mail_state?: string | null
          memo_instructions?: string | null
          payee_name?: string
          routing_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          billing: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          items: Json
          name: string
          price: number
          price_mode: string
          show_item_prices: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          name: string
          price?: number
          price_mode?: string
          show_item_prices?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
          price?: number
          price_mode?: string
          show_item_prices?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ss_calls: {
        Row: {
          call_sid: string | null
          caller_city: string | null
          caller_state: string | null
          created_at: string
          customer_id: string | null
          direction: string
          duration_seconds: number | null
          from_number: string | null
          id: string
          is_test: boolean
          outcome: string | null
          recording_url: string | null
          status: string
          to_number: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          call_sid?: string | null
          caller_city?: string | null
          caller_state?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: string
          duration_seconds?: number | null
          from_number?: string | null
          id?: string
          is_test?: boolean
          outcome?: string | null
          recording_url?: string | null
          status?: string
          to_number?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          call_sid?: string | null
          caller_city?: string | null
          caller_state?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: string
          duration_seconds?: number | null
          from_number?: string | null
          id?: string
          is_test?: boolean
          outcome?: string | null
          recording_url?: string | null
          status?: string
          to_number?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_calls_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_canary_incidents: {
        Row: {
          body_snippet: string | null
          created_at: string
          duration_ms: number
          http_status: number | null
          id: string
          kind: string
          message: string | null
          occurred_at: string
          request_id: string | null
          round: number
          route: string
          run_id: string
          stack: string | null
          url: string
        }
        Insert: {
          body_snippet?: string | null
          created_at?: string
          duration_ms?: number
          http_status?: number | null
          id?: string
          kind: string
          message?: string | null
          occurred_at?: string
          request_id?: string | null
          round?: number
          route: string
          run_id: string
          stack?: string | null
          url: string
        }
        Update: {
          body_snippet?: string | null
          created_at?: string
          duration_ms?: number
          http_status?: number | null
          id?: string
          kind?: string
          message?: string | null
          occurred_at?: string
          request_id?: string | null
          round?: number
          route?: string
          run_id?: string
          stack?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_canary_incidents_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ss_canary_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_canary_route_checks: {
        Row: {
          checks_total: number
          consecutive_failures: number
          created_at: string
          id: string
          last_checked_at: string
          last_duration_ms: number | null
          last_http_status: number | null
          last_kind: string | null
          last_message: string | null
          last_ok_at: string | null
          last_run_id: string | null
          last_status: string
          route: string
          target: string
          updated_at: string
        }
        Insert: {
          checks_total?: number
          consecutive_failures?: number
          created_at?: string
          id?: string
          last_checked_at?: string
          last_duration_ms?: number | null
          last_http_status?: number | null
          last_kind?: string | null
          last_message?: string | null
          last_ok_at?: string | null
          last_run_id?: string | null
          last_status?: string
          route: string
          target: string
          updated_at?: string
        }
        Update: {
          checks_total?: number
          consecutive_failures?: number
          created_at?: string
          id?: string
          last_checked_at?: string
          last_duration_ms?: number | null
          last_http_status?: number | null
          last_kind?: string | null
          last_message?: string | null
          last_ok_at?: string | null
          last_run_id?: string | null
          last_status?: string
          route?: string
          target?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_canary_route_checks_last_run_id_fkey"
            columns: ["last_run_id"]
            isOneToOne: false
            referencedRelation: "ss_canary_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_canary_route_metrics: {
        Row: {
          avg_ms: number
          checked_at: string
          created_at: string
          error_rate: number
          failures: number
          id: string
          last_http_status: number | null
          max_ms: number
          min_ms: number
          p95_ms: number
          requests: number
          route: string
          run_id: string | null
          source: string
          target: string
        }
        Insert: {
          avg_ms?: number
          checked_at?: string
          created_at?: string
          error_rate?: number
          failures?: number
          id?: string
          last_http_status?: number | null
          max_ms?: number
          min_ms?: number
          p95_ms?: number
          requests?: number
          route: string
          run_id?: string | null
          source?: string
          target: string
        }
        Update: {
          avg_ms?: number
          checked_at?: string
          created_at?: string
          error_rate?: number
          failures?: number
          id?: string
          last_http_status?: number | null
          max_ms?: number
          min_ms?: number
          p95_ms?: number
          requests?: number
          route?: string
          run_id?: string | null
          source?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_canary_route_metrics_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ss_canary_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_canary_runs: {
        Row: {
          alert_result: string | null
          created_at: string
          failures: number
          finished_at: string | null
          id: string
          requests: number
          revision_id: string | null
          rounds: number
          slowest_ms: number
          source: string
          started_at: string
          status: string
          target: string
        }
        Insert: {
          alert_result?: string | null
          created_at?: string
          failures?: number
          finished_at?: string | null
          id?: string
          requests?: number
          revision_id?: string | null
          rounds?: number
          slowest_ms?: number
          source?: string
          started_at?: string
          status?: string
          target: string
        }
        Update: {
          alert_result?: string | null
          created_at?: string
          failures?: number
          finished_at?: string | null
          id?: string
          requests?: number
          revision_id?: string | null
          rounds?: number
          slowest_ms?: number
          source?: string
          started_at?: string
          status?: string
          target?: string
        }
        Relationships: []
      }
      ss_catalog_sync_log: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          changes: Json
          created_count: number
          environment: string
          error_count: number
          errors: Json
          id: string
          mode: string
          ran_at: string
          skipped_count: number
          updated_count: number
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          changes?: Json
          created_count?: number
          environment?: string
          error_count?: number
          errors?: Json
          id?: string
          mode?: string
          ran_at?: string
          skipped_count?: number
          updated_count?: number
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          changes?: Json
          created_count?: number
          environment?: string
          error_count?: number
          errors?: Json
          id?: string
          mode?: string
          ran_at?: string
          skipped_count?: number
          updated_count?: number
        }
        Relationships: []
      }
      ss_chat_channels: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          kind: string
          last_message_at: string | null
          last_preview: string | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          kind?: string
          last_message_at?: string | null
          last_preview?: string | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          kind?: string
          last_message_at?: string | null
          last_preview?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_chat_channels_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_chat_messages: {
        Row: {
          author_id: string | null
          author_kind: string
          author_name: string | null
          body: string
          channel_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id?: string | null
          author_kind?: string
          author_name?: string | null
          body: string
          channel_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string | null
          author_kind?: string
          author_name?: string | null
          body?: string
          channel_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "ss_chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_check_payments: {
        Row: {
          amount: number
          check_number: string | null
          cleared_at: string | null
          created_at: string
          customer_id: string | null
          delivery: string
          handled_by: string | null
          id: string
          invoice_id: string | null
          note: string | null
          posted_payment_id: string | null
          received_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          check_number?: string | null
          cleared_at?: string | null
          created_at?: string
          customer_id?: string | null
          delivery?: string
          handled_by?: string | null
          id?: string
          invoice_id?: string | null
          note?: string | null
          posted_payment_id?: string | null
          received_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          check_number?: string | null
          cleared_at?: string | null
          created_at?: string
          customer_id?: string | null
          delivery?: string
          handled_by?: string | null
          id?: string
          invoice_id?: string | null
          note?: string | null
          posted_payment_id?: string | null
          received_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_check_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_check_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ss_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_check_payments_posted_payment_id_fkey"
            columns: ["posted_payment_id"]
            isOneToOne: false
            referencedRelation: "ss_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_checklist_items: {
        Row: {
          created_at: string
          hint: string | null
          id: string
          is_active: boolean
          is_required: boolean
          label: string
          photo: string
          plan_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          hint?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          label: string
          photo?: string
          plan_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          hint?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          label?: string
          photo?: string
          plan_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ss_city_rates: {
        Row: {
          city: string
          created_at: string
          high: number
          id: string
          is_active: boolean
          low: number
          market_avg: number
          market_note: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          high?: number
          id?: string
          is_active?: boolean
          low?: number
          market_avg?: number
          market_note?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          high?: number
          id?: string
          is_active?: boolean
          low?: number
          market_avg?: number
          market_note?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ss_client_errors: {
        Row: {
          context: Json
          created_at: string
          id: string
          message: string
          route: string | null
          stack: string | null
          surface: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          message: string
          route?: string | null
          stack?: string | null
          surface?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          message?: string
          route?: string | null
          stack?: string | null
          surface?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ss_contact_verifications: {
        Row: {
          attempts: number
          channel: string
          code_hash: string
          consumed_at: string | null
          created_at: string
          customer_id: string
          expires_at: string
          id: string
          new_value: string
          user_id: string
        }
        Insert: {
          attempts?: number
          channel: string
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          customer_id: string
          expires_at: string
          id?: string
          new_value: string
          user_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          customer_id?: string
          expires_at?: string
          id?: string
          new_value?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_contact_verifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_contract_events: {
        Row: {
          contract_id: string
          created_at: string
          detail: string | null
          event: string
          id: string
          ip: string | null
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          detail?: string | null
          event: string
          id?: string
          ip?: string | null
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          detail?: string | null
          event?: string
          id?: string
          ip?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "ss_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_contract_sms: {
        Row: {
          contract_id: string
          created_at: string
          error_message: string | null
          id: string
          message_sid: string | null
          sent_by: string | null
          status: string
          to_phone: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_sid?: string | null
          sent_by?: string | null
          status?: string
          to_phone: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_sid?: string | null
          sent_by?: string | null
          status?: string
          to_phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_contract_sms_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "ss_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_contract_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ss_contracts: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          declined_at: string | null
          doc_kind: string
          expires_at: string | null
          id: string
          lead_id: string | null
          merge_data: Json
          pdf_path: string | null
          quote_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          sent_at: string | null
          signature_data_url: string | null
          signed_at: string | null
          signer_ip: string | null
          signer_name: string | null
          signer_user_agent: string | null
          signing_started_at: string | null
          status: string
          template_id: string | null
          title: string
          token: string
          updated_at: string
          viewed_at: string | null
          voided_at: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          declined_at?: string | null
          doc_kind?: string
          expires_at?: string | null
          id?: string
          lead_id?: string | null
          merge_data?: Json
          pdf_path?: string | null
          quote_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          signature_data_url?: string | null
          signed_at?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          signer_user_agent?: string | null
          signing_started_at?: string | null
          status?: string
          template_id?: string | null
          title: string
          token?: string
          updated_at?: string
          viewed_at?: string | null
          voided_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          declined_at?: string | null
          doc_kind?: string
          expires_at?: string | null
          id?: string
          lead_id?: string | null
          merge_data?: Json
          pdf_path?: string | null
          quote_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          signature_data_url?: string | null
          signed_at?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          signer_user_agent?: string | null
          signing_started_at?: string | null
          status?: string
          template_id?: string | null
          title?: string
          token?: string
          updated_at?: string
          viewed_at?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ss_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "ss_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ss_contract_templates"
            referencedColumns: ["id"]
          },
        ]
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
          commitment_end: string | null
          commitment_months: number | null
          commitment_start: string | null
          created_at: string
          custom_fields: Json
          customer_code: string | null
          dog_name: string | null
          email: string | null
          emails: Json
          equipment: Json
          filter_interval_days: number
          full_name: string
          gallons: number
          gate_code: string | null
          id: string
          internal_notes: string | null
          invoice_day: number
          labor_cost_type: string | null
          last_filter_clean_at: string | null
          lat: number | null
          lng: number | null
          location_code: string | null
          location_notes: string | null
          minutes_at_stop: number | null
          monthly_price: number
          notify_invoices: boolean
          notify_marketing: boolean
          notify_reports: boolean
          notify_visits: boolean
          phone: string | null
          phones: Json
          pool_type: string
          postal_code: string | null
          preferred_contact: string
          promo_code: string | null
          rate_override: number | null
          rate_override_note: string | null
          rate_type: string | null
          referral_code: string | null
          route_day: string | null
          route_frequency: string
          service_level: string
          state: string
          status: Database["public"]["Enums"]["ss_cust_status"]
          tech_pay_rate: number | null
          tech_upsell_pct: number | null
          updated_at: string
          user_id: string | null
          workflow_template_id: string | null
        }
        Insert: {
          address?: string | null
          assigned_tech_id?: string | null
          billing_mode?: string
          billing_timing?: string
          charge_for_chems?: boolean
          city?: string | null
          commitment_end?: string | null
          commitment_months?: number | null
          commitment_start?: string | null
          created_at?: string
          custom_fields?: Json
          customer_code?: string | null
          dog_name?: string | null
          email?: string | null
          emails?: Json
          equipment?: Json
          filter_interval_days?: number
          full_name: string
          gallons?: number
          gate_code?: string | null
          id?: string
          internal_notes?: string | null
          invoice_day?: number
          labor_cost_type?: string | null
          last_filter_clean_at?: string | null
          lat?: number | null
          lng?: number | null
          location_code?: string | null
          location_notes?: string | null
          minutes_at_stop?: number | null
          monthly_price?: number
          notify_invoices?: boolean
          notify_marketing?: boolean
          notify_reports?: boolean
          notify_visits?: boolean
          phone?: string | null
          phones?: Json
          pool_type?: string
          postal_code?: string | null
          preferred_contact?: string
          promo_code?: string | null
          rate_override?: number | null
          rate_override_note?: string | null
          rate_type?: string | null
          referral_code?: string | null
          route_day?: string | null
          route_frequency?: string
          service_level?: string
          state?: string
          status?: Database["public"]["Enums"]["ss_cust_status"]
          tech_pay_rate?: number | null
          tech_upsell_pct?: number | null
          updated_at?: string
          user_id?: string | null
          workflow_template_id?: string | null
        }
        Update: {
          address?: string | null
          assigned_tech_id?: string | null
          billing_mode?: string
          billing_timing?: string
          charge_for_chems?: boolean
          city?: string | null
          commitment_end?: string | null
          commitment_months?: number | null
          commitment_start?: string | null
          created_at?: string
          custom_fields?: Json
          customer_code?: string | null
          dog_name?: string | null
          email?: string | null
          emails?: Json
          equipment?: Json
          filter_interval_days?: number
          full_name?: string
          gallons?: number
          gate_code?: string | null
          id?: string
          internal_notes?: string | null
          invoice_day?: number
          labor_cost_type?: string | null
          last_filter_clean_at?: string | null
          lat?: number | null
          lng?: number | null
          location_code?: string | null
          location_notes?: string | null
          minutes_at_stop?: number | null
          monthly_price?: number
          notify_invoices?: boolean
          notify_marketing?: boolean
          notify_reports?: boolean
          notify_visits?: boolean
          phone?: string | null
          phones?: Json
          pool_type?: string
          postal_code?: string | null
          preferred_contact?: string
          promo_code?: string | null
          rate_override?: number | null
          rate_override_note?: string | null
          rate_type?: string | null
          referral_code?: string | null
          route_day?: string | null
          route_frequency?: string
          service_level?: string
          state?: string
          status?: Database["public"]["Enums"]["ss_cust_status"]
          tech_pay_rate?: number | null
          tech_upsell_pct?: number | null
          updated_at?: string
          user_id?: string | null
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_customers_assigned_tech_id_fkey"
            columns: ["assigned_tech_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_customers_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "ss_workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_deploy_health_checks: {
        Row: {
          alert_result: string | null
          boot_id: string | null
          checked_at: string
          detail: string | null
          failed_checks: string[]
          http_status: number | null
          id: string
          source: string
          status: string
        }
        Insert: {
          alert_result?: string | null
          boot_id?: string | null
          checked_at?: string
          detail?: string | null
          failed_checks?: string[]
          http_status?: number | null
          id?: string
          source?: string
          status: string
        }
        Update: {
          alert_result?: string | null
          boot_id?: string | null
          checked_at?: string
          detail?: string | null
          failed_checks?: string[]
          http_status?: number | null
          id?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      ss_dosage_products: {
        Row: {
          cost_per_unit: number
          created_at: string
          dose_key: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          sort_order: number
          strength_pct: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          dose_key: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          sort_order?: number
          strength_pct?: number | null
          unit?: string
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          dose_key?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          sort_order?: number
          strength_pct?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      ss_email_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          filename: string
          id: string
          message_id: string
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          filename: string
          id?: string
          message_id: string
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          filename?: string
          id?: string
          message_id?: string
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_email_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ss_email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_email_campaign_recipients: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          created_at: string
          email: string
          error: string | null
          id: string
          lead_id: string | null
          message_id: string | null
          opened_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          email: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message_id?: string | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          email?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message_id?: string | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_email_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ss_email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_email_campaign_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ss_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_email_campaigns: {
        Row: {
          audience_filters: Json
          audience_type: string
          body_html: string
          body_text: string
          created_at: string
          from_address: string | null
          id: string
          name: string
          reply_to: string | null
          scheduled_at: string | null
          sent_at: string | null
          sent_by: string | null
          stats: Json
          status: string
          subject: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          audience_filters?: Json
          audience_type?: string
          body_html: string
          body_text: string
          created_at?: string
          from_address?: string | null
          id?: string
          name: string
          reply_to?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          stats?: Json
          status?: string
          subject: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          audience_filters?: Json
          audience_type?: string
          body_html?: string
          body_text?: string
          created_at?: string
          from_address?: string | null
          id?: string
          name?: string
          reply_to?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          stats?: Json
          status?: string
          subject?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_email_campaigns_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ss_email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_email_messages: {
        Row: {
          attachment_expected_count: number
          attachment_failure_summary: string | null
          attachment_saved_count: number
          body_html: string | null
          body_text: string | null
          created_at: string
          direction: string
          from_email: string
          from_name: string | null
          id: string
          in_reply_to: string | null
          is_read: boolean
          message_id: string | null
          refs: string | null
          sent_by: string | null
          subject: string | null
          thread_id: string
          to_email: string
        }
        Insert: {
          attachment_expected_count?: number
          attachment_failure_summary?: string | null
          attachment_saved_count?: number
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          direction: string
          from_email: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_read?: boolean
          message_id?: string | null
          refs?: string | null
          sent_by?: string | null
          subject?: string | null
          thread_id: string
          to_email: string
        }
        Update: {
          attachment_expected_count?: number
          attachment_failure_summary?: string | null
          attachment_saved_count?: number
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          direction?: string
          from_email?: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_read?: boolean
          message_id?: string | null
          refs?: string | null
          sent_by?: string | null
          subject?: string | null
          thread_id?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_email_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ss_email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_email_templates: {
        Row: {
          body_html: string
          body_text: string
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          merge_tags: string[]
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          body_text: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          merge_tags?: string[]
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          body_text?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          merge_tags?: string[]
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_email_threads: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          id: string
          last_direction: string
          last_message_at: string
          last_snippet: string | null
          participant_email: string
          participant_name: string | null
          status: string
          subject: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          last_direction?: string
          last_message_at?: string
          last_snippet?: string | null
          participant_email: string
          participant_name?: string | null
          status?: string
          subject?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          last_direction?: string
          last_message_at?: string
          last_snippet?: string | null
          participant_email?: string
          participant_name?: string | null
          status?: string
          subject?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_email_threads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_email_threads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_equipment: {
        Row: {
          brand: string | null
          condition: string
          created_at: string
          customer_id: string
          id: string
          installed_on: string | null
          is_active: boolean
          kind: string
          last_serviced_on: string | null
          model: string | null
          name: string
          notes: string | null
          photos: Json
          serial_number: string | null
          sort_order: number
          spec: Json
          updated_at: string
          warranty_expires_on: string | null
          water_body_id: string | null
        }
        Insert: {
          brand?: string | null
          condition?: string
          created_at?: string
          customer_id: string
          id?: string
          installed_on?: string | null
          is_active?: boolean
          kind?: string
          last_serviced_on?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          photos?: Json
          serial_number?: string | null
          sort_order?: number
          spec?: Json
          updated_at?: string
          warranty_expires_on?: string | null
          water_body_id?: string | null
        }
        Update: {
          brand?: string | null
          condition?: string
          created_at?: string
          customer_id?: string
          id?: string
          installed_on?: string | null
          is_active?: boolean
          kind?: string
          last_serviced_on?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          photos?: Json
          serial_number?: string | null
          sort_order?: number
          spec?: Json
          updated_at?: string
          warranty_expires_on?: string | null
          water_body_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_equipment_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_equipment_water_body_id_fkey"
            columns: ["water_body_id"]
            isOneToOne: false
            referencedRelation: "ss_water_bodies"
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
      ss_failure_alerts: {
        Row: {
          account_key: string
          account_name: string | null
          alert_count: number
          alert_result: string | null
          created_at: string
          failed_events: number
          failure_rate: number
          id: string
          last_alerted_at: string
          threshold_pct: number
          total_events: number
          updated_at: string
          window_minutes: number
        }
        Insert: {
          account_key: string
          account_name?: string | null
          alert_count?: number
          alert_result?: string | null
          created_at?: string
          failed_events?: number
          failure_rate?: number
          id?: string
          last_alerted_at?: string
          threshold_pct?: number
          total_events?: number
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          account_key?: string
          account_name?: string | null
          alert_count?: number
          alert_result?: string | null
          created_at?: string
          failed_events?: number
          failure_rate?: number
          id?: string
          last_alerted_at?: string
          threshold_pct?: number
          total_events?: number
          updated_at?: string
          window_minutes?: number
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
      ss_internal_notes: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          created_at: string
          customer_id: string | null
          id: string
          lead_id: string | null
          pinned: boolean
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          created_at?: string
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          pinned?: boolean
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          pinned?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ss_internal_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_internal_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ss_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_internal_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          customer_id: string | null
          details: string | null
          due_at: string | null
          escalated_from: string | null
          escalation_level: number
          id: string
          last_escalated_at: string | null
          lead_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string | null
          details?: string | null
          due_at?: string | null
          escalated_from?: string | null
          escalation_level?: number
          id?: string
          last_escalated_at?: string | null
          lead_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string | null
          details?: string | null
          due_at?: string | null
          escalated_from?: string | null
          escalation_level?: number
          id?: string
          last_escalated_at?: string | null
          lead_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_internal_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_internal_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ss_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_inventory: {
        Row: {
          barcode: string | null
          created_at: string
          id: string
          low_threshold: number
          name: string
          pack_size: number | null
          pack_unit: string | null
          quantity: number
          sku: string | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          id?: string
          low_threshold?: number
          name: string
          pack_size?: number | null
          pack_unit?: string | null
          quantity?: number
          sku?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          created_at?: string
          id?: string
          low_threshold?: number
          name?: string
          pack_size?: number | null
          pack_unit?: string | null
          quantity?: number
          sku?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      ss_inventory_moves: {
        Row: {
          actor_id: string | null
          created_at: string
          customer_id: string | null
          delta: number
          entered_qty: number | null
          entered_unit: string | null
          id: string
          item_id: string
          item_name: string
          job_id: string | null
          note: string | null
          quantity_after: number
          reason: string
          total_cost: number | null
          unit_cost: number | null
          visit_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          customer_id?: string | null
          delta: number
          entered_qty?: number | null
          entered_unit?: string | null
          id?: string
          item_id: string
          item_name: string
          job_id?: string | null
          note?: string | null
          quantity_after: number
          reason?: string
          total_cost?: number | null
          unit_cost?: number | null
          visit_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          customer_id?: string | null
          delta?: number
          entered_qty?: number | null
          entered_unit?: string | null
          id?: string
          item_id?: string
          item_name?: string
          job_id?: string | null
          note?: string | null
          quantity_after?: number
          reason?: string
          total_cost?: number | null
          unit_cost?: number | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_inventory_moves_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_inventory_moves_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ss_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_inventory_moves_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ss_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_inventory_moves_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "ss_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_invoice_items: {
        Row: {
          account_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          is_upsell: boolean
          line_total: number
          quantity: number
          sold_by_tech_id: string | null
          unit_cost: number
          unit_price: number
          visit_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          is_upsell?: boolean
          line_total?: number
          quantity?: number
          sold_by_tech_id?: string | null
          unit_cost?: number
          unit_price?: number
          visit_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          is_upsell?: boolean
          line_total?: number
          quantity?: number
          sold_by_tech_id?: string | null
          unit_cost?: number
          unit_price?: number
          visit_id?: string | null
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
          {
            foreignKeyName: "ss_invoice_items_sold_by_tech_id_fkey"
            columns: ["sold_by_tech_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_invoice_items_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "ss_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_invoice_reconciliation: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          checked_at: string
          created_at: string
          crm_total: number
          currency: string
          difference: number
          id: string
          invoice_id: string
          note: string | null
          state: string
          stripe_amount: number | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          checked_at?: string
          created_at?: string
          crm_total?: number
          currency?: string
          difference?: number
          id?: string
          invoice_id: string
          note?: string | null
          state?: string
          stripe_amount?: number | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          checked_at?: string
          created_at?: string
          crm_total?: number
          currency?: string
          difference?: number
          id?: string
          invoice_id?: string
          note?: string | null
          state?: string
          stripe_amount?: number | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_invoice_reconciliation_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
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
      ss_job_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          job_id: string
          label: string
          spent_on: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          job_id: string
          label: string
          spent_on?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          job_id?: string
          label?: string
          spent_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_job_expenses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ss_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_job_time_entries: {
        Row: {
          created_at: string
          ended_at: string | null
          hourly_rate: number
          id: string
          job_id: string
          minutes: number
          note: string | null
          source: string
          staff_id: string | null
          started_at: string | null
          updated_at: string
          worked_on: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          hourly_rate?: number
          id?: string
          job_id: string
          minutes?: number
          note?: string | null
          source?: string
          staff_id?: string | null
          started_at?: string | null
          updated_at?: string
          worked_on?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          hourly_rate?: number
          id?: string
          job_id?: string
          minutes?: number
          note?: string | null
          source?: string
          staff_id?: string | null
          started_at?: string | null
          updated_at?: string
          worked_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_job_time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ss_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_job_time_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
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
          work_order_type_id: string | null
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
          work_order_type_id?: string | null
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
          work_order_type_id?: string | null
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
          {
            foreignKeyName: "ss_jobs_work_order_type_id_fkey"
            columns: ["work_order_type_id"]
            isOneToOne: false
            referencedRelation: "ss_work_order_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_lead_appointments: {
        Row: {
          assigned_staff_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          ends_at: string
          id: string
          kind: string
          lead_id: string
          location: string | null
          notes: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          ends_at: string
          id?: string
          kind?: string
          lead_id: string
          location?: string | null
          notes?: string | null
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          ends_at?: string
          id?: string
          kind?: string
          lead_id?: string
          location?: string | null
          notes?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_lead_appointments_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_lead_appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_lead_appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ss_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_lead_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: string | null
          event_type: string
          id: string
          label: string
          lead_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          event_type: string
          id?: string
          label: string
          lead_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          event_type?: string
          id?: string
          label?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ss_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_leads: {
        Row: {
          address: string | null
          city: string | null
          cleanup_price: number | null
          commitment_months: number | null
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
          plan_assigned_at: string | null
          plan_id: string | null
          plan_status: string
          pool_size: string | null
          promo_code: string | null
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
          commitment_months?: number | null
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
          plan_assigned_at?: string | null
          plan_id?: string | null
          plan_status?: string
          pool_size?: string | null
          promo_code?: string | null
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
          commitment_months?: number | null
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
          plan_assigned_at?: string | null
          plan_id?: string | null
          plan_status?: string
          pool_size?: string | null
          promo_code?: string | null
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
      ss_native_push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ss_not_found_events: {
        Row: {
          alert_result: string | null
          alerted: boolean
          created_at: string
          full_url: string | null
          id: string
          internal_referrer: boolean
          ip_address: string | null
          path: string
          referrer: string | null
          source: string
          user_agent: string | null
        }
        Insert: {
          alert_result?: string | null
          alerted?: boolean
          created_at?: string
          full_url?: string | null
          id?: string
          internal_referrer?: boolean
          ip_address?: string | null
          path: string
          referrer?: string | null
          source?: string
          user_agent?: string | null
        }
        Update: {
          alert_result?: string | null
          alerted?: boolean
          created_at?: string
          full_url?: string | null
          id?: string
          internal_referrer?: boolean
          ip_address?: string | null
          path?: string
          referrer?: string | null
          source?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      ss_notification_prefs: {
        Row: {
          account_email: boolean
          account_in_app: boolean
          account_push: boolean
          account_sms: boolean
          created_at: string
          lead_sla_email: boolean
          lead_sla_in_app: boolean
          lead_sla_push: boolean
          lead_sla_sms: boolean
          role_change_email: boolean
          role_change_in_app: boolean
          role_change_push: boolean
          role_change_sms: boolean
          sms_number: string | null
          updated_at: string
          user_id: string
          visit_email: boolean
          visit_in_app: boolean
          visit_push: boolean
          visit_sms: boolean
        }
        Insert: {
          account_email?: boolean
          account_in_app?: boolean
          account_push?: boolean
          account_sms?: boolean
          created_at?: string
          lead_sla_email?: boolean
          lead_sla_in_app?: boolean
          lead_sla_push?: boolean
          lead_sla_sms?: boolean
          role_change_email?: boolean
          role_change_in_app?: boolean
          role_change_push?: boolean
          role_change_sms?: boolean
          sms_number?: string | null
          updated_at?: string
          user_id: string
          visit_email?: boolean
          visit_in_app?: boolean
          visit_push?: boolean
          visit_sms?: boolean
        }
        Update: {
          account_email?: boolean
          account_in_app?: boolean
          account_push?: boolean
          account_sms?: boolean
          created_at?: string
          lead_sla_email?: boolean
          lead_sla_in_app?: boolean
          lead_sla_push?: boolean
          lead_sla_sms?: boolean
          role_change_email?: boolean
          role_change_in_app?: boolean
          role_change_push?: boolean
          role_change_sms?: boolean
          sms_number?: string | null
          updated_at?: string
          user_id?: string
          visit_email?: boolean
          visit_in_app?: boolean
          visit_push?: boolean
          visit_sms?: boolean
        }
        Relationships: []
      }
      ss_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ss_payment_events: {
        Row: {
          amount: number | null
          created_at: string
          currency: string
          customer_id: string | null
          detail: Json
          error_message: string | null
          id: string
          invoice_id: string | null
          kind: string
          method: string | null
          status: string | null
          stripe_amount: number | null
          stripe_event_id: string | null
          stripe_session_id: string | null
          webhook_ok: boolean | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          detail?: Json
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          kind: string
          method?: string | null
          status?: string | null
          stripe_amount?: number | null
          stripe_event_id?: string | null
          stripe_session_id?: string | null
          webhook_ok?: boolean | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          detail?: Json
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          kind?: string
          method?: string | null
          status?: string | null
          stripe_amount?: number | null
          stripe_event_id?: string | null
          stripe_session_id?: string | null
          webhook_ok?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_payment_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_payment_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ss_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_payment_pickups: {
        Row: {
          admin_confirmed_at: string | null
          admin_note: string | null
          assigned_tech_id: string | null
          collected_amount: number | null
          collected_at: string | null
          collected_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          customer_note: string | null
          id: string
          method: string
          office_note: string | null
          photo_path: string | null
          pickup_address: string | null
          requested_by_customer: boolean
          scheduled_for: string | null
          status: string
          tech_note: string | null
          visit_id: string | null
        }
        Insert: {
          admin_confirmed_at?: string | null
          admin_note?: string | null
          assigned_tech_id?: string | null
          collected_amount?: number | null
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_note?: string | null
          id?: string
          method?: string
          office_note?: string | null
          photo_path?: string | null
          pickup_address?: string | null
          requested_by_customer?: boolean
          scheduled_for?: string | null
          status?: string
          tech_note?: string | null
          visit_id?: string | null
        }
        Update: {
          admin_confirmed_at?: string | null
          admin_note?: string | null
          assigned_tech_id?: string | null
          collected_amount?: number | null
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_note?: string | null
          id?: string
          method?: string
          office_note?: string | null
          photo_path?: string | null
          pickup_address?: string | null
          requested_by_customer?: boolean
          scheduled_for?: string | null
          status?: string
          tech_note?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_payment_pickups_assigned_tech_id_fkey"
            columns: ["assigned_tech_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_payment_pickups_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_payment_pickups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_payment_pickups_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "ss_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_payment_proofs: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          image_path: string
          invoice_id: string
          method: string
          note: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          image_path: string
          invoice_id: string
          method: string
          note?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          image_path?: string
          invoice_id?: string
          method?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_payment_proofs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_payment_proofs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ss_invoices"
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
      ss_phone_optouts: {
        Row: {
          created_at: string
          id: string
          keyword: string | null
          opted_out_at: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          keyword?: string | null
          opted_out_at?: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string | null
          opted_out_at?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      ss_pool_costs: {
        Row: {
          chem_cost_per_visit: number
          chem_supplied_by_customer: boolean
          created_at: string
          customer_id: string
          extra_lines: Json
          id: string
          target_margin_pct: number | null
          tech_pay_per_visit: number | null
          updated_at: string
          visits_per_month: number
        }
        Insert: {
          chem_cost_per_visit?: number
          chem_supplied_by_customer?: boolean
          created_at?: string
          customer_id: string
          extra_lines?: Json
          id?: string
          target_margin_pct?: number | null
          tech_pay_per_visit?: number | null
          updated_at?: string
          visits_per_month?: number
        }
        Update: {
          chem_cost_per_visit?: number
          chem_supplied_by_customer?: boolean
          created_at?: string
          customer_id?: string
          extra_lines?: Json
          id?: string
          target_margin_pct?: number | null
          tech_pay_per_visit?: number | null
          updated_at?: string
          visits_per_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "ss_pool_costs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "ss_customers"
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
      ss_pricing_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      ss_project_alert_log: {
        Row: {
          alert_key: string
          channel: string
          created_at: string
          id: string
          project_id: string
          recipients: string[]
          stage_id: string | null
        }
        Insert: {
          alert_key: string
          channel?: string
          created_at?: string
          id?: string
          project_id: string
          recipients?: string[]
          stage_id?: string | null
        }
        Update: {
          alert_key?: string
          channel?: string
          created_at?: string
          id?: string
          project_id?: string
          recipients?: string[]
          stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_project_alert_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ss_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_project_alert_log_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "ss_project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_project_files: {
        Row: {
          created_at: string
          description: string | null
          design_id: string | null
          doc_folder: string
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
          doc_folder?: string
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
          doc_folder?: string
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
      ss_project_stage_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          doc_folder: string | null
          id: string
          is_done: boolean
          is_required: boolean
          kind: string
          label: string
          project_id: string
          sort_order: number
          stage_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          doc_folder?: string | null
          id?: string
          is_done?: boolean
          is_required?: boolean
          kind?: string
          label: string
          project_id: string
          sort_order?: number
          stage_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          doc_folder?: string | null
          id?: string
          is_done?: boolean
          is_required?: boolean
          kind?: string
          label?: string
          project_id?: string
          sort_order?: number
          stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_project_stage_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ss_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_project_stage_tasks_stage_id_fkey"
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
          depends_on_id: string | null
          duration_days: number
          end_date: string | null
          id: string
          lag_days: number
          name: string
          notes: string | null
          project_id: string
          sort_order: number
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          depends_on_id?: string | null
          duration_days?: number
          end_date?: string | null
          id?: string
          lag_days?: number
          name: string
          notes?: string | null
          project_id: string
          sort_order?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          depends_on_id?: string | null
          duration_days?: number
          end_date?: string | null
          id?: string
          lag_days?: number
          name?: string
          notes?: string | null
          project_id?: string
          sort_order?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_project_stages_depends_on_id_fkey"
            columns: ["depends_on_id"]
            isOneToOne: false
            referencedRelation: "ss_project_stages"
            referencedColumns: ["id"]
          },
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
          lead_staff_id: string | null
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
          lead_staff_id?: string | null
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
          lead_staff_id?: string | null
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
          {
            foreignKeyName: "ss_projects_lead_staff_id_fkey"
            columns: ["lead_staff_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_promo_codes: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          description: string | null
          discount_type: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          min_commitment_months: number
          times_used: number
          updated_at: string
          value: number
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          min_commitment_months?: number
          times_used?: number
          updated_at?: string
          value?: number
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          min_commitment_months?: number
          times_used?: number
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      ss_promo_redemptions: {
        Row: {
          code: string
          commitment_months: number | null
          created_at: string
          customer_id: string | null
          id: string
          lead_id: string | null
          monthly_after: number | null
          monthly_before: number | null
          promo_id: string | null
        }
        Insert: {
          code: string
          commitment_months?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          monthly_after?: number | null
          monthly_before?: number | null
          promo_id?: string | null
        }
        Update: {
          code?: string
          commitment_months?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          monthly_after?: number | null
          monthly_before?: number | null
          promo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_promo_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_promo_redemptions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ss_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_promo_redemptions_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "ss_promo_codes"
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
      ss_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ss_qc_reviews: {
        Row: {
          action_required: string | null
          average_score: number | null
          created_at: string
          development_area: string | null
          id: string
          items_failed: number
          notes: Json
          pools_reviewed: number | null
          reviewer_id: string | null
          reviewer_name: string | null
          scores: Json
          signed_off_at: string | null
          signed_off_by: string | null
          tech_id: string
          top_strength: string | null
          updated_at: string
          week_of: string
        }
        Insert: {
          action_required?: string | null
          average_score?: number | null
          created_at?: string
          development_area?: string | null
          id?: string
          items_failed?: number
          notes?: Json
          pools_reviewed?: number | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          scores?: Json
          signed_off_at?: string | null
          signed_off_by?: string | null
          tech_id: string
          top_strength?: string | null
          updated_at?: string
          week_of: string
        }
        Update: {
          action_required?: string | null
          average_score?: number | null
          created_at?: string
          development_area?: string | null
          id?: string
          items_failed?: number
          notes?: Json
          pools_reviewed?: number | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          scores?: Json
          signed_off_at?: string | null
          signed_off_by?: string | null
          tech_id?: string
          top_strength?: string | null
          updated_at?: string
          week_of?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_qc_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_qc_reviews_tech_id_fkey"
            columns: ["tech_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_qr_batches: {
        Row: {
          batch_number: number
          created_at: string
          created_by: string | null
          first_tag: string
          format: string
          id: string
          last_tag: string
          note: string | null
          size: number
          updated_at: string
        }
        Insert: {
          batch_number: number
          created_at?: string
          created_by?: string | null
          first_tag: string
          format?: string
          id?: string
          last_tag: string
          note?: string | null
          size: number
          updated_at?: string
        }
        Update: {
          batch_number?: number
          created_at?: string
          created_by?: string | null
          first_tag?: string
          format?: string
          id?: string
          last_tag?: string
          note?: string | null
          size?: number
          updated_at?: string
        }
        Relationships: []
      }
      ss_qr_scans: {
        Row: {
          accuracy_m: number | null
          created_at: string
          customer_id: string | null
          distance_ft: number | null
          id: string
          input_source: string
          lat: number | null
          lng: number | null
          outcome: string
          scanned_at: string
          staff_id: string | null
          tag_id: string
          user_agent: string | null
          visit_id: string | null
        }
        Insert: {
          accuracy_m?: number | null
          created_at?: string
          customer_id?: string | null
          distance_ft?: number | null
          id?: string
          input_source?: string
          lat?: number | null
          lng?: number | null
          outcome?: string
          scanned_at?: string
          staff_id?: string | null
          tag_id: string
          user_agent?: string | null
          visit_id?: string | null
        }
        Update: {
          accuracy_m?: number | null
          created_at?: string
          customer_id?: string | null
          distance_ft?: number | null
          id?: string
          input_source?: string
          lat?: number | null
          lng?: number | null
          outcome?: string
          scanned_at?: string
          staff_id?: string | null
          tag_id?: string
          user_agent?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_qr_scans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_qr_scans_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_qr_scans_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "ss_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_qr_tags: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          disabled_at: string | null
          disabled_reason: string | null
          first_scanned_at: string | null
          id: string
          last_scanned_at: string | null
          linked_at: string | null
          linked_by: string | null
          note: string | null
          printed_at: string | null
          qr_url: string | null
          replaced_by_tag: string | null
          service_address_id: string | null
          status: string
          tag_id: string
          updated_at: string
          water_body_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          first_scanned_at?: string | null
          id?: string
          last_scanned_at?: string | null
          linked_at?: string | null
          linked_by?: string | null
          note?: string | null
          printed_at?: string | null
          qr_url?: string | null
          replaced_by_tag?: string | null
          service_address_id?: string | null
          status?: string
          tag_id: string
          updated_at?: string
          water_body_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          first_scanned_at?: string | null
          id?: string
          last_scanned_at?: string | null
          linked_at?: string | null
          linked_by?: string | null
          note?: string | null
          printed_at?: string | null
          qr_url?: string | null
          replaced_by_tag?: string | null
          service_address_id?: string | null
          status?: string
          tag_id?: string
          updated_at?: string
          water_body_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_qr_tags_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "ss_qr_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_qr_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_qr_tags_service_address_id_fkey"
            columns: ["service_address_id"]
            isOneToOne: false
            referencedRelation: "ss_service_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_qr_tags_water_body_id_fkey"
            columns: ["water_body_id"]
            isOneToOne: false
            referencedRelation: "ss_water_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_quote_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_optional: boolean
          name: string
          quantity: number
          quote_id: string
          recurring: string | null
          selected: boolean
          sort_order: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_optional?: boolean
          name: string
          quantity?: number
          quote_id: string
          recurring?: string | null
          selected?: boolean
          sort_order?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_optional?: boolean
          name?: string
          quantity?: number
          quote_id?: string
          recurring?: string | null
          selected?: boolean
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "ss_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "ss_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_quote_templates: {
        Row: {
          chem_included: boolean
          created_at: string
          defaults: Json
          id: string
          is_active: boolean
          is_default: boolean
          lines: Json
          name: string
          plan_id: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          chem_included?: boolean
          created_at?: string
          defaults?: Json
          id?: string
          is_active?: boolean
          is_default?: boolean
          lines?: Json
          name: string
          plan_id: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          chem_included?: boolean
          created_at?: string
          defaults?: Json
          id?: string
          is_active?: boolean
          is_default?: boolean
          lines?: Json
          name?: string
          plan_id?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ss_quotes: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          contract_template_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          declined_at: string | null
          gallery: Json
          hero_image_url: string | null
          id: string
          intro: string | null
          lead_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          reviews: Json
          sent_at: string | null
          show_reviews: boolean
          status: string
          tax_pct: number
          title: string
          token: string
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          contract_template_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          declined_at?: string | null
          gallery?: Json
          hero_image_url?: string | null
          id?: string
          intro?: string | null
          lead_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          reviews?: Json
          sent_at?: string | null
          show_reviews?: boolean
          status?: string
          tax_pct?: number
          title?: string
          token?: string
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          contract_template_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          declined_at?: string | null
          gallery?: Json
          hero_image_url?: string | null
          id?: string
          intro?: string | null
          lead_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          reviews?: Json
          sent_at?: string | null
          show_reviews?: boolean
          status?: string
          tax_pct?: number
          title?: string
          token?: string
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_quotes_contract_template_id_fkey"
            columns: ["contract_template_id"]
            isOneToOne: false
            referencedRelation: "ss_contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ss_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_rate_limits: {
        Row: {
          bucket: string
          created_at: string
          hits: number
          id: string
          identifier: string
          window_start: string
        }
        Insert: {
          bucket: string
          created_at?: string
          hits?: number
          id?: string
          identifier: string
          window_start: string
        }
        Update: {
          bucket?: string
          created_at?: string
          hits?: number
          id?: string
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      ss_reading_fields: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          label: string
          purpose: string | null
          sort_order: number
          step: number
          target_max: number | null
          target_min: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label: string
          purpose?: string | null
          sort_order?: number
          step?: number
          target_max?: number | null
          target_min?: number | null
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          purpose?: string | null
          sort_order?: number
          step?: number
          target_max?: number | null
          target_min?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      ss_reminder_schedules: {
        Row: {
          appointment_type: string
          created_at: string
          enabled: boolean
          id: string
          offsets_hours: number[]
          updated_at: string
        }
        Insert: {
          appointment_type: string
          created_at?: string
          enabled?: boolean
          id?: string
          offsets_hours?: number[]
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          created_at?: string
          enabled?: boolean
          id?: string
          offsets_hours?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      ss_report_events: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string | null
          attempt: number
          bytes: number | null
          created_at: string
          customer_id: string | null
          date_label: string | null
          error: string | null
          filename: string | null
          id: string
          kind: string
          meta: Json
          property_label: string | null
          recipient: string | null
          status: string
          visit_id: string | null
        }
        Insert: {
          action: string
          actor_role?: string
          actor_user_id?: string | null
          attempt?: number
          bytes?: number | null
          created_at?: string
          customer_id?: string | null
          date_label?: string | null
          error?: string | null
          filename?: string | null
          id?: string
          kind?: string
          meta?: Json
          property_label?: string | null
          recipient?: string | null
          status?: string
          visit_id?: string | null
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string | null
          attempt?: number
          bytes?: number | null
          created_at?: string
          customer_id?: string | null
          date_label?: string | null
          error?: string | null
          filename?: string | null
          id?: string
          kind?: string
          meta?: Json
          property_label?: string | null
          recipient?: string | null
          status?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_report_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_report_events_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "ss_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_review_requests: {
        Row: {
          clicked_at: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          google_url: string
          id: string
          message: string | null
          opened_at: string | null
          phone: string | null
          photos: Json
          token: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          google_url: string
          id?: string
          message?: string | null
          opened_at?: string | null
          phone?: string | null
          photos?: Json
          token?: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          google_url?: string
          id?: string
          message?: string | null
          opened_at?: string | null
          phone?: string | null
          photos?: Json
          token?: string
        }
        Relationships: []
      }
      ss_route_schedules: {
        Row: {
          created_at: string
          customer_id: string
          end_date: string | null
          frequency: string
          id: string
          interval_weeks: number
          is_active: boolean
          label: string
          last_generated_through: string | null
          minutes_at_stop: number | null
          month_day: number | null
          notes: string | null
          start_date: string
          stop_order: number
          tech_id: string | null
          updated_at: string
          water_body_id: string | null
          weekdays: number[]
        }
        Insert: {
          created_at?: string
          customer_id: string
          end_date?: string | null
          frequency?: string
          id?: string
          interval_weeks?: number
          is_active?: boolean
          label?: string
          last_generated_through?: string | null
          minutes_at_stop?: number | null
          month_day?: number | null
          notes?: string | null
          start_date?: string
          stop_order?: number
          tech_id?: string | null
          updated_at?: string
          water_body_id?: string | null
          weekdays?: number[]
        }
        Update: {
          created_at?: string
          customer_id?: string
          end_date?: string | null
          frequency?: string
          id?: string
          interval_weeks?: number
          is_active?: boolean
          label?: string
          last_generated_through?: string | null
          minutes_at_stop?: number | null
          month_day?: number | null
          notes?: string | null
          start_date?: string
          stop_order?: number
          tech_id?: string | null
          updated_at?: string
          water_body_id?: string | null
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "ss_route_schedules_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_route_schedules_tech_id_fkey"
            columns: ["tech_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_route_schedules_water_body_id_fkey"
            columns: ["water_body_id"]
            isOneToOne: false
            referencedRelation: "ss_water_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_security_audit: {
        Row: {
          action: string
          actor_kind: string
          actor_label: string | null
          actor_staff_id: string | null
          actor_user_id: string | null
          created_at: string
          details: Json
          id: string
          ip_address: string | null
          outcome: string | null
          subject_id: string | null
          subject_table: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_kind?: string
          actor_label?: string | null
          actor_staff_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          outcome?: string | null
          subject_id?: string | null
          subject_table?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_kind?: string
          actor_label?: string | null
          actor_staff_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          outcome?: string | null
          subject_id?: string | null
          subject_table?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      ss_server_errors: {
        Row: {
          alert_result: string | null
          alert_sent: boolean
          boot_id: string | null
          fingerprint: string
          id: string
          ip_address: string | null
          message: string
          method: string | null
          occurred_at: string
          occurrences: number
          route: string | null
          source: string
          stack: string | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          alert_result?: string | null
          alert_sent?: boolean
          boot_id?: string | null
          fingerprint: string
          id?: string
          ip_address?: string | null
          message: string
          method?: string | null
          occurred_at?: string
          occurrences?: number
          route?: string | null
          source?: string
          stack?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          alert_result?: string | null
          alert_sent?: boolean
          boot_id?: string | null
          fingerprint?: string
          id?: string
          ip_address?: string | null
          message?: string
          method?: string | null
          occurred_at?: string
          occurrences?: number
          route?: string | null
          source?: string
          stack?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      ss_service_addresses: {
        Row: {
          address: string
          city: string | null
          created_at: string
          customer_id: string
          id: string
          is_billing: boolean
          is_default: boolean
          label: string
          notes: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_billing?: boolean
          is_default?: boolean
          label?: string
          notes?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_billing?: boolean
          is_default?: boolean
          label?: string
          notes?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_service_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
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
      ss_site_events: {
        Row: {
          button: string | null
          consent_state: string
          created_at: string
          event: string
          id: string
          page: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          button?: string | null
          consent_state?: string
          created_at?: string
          event: string
          id?: string
          page: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          button?: string | null
          consent_state?: string
          created_at?: string
          event?: string
          id?: string
          page?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      ss_site_reviews: {
        Row: {
          approved_at: string | null
          author_city: string | null
          author_name: string
          body: string
          contact_email: string | null
          created_at: string
          featured: boolean
          id: string
          page_path: string | null
          rating: number
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          author_city?: string | null
          author_name?: string
          body?: string
          contact_email?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          page_path?: string | null
          rating?: number
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          author_city?: string | null
          author_name?: string
          body?: string
          contact_email?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          page_path?: string | null
          rating?: number
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ss_sla_alerts: {
        Row: {
          body: string
          channel: string
          created_at: string
          error: string | null
          id: string
          recipient: string | null
          sent_at: string | null
          status: string
          subject: string | null
          task_id: string | null
          template_key: string
          user_id: string | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          recipient?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          task_id?: string | null
          template_key: string
          user_id?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          recipient?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          task_id?: string | null
          template_key?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ss_sla_rules: {
        Row: {
          channels: Json
          created_at: string
          created_by: string | null
          customer_id: string | null
          enabled: boolean
          escalate_hours: number | null
          fallback_user_id: string | null
          id: string
          label: string | null
          lead_id: string | null
          notes: string | null
          notify_office: boolean | null
          reassign_hours: number | null
          scope: string
          updated_at: string
          warn_hours: number | null
        }
        Insert: {
          channels?: Json
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          enabled?: boolean
          escalate_hours?: number | null
          fallback_user_id?: string | null
          id?: string
          label?: string | null
          lead_id?: string | null
          notes?: string | null
          notify_office?: boolean | null
          reassign_hours?: number | null
          scope: string
          updated_at?: string
          warn_hours?: number | null
        }
        Update: {
          channels?: Json
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          enabled?: boolean
          escalate_hours?: number | null
          fallback_user_id?: string | null
          id?: string
          label?: string | null
          lead_id?: string | null
          notes?: string | null
          notify_office?: boolean | null
          reassign_hours?: number | null
          scope?: string
          updated_at?: string
          warn_hours?: number | null
        }
        Relationships: []
      }
      ss_sla_templates: {
        Row: {
          body_tpl: string
          channels: Json
          display_name: string
          enabled: boolean
          key: string
          title_tpl: string
          updated_at: string
        }
        Insert: {
          body_tpl: string
          channels?: Json
          display_name: string
          enabled?: boolean
          key: string
          title_tpl: string
          updated_at?: string
        }
        Update: {
          body_tpl?: string
          channels?: Json
          display_name?: string
          enabled?: boolean
          key?: string
          title_tpl?: string
          updated_at?: string
        }
        Relationships: []
      }
      ss_sms_consent: {
        Row: {
          consent_source: string | null
          consent_text: string | null
          consent_url: string | null
          consented_at: string | null
          created_at: string
          id: string
          last_help_at: string | null
          opted_in: boolean
          phone: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          consent_source?: string | null
          consent_text?: string | null
          consent_url?: string | null
          consented_at?: string | null
          created_at?: string
          id?: string
          last_help_at?: string | null
          opted_in?: boolean
          phone: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          consent_source?: string | null
          consent_text?: string | null
          consent_url?: string | null
          consented_at?: string | null
          created_at?: string
          id?: string
          last_help_at?: string | null
          opted_in?: boolean
          phone?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ss_sms_messages: {
        Row: {
          body: string
          created_at: string
          direction: string
          error_detail: string | null
          from_number: string | null
          id: string
          sent_by: string | null
          status: string
          thread_id: string
          to_number: string | null
          twilio_sid: string | null
        }
        Insert: {
          body: string
          created_at?: string
          direction: string
          error_detail?: string | null
          from_number?: string | null
          id?: string
          sent_by?: string | null
          status?: string
          thread_id: string
          to_number?: string | null
          twilio_sid?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          direction?: string
          error_detail?: string | null
          from_number?: string | null
          id?: string
          sent_by?: string | null
          status?: string
          thread_id?: string
          to_number?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_sms_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ss_sms_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_sms_threads: {
        Row: {
          assigned_staff_id: string | null
          created_at: string
          customer_id: string | null
          display_name: string | null
          id: string
          last_message_at: string | null
          last_preview: string | null
          phone: string
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          id?: string
          last_message_at?: string | null
          last_preview?: string | null
          phone: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          id?: string
          last_message_at?: string | null
          last_preview?: string | null
          phone?: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_sms_threads_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_sms_threads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
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
          pay_rate: number | null
          phone: string | null
          updated_at: string
          upsell_pct: number | null
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
          pay_rate?: number | null
          phone?: string | null
          updated_at?: string
          upsell_pct?: number | null
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
          pay_rate?: number | null
          phone?: string | null
          updated_at?: string
          upsell_pct?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      ss_staff_availability: {
        Row: {
          created_at: string
          effective_from: string | null
          effective_to: string | null
          end_time: string
          id: string
          is_active: boolean
          max_stops: number | null
          start_time: string
          tech_id: string
          updated_at: string
          weekday: number
          window_minutes: number
        }
        Insert: {
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          max_stops?: number | null
          start_time?: string
          tech_id: string
          updated_at?: string
          weekday: number
          window_minutes?: number
        }
        Update: {
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          max_stops?: number | null
          start_time?: string
          tech_id?: string
          updated_at?: string
          weekday?: number
          window_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "ss_staff_availability_tech_id_fkey"
            columns: ["tech_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_staff_time_off: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          tech_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          tech_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          tech_id?: string
          updated_at?: string
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
      ss_task_audit: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          after: Json
          batch_id: string
          before: Json
          changed_fields: string[]
          created_at: string
          customer_id: string | null
          filters: Json
          id: string
          lead_id: string | null
          source: string
          task_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          after?: Json
          batch_id: string
          before?: Json
          changed_fields?: string[]
          created_at?: string
          customer_id?: string | null
          filters?: Json
          id?: string
          lead_id?: string | null
          source?: string
          task_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          after?: Json
          batch_id?: string
          before?: Json
          changed_fields?: string[]
          created_at?: string
          customer_id?: string | null
          filters?: Json
          id?: string
          lead_id?: string | null
          source?: string
          task_id?: string
        }
        Relationships: []
      }
      ss_tech_adjustments: {
        Row: {
          amount: number
          created_at: string
          effective_date: string
          id: string
          kind: string
          payout_id: string | null
          reason: string | null
          tech_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          effective_date?: string
          id?: string
          kind?: string
          payout_id?: string | null
          reason?: string | null
          tech_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          effective_date?: string
          id?: string
          kind?: string
          payout_id?: string | null
          reason?: string | null
          tech_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_tech_adjustments_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "ss_tech_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_tech_adjustments_tech_id_fkey"
            columns: ["tech_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_tech_payouts: {
        Row: {
          adjustments: number
          base_pay: number
          bonus_pay: number
          commission_pay: number
          created_at: string
          id: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          pools_count: number
          status: string
          tech_id: string
          total_pay: number
          updated_at: string
        }
        Insert: {
          adjustments?: number
          base_pay?: number
          bonus_pay?: number
          commission_pay?: number
          created_at?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          pools_count?: number
          status?: string
          tech_id: string
          total_pay?: number
          updated_at?: string
        }
        Update: {
          adjustments?: number
          base_pay?: number
          bonus_pay?: number
          commission_pay?: number
          created_at?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          pools_count?: number
          status?: string
          tech_id?: string
          total_pay?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_tech_payouts_tech_id_fkey"
            columns: ["tech_id"]
            isOneToOne: false
            referencedRelation: "ss_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_test_accounts: {
        Row: {
          created_at: string
          email: string
          environment: string
          id: string
          label: string
          last_rotated_at: string | null
          last_rotated_by: string | null
          notes: string | null
          role: string
          rotation_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          environment?: string
          id?: string
          label: string
          last_rotated_at?: string | null
          last_rotated_by?: string | null
          notes?: string | null
          role?: string
          rotation_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          environment?: string
          id?: string
          label?: string
          last_rotated_at?: string | null
          last_rotated_by?: string | null
          notes?: string | null
          role?: string
          rotation_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      ss_ticket_messages: {
        Row: {
          author_kind: string
          author_label: string | null
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_kind?: string
          author_label?: string | null
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_kind?: string
          author_label?: string | null
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ss_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_tickets: {
        Row: {
          category: string
          created_at: string
          customer_id: string
          id: string
          last_message_at: string
          priority: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          customer_id: string
          id?: string
          last_message_at?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          customer_id?: string
          id?: string
          last_message_at?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_time_standards: {
        Row: {
          created_at: string
          id: string
          is_commercial: boolean
          label: string
          max_drive_minutes: number
          max_gallons: number | null
          min_gallons: number
          notes: string | null
          size_key: string
          sort_order: number
          target_max_minutes: number
          target_min_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_commercial?: boolean
          label: string
          max_drive_minutes?: number
          max_gallons?: number | null
          min_gallons?: number
          notes?: string | null
          size_key: string
          sort_order?: number
          target_max_minutes?: number
          target_min_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_commercial?: boolean
          label?: string
          max_drive_minutes?: number
          max_gallons?: number | null
          min_gallons?: number
          notes?: string | null
          size_key?: string
          sort_order?: number
          target_max_minutes?: number
          target_min_minutes?: number
          updated_at?: string
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
      ss_truck_stock: {
        Row: {
          created_at: string
          id: string
          item_id: string
          low_threshold: number
          quantity: number
          truck_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          low_threshold?: number
          quantity?: number
          truck_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          low_threshold?: number
          quantity?: number
          truck_id?: string
          updated_at?: string
        }
        Relationships: []
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
      ss_user_prefs: {
        Row: {
          accent: string
          background: string
          created_at: string
          density: string
          last_paths: Json
          last_workspace: string | null
          pinned_widgets: Json
          sidebar_collapsed: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent?: string
          background?: string
          created_at?: string
          density?: string
          last_paths?: Json
          last_workspace?: string | null
          pinned_widgets?: Json
          sidebar_collapsed?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent?: string
          background?: string
          created_at?: string
          density?: string
          last_paths?: Json
          last_workspace?: string | null
          pinned_widgets?: Json
          sidebar_collapsed?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ss_vault_logins: {
        Row: {
          account_number: string | null
          category: string
          created_at: string
          id: string
          name: string
          notes: string | null
          secret_cipher: string | null
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
          url: string | null
          username: string | null
          vendor_id: string | null
        }
        Insert: {
          account_number?: string | null
          category?: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          secret_cipher?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
          url?: string | null
          username?: string | null
          vendor_id?: string | null
        }
        Update: {
          account_number?: string | null
          category?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          secret_cipher?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
          url?: string | null
          username?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      ss_vendors: {
        Row: {
          account_number: string | null
          active: boolean
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          supplies: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          account_number?: string | null
          active?: boolean
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          supplies?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_number?: string | null
          active?: boolean
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          supplies?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      ss_visit_requests: {
        Row: {
          created_at: string
          customer_id: string
          decided_at: string | null
          decided_by: string | null
          id: string
          note: string | null
          office_note: string | null
          quoted_price: number | null
          reason: string | null
          requested_date: string
          status: string
          updated_at: string
          visit_id: string | null
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string | null
          office_note?: string | null
          quoted_price?: number | null
          reason?: string | null
          requested_date: string
          status?: string
          updated_at?: string
          visit_id?: string | null
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string | null
          office_note?: string | null
          quoted_price?: number | null
          reason?: string | null
          requested_date?: string
          status?: string
          updated_at?: string
          visit_id?: string | null
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: []
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
          drive_miles: number | null
          drive_minutes: number | null
          en_route_at: string | null
          feedback: string | null
          id: string
          is_locked: boolean
          issue_reported: string | null
          minutes_on_site: number | null
          no_access_at: string | null
          no_access_photo_url: string | null
          no_access_reason: string | null
          notes: string | null
          pay_status: string
          payout_id: string | null
          photos: Json
          rain_hold: boolean
          readings: Json
          scheduled_date: string
          started_at: string | null
          status: string
          stop_order: number
          tech_bonus: number
          tech_id: string | null
          tech_pay: number
          updated_at: string
          upsell_amount: number
          upsell_commission: number
          water_body_id: string | null
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
          drive_miles?: number | null
          drive_minutes?: number | null
          en_route_at?: string | null
          feedback?: string | null
          id?: string
          is_locked?: boolean
          issue_reported?: string | null
          minutes_on_site?: number | null
          no_access_at?: string | null
          no_access_photo_url?: string | null
          no_access_reason?: string | null
          notes?: string | null
          pay_status?: string
          payout_id?: string | null
          photos?: Json
          rain_hold?: boolean
          readings?: Json
          scheduled_date?: string
          started_at?: string | null
          status?: string
          stop_order?: number
          tech_bonus?: number
          tech_id?: string | null
          tech_pay?: number
          updated_at?: string
          upsell_amount?: number
          upsell_commission?: number
          water_body_id?: string | null
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
          drive_miles?: number | null
          drive_minutes?: number | null
          en_route_at?: string | null
          feedback?: string | null
          id?: string
          is_locked?: boolean
          issue_reported?: string | null
          minutes_on_site?: number | null
          no_access_at?: string | null
          no_access_photo_url?: string | null
          no_access_reason?: string | null
          notes?: string | null
          pay_status?: string
          payout_id?: string | null
          photos?: Json
          rain_hold?: boolean
          readings?: Json
          scheduled_date?: string
          started_at?: string | null
          status?: string
          stop_order?: number
          tech_bonus?: number
          tech_id?: string | null
          tech_pay?: number
          updated_at?: string
          upsell_amount?: number
          upsell_commission?: number
          water_body_id?: string | null
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
          {
            foreignKeyName: "ss_visits_water_body_id_fkey"
            columns: ["water_body_id"]
            isOneToOne: false
            referencedRelation: "ss_water_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_water_bodies: {
        Row: {
          created_at: string
          customer_id: string
          gallons: number
          id: string
          is_active: boolean
          kind: string
          name: string
          notes: string | null
          sanitizer: string | null
          sort_order: number
          surface: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          gallons?: number
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          notes?: string | null
          sanitizer?: string | null
          sort_order?: number
          surface?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          gallons?: number
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          notes?: string | null
          sanitizer?: string | null
          sort_order?: number
          surface?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_water_bodies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_webhook_alerts: {
        Row: {
          alert_count: number
          alert_key: string
          alert_result: string | null
          alert_type: string
          baseline: number | null
          channel: string | null
          created_at: string
          failed_events: number
          failure_rate: number
          id: string
          last_alerted_at: string
          summary: string
          total_events: number
          updated_at: string
          window_minutes: number
        }
        Insert: {
          alert_count?: number
          alert_key: string
          alert_result?: string | null
          alert_type: string
          baseline?: number | null
          channel?: string | null
          created_at?: string
          failed_events?: number
          failure_rate?: number
          id?: string
          last_alerted_at?: string
          summary: string
          total_events?: number
          updated_at?: string
          window_minutes: number
        }
        Update: {
          alert_count?: number
          alert_key?: string
          alert_result?: string | null
          alert_type?: string
          baseline?: number | null
          channel?: string | null
          created_at?: string
          failed_events?: number
          failure_rate?: number
          id?: string
          last_alerted_at?: string
          summary?: string
          total_events?: number
          updated_at?: string
          window_minutes?: number
        }
        Relationships: []
      }
      ss_webhook_deliveries: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          direction: string
          endpoint: string | null
          event_key: string | null
          http_status: number | null
          id: string
          last_attempt_at: string
          last_error: string | null
          outcome: string
          reference: string | null
          request: Json
          response: string | null
          retried_at: string | null
          retried_by: string | null
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          direction?: string
          endpoint?: string | null
          event_key?: string | null
          http_status?: number | null
          id?: string
          last_attempt_at?: string
          last_error?: string | null
          outcome?: string
          reference?: string | null
          request?: Json
          response?: string | null
          retried_at?: string | null
          retried_by?: string | null
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          direction?: string
          endpoint?: string | null
          event_key?: string | null
          http_status?: number | null
          id?: string
          last_attempt_at?: string
          last_error?: string | null
          outcome?: string
          reference?: string | null
          request?: Json
          response?: string | null
          retried_at?: string | null
          retried_by?: string | null
        }
        Relationships: []
      }
      ss_webhook_secret_usage: {
        Row: {
          caller_origin: string | null
          created_at: string
          endpoint: string
          hit_count: number
          id: string
          key_used: string
          last_used_at: string
        }
        Insert: {
          caller_origin?: string | null
          created_at?: string
          endpoint: string
          hit_count?: number
          id?: string
          key_used: string
          last_used_at?: string
        }
        Update: {
          caller_origin?: string | null
          created_at?: string
          endpoint?: string
          hit_count?: number
          id?: string
          key_used?: string
          last_used_at?: string
        }
        Relationships: []
      }
      ss_work_order_types: {
        Row: {
          color: string
          created_at: string
          default_checklist: Json
          default_minutes: number
          default_price: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          default_checklist?: Json
          default_minutes?: number
          default_price?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          default_checklist?: Json
          default_minutes?: number
          default_price?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ss_workflow_tasks: {
        Row: {
          created_at: string
          customer_id: string
          hint: string | null
          id: string
          is_required: boolean
          label: string
          phase: string
          photo_required: boolean
          sort_order: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          hint?: string | null
          id?: string
          is_required?: boolean
          label: string
          phase?: string
          photo_required?: boolean
          sort_order?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          hint?: string | null
          id?: string
          is_required?: boolean
          label?: string
          phase?: string
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
      ss_workflow_template_steps: {
        Row: {
          created_at: string
          hint: string | null
          id: string
          is_required: boolean
          label: string
          phase: string
          photo_required: boolean
          sort_order: number
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hint?: string | null
          id?: string
          is_required?: boolean
          label: string
          phase?: string
          photo_required?: boolean
          sort_order?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hint?: string | null
          id?: string
          is_required?: boolean
          label?: string
          phase?: string
          photo_required?: boolean
          sort_order?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_workflow_template_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ss_workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_workflow_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
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
      web_vitals: {
        Row: {
          connection: string | null
          created_at: string
          device: string | null
          id: string
          metric: string
          nav_type: string | null
          path: string
          rating: string | null
          value: number
        }
        Insert: {
          connection?: string | null
          created_at?: string
          device?: string | null
          id?: string
          metric: string
          nav_type?: string | null
          path: string
          rating?: string | null
          value: number
        }
        Update: {
          connection?: string | null
          created_at?: string
          device?: string | null
          id?: string
          metric?: string
          nav_type?: string | null
          path?: string
          rating?: string | null
          value?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_service_photo_rules: { Args: never; Returns: Json }
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
      ss_accept_quote: {
        Args: { _selected_ids: string[]; _signer_name: string; _token: string }
        Returns: Json
      }
      ss_add_recurring_invoice_lines: {
        Args: { _customer: string; _invoice: string; _month: string }
        Returns: undefined
      }
      ss_apply_visit_late_fees: { Args: never; Returns: number }
      ss_approve_access_request: {
        Args: { _approve: boolean; _request_id: string }
        Returns: Json
      }
      ss_build_contract_body: {
        Args: { _quote_id: string; _signer_name?: string }
        Returns: Json
      }
      ss_can_claim_customer: {
        Args: { _customer_id: string }
        Returns: boolean
      }
      ss_can_finance: { Args: never; Returns: boolean }
      ss_claim_by_contact: {
        Args: {
          _address: string
          _city?: string
          _email: string
          _full_name: string
          _phone: string
        }
        Returns: Json
      }
      ss_claim_staff_by_email: { Args: never; Returns: Json }
      ss_clear_service_hold: {
        Args: { _customer_id: string }
        Returns: undefined
      }
      ss_confirm_customer: { Args: { _customer_id: string }; Returns: Json }
      ss_confirm_portal_payment: {
        Args: { p_confirm?: boolean; p_payment_id: string }
        Returns: Json
      }
      ss_convert_qty: {
        Args: {
          p_from: string
          p_pack_size?: number
          p_pack_unit?: string
          p_qty: number
          p_to: string
        }
        Returns: number
      }
      ss_declare_check_payment: {
        Args: {
          p_check_number?: string
          p_delivery?: string
          p_invoice_id: string
          p_note?: string
        }
        Returns: Json
      }
      ss_default_upsell_pct: { Args: never; Returns: number }
      ss_generate_monthly_invoices: { Args: { _month?: string }; Returns: Json }
      ss_generate_route_visits: {
        Args: { p_customer_id: string; p_through: string }
        Returns: number
      }
      ss_get_cancellation_context: { Args: { p_token: string }; Returns: Json }
      ss_get_contract: {
        Args: { _token: string }
        Returns: {
          body: string
          recipient_name: string
          sent_at: string
          signed_at: string
          signer_name: string
          status: string
          title: string
        }[]
      }
      ss_get_quote: { Args: { _token: string }; Returns: Json }
      ss_get_review_request: {
        Args: { _token: string }
        Returns: {
          customer_name: string
          google_url: string
          message: string
          photos: Json
        }[]
      }
      ss_is_office: { Args: never; Returns: boolean }
      ss_is_owner: { Args: never; Returns: boolean }
      ss_is_staff: { Args: never; Returns: boolean }
      ss_lead_is_resolved: {
        Args: { _lead: Database["public"]["Tables"]["ss_leads"]["Row"] }
        Returns: boolean
      }
      ss_lead_sla_config: { Args: never; Returns: Json }
      ss_log_contact_event: {
        Args: {
          p_campaign_id?: string
          p_email?: string
          p_event_type: string
          p_full_name?: string
          p_landing_page?: string
          p_page_path?: string
          p_phone?: string
          p_placement?: string
          p_referrer?: string
          p_session_id?: string
          p_user_agent?: string
          p_utm?: Json
        }
        Returns: Json
      }
      ss_log_inventory_usage: {
        Args: {
          p_items: Json
          p_job_id?: string
          p_note?: string
          p_visit_id?: string
        }
        Returns: Json
      }
      ss_log_quote_view: {
        Args: { _device?: string; _referrer?: string; _token: string }
        Returns: undefined
      }
      ss_log_savings_event: {
        Args: {
          p_campaign_id?: string
          p_event_type: string
          p_landing_page?: string
          p_page_path?: string
          p_placement?: string
          p_referrer?: string
          p_session_id?: string
          p_utm?: Json
        }
        Returns: Json
      }
      ss_mark_contract_progress: {
        Args: { _token: string }
        Returns: undefined
      }
      ss_mark_invoice_reminded: {
        Args: { _invoice_id: string }
        Returns: undefined
      }
      ss_mark_quote_viewed: { Args: { _token: string }; Returns: undefined }
      ss_mark_review_clicked: { Args: { _token: string }; Returns: undefined }
      ss_match_service_plan: {
        Args: {
          p_condition: string
          p_pool_size: string
          p_service_type: string
        }
        Returns: string
      }
      ss_my_chem_history: {
        Args: { _days?: number }
        Returns: {
          readings: Json
          visit_date: string
        }[]
      }
      ss_my_customer_id: { Args: never; Returns: string }
      ss_my_customer_ids: { Args: never; Returns: string[] }
      ss_my_documents: {
        Args: never
        Returns: {
          doc_kind: string
          id: string
          sent_at: string
          signed_at: string
          signer_name: string
          status: string
          title: string
          token: string
          viewed_at: string
        }[]
      }
      ss_my_inspection_requests: {
        Args: never
        Returns: {
          address: string
          converted_at: string
          created_at: string
          customer_note: string
          eta_at: string
          eta_window: string
          full_name: string
          id: string
          notes: string
          preferred_contact_time: string
          reference_number: string
          status: string
          updated_at: string
        }[]
      }
      ss_my_invoice_lines: {
        Args: { _invoice_id: string }
        Returns: {
          description: string
          line_total: number
          quantity: number
          unit_price: number
        }[]
      }
      ss_my_invoice_payments: {
        Args: { _invoice_id: string }
        Returns: {
          amount: number
          kind: string
          method: string
          note: string
          paid_on: string
          pending: boolean
        }[]
      }
      ss_my_level: {
        Args: { _uid: string }
        Returns: Database["public"]["Enums"]["ss_level"]
      }
      ss_my_pool: {
        Args: never
        Returns: {
          address: string
          city: string
          filter_interval_days: number
          full_name: string
          gallons: number
          id: string
          last_filter_clean_at: string
          monthly_price: number
          pool_type: string
          referral_code: string
          route_day: string
          service_level: string
          status: Database["public"]["Enums"]["ss_cust_status"]
        }[]
      }
      ss_my_profile: {
        Args: never
        Returns: {
          address: string
          city: string
          dog_name: string
          email: string
          full_name: string
          gate_code: string
          id: string
          location_notes: string
          notify_invoices: boolean
          notify_marketing: boolean
          notify_reports: boolean
          notify_visits: boolean
          phone: string
          postal_code: string
          preferred_contact: string
          state: string
        }[]
      }
      ss_my_staff_id: { Args: never; Returns: string }
      ss_my_visit_techs: {
        Args: never
        Returns: {
          tech_name: string
          visit_id: string
        }[]
      }
      ss_new_referral_code: { Args: never; Returns: string }
      ss_next_due_date: {
        Args: { _anchor: string; _from?: string }
        Returns: string
      }
      ss_next_pool_number: { Args: never; Returns: string }
      ss_norm_address: { Args: { _addr: string }; Returns: string }
      ss_notify_office: {
        Args: { _body: string; _kind: string; _link: string; _title: string }
        Returns: undefined
      }
      ss_open_invoice_for: { Args: { _customer: string }; Returns: string }
      ss_pick_lead_owner: { Args: { p_city: string }; Returns: string }
      ss_portal_pay_invoice: {
        Args: { p_invoice_id: string; p_method: string; p_reference?: string }
        Returns: Json
      }
      ss_portal_update_profile: { Args: { p_patch: Json }; Returns: Json }
      ss_promote_prospect: {
        Args: { _customer_id: string }
        Returns: undefined
      }
      ss_purge_webhook_deliveries: { Args: { _days?: number }; Returns: Json }
      ss_rate_limit_hit: {
        Args: {
          _bucket: string
          _identifier: string
          _max_hits: number
          _window_seconds: number
        }
        Returns: boolean
      }
      ss_recalc_invoice_paid: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      ss_recalc_visit_upsell: {
        Args: { _visit_id: string }
        Returns: undefined
      }
      ss_redeem_access_code: { Args: { _code: string }; Returns: Json }
      ss_remit_info: { Args: never; Returns: Json }
      ss_request_cancellation: {
        Args: {
          p_ip?: string
          p_note?: string
          p_preferred_date?: string
          p_reason: string
          p_token: string
          p_user_agent?: string
        }
        Returns: Json
      }
      ss_request_visit_reschedule: {
        Args: { p_customer_id: string; p_date: string; p_note?: string }
        Returns: Json
      }
      ss_run_invoice_dunning: { Args: never; Returns: Json }
      ss_run_lead_sla: { Args: never; Returns: Json }
      ss_run_task_sla: { Args: never; Returns: Json }
      ss_save_quote_picks: {
        Args: { _selected_ids: string[]; _token: string }
        Returns: undefined
      }
      ss_seed_stage_items: {
        Args: { p_name: string; p_project: string; p_stage: string }
        Returns: undefined
      }
      ss_set_gate_access: {
        Args: {
          _customer_id: string
          _dog_name?: string
          _gate_code?: string
          _location_notes?: string
        }
        Returns: Json
      }
      ss_set_visit_flag: {
        Args: { p_customer_id: string; p_flag: string; p_value: boolean }
        Returns: Json
      }
      ss_settle_check_payment: {
        Args: {
          p_amount?: number
          p_check_id: string
          p_check_number?: string
          p_note?: string
          p_status: string
        }
        Returns: Json
      }
      ss_sign_contract: {
        Args: {
          _signature_data_url: string
          _signer_name: string
          _token: string
          _user_agent?: string
        }
        Returns: Json
      }
      ss_sla_effective_config: {
        Args: { p_customer: string; p_lead: string }
        Returns: Json
      }
      ss_sla_notify: {
        Args: {
          p_channels: Json
          p_key: string
          p_task: string
          p_user: string
          p_vars: Json
        }
        Returns: undefined
      }
      ss_sync_quote_contract: {
        Args: { _quote_id: string }
        Returns: undefined
      }
      ss_task_sla_config: { Args: never; Returns: Json }
      ss_touch_customer_attribution: {
        Args: {
          p_campaign_id: string
          p_email: string
          p_event_type: string
          p_landing_page: string
          p_page_path: string
          p_phone: string
          p_placement: string
        }
        Returns: string
      }
      ss_transfer_stock_to_truck: {
        Args: { p_item_id: string; p_qty: number; p_truck_id: string }
        Returns: Json
      }
      ss_unit_factor: { Args: { p_unit: string }; Returns: number }
      ss_unit_family: { Args: { p_unit: string }; Returns: string }
      ss_update_inspection_status: {
        Args: {
          _clear_eta?: boolean
          _customer_note?: string
          _eta_at?: string
          _eta_window?: string
          _id: string
          _status?: string
        }
        Returns: Json
      }
      ss_validate_lead_code: { Args: { _code: string }; Returns: Json }
      ss_visit_parts: {
        Args: { p_visit_id: string }
        Returns: {
          item_name: string
          qty: number
          unit: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
