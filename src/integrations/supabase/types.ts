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
      inspection_requests: {
        Row: {
          address: string
          campaign_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          landing_page: string | null
          notes: string | null
          page_path: string | null
          phone: string
          pool_details: string | null
          postal_code: string
          preferred_contact_time: string | null
          preferred_date: string | null
          reference_number: string
          referrer: string | null
          session_id: string | null
          sms_opt_in: boolean
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
          created_at?: string
          email: string
          full_name: string
          id?: string
          landing_page?: string | null
          notes?: string | null
          page_path?: string | null
          phone: string
          pool_details?: string | null
          postal_code: string
          preferred_contact_time?: string | null
          preferred_date?: string | null
          reference_number?: string
          referrer?: string | null
          session_id?: string | null
          sms_opt_in?: boolean
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
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          landing_page?: string | null
          notes?: string | null
          page_path?: string | null
          phone?: string
          pool_details?: string | null
          postal_code?: string
          preferred_contact_time?: string | null
          preferred_date?: string | null
          reference_number?: string
          referrer?: string | null
          session_id?: string | null
          sms_opt_in?: boolean
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
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
      ss_damage_reports: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          kind: string
          notes: string
          occurred_on: string | null
          office_notes: string | null
          photos: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          kind?: string
          notes?: string
          occurred_on?: string | null
          office_notes?: string | null
          photos?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          kind?: string
          notes?: string
          occurred_on?: string | null
          office_notes?: string | null
          photos?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_damage_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ss_customers"
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
      ss_quotes: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
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
      ss_default_upsell_pct: { Args: never; Returns: number }
      ss_generate_route_visits: {
        Args: { p_customer_id: string; p_through: string }
        Returns: number
      }
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
      ss_log_inventory_usage: {
        Args: {
          p_items: Json
          p_job_id?: string
          p_note?: string
          p_visit_id?: string
        }
        Returns: Json
      }
      ss_mark_contract_progress: {
        Args: { _token: string }
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
      ss_my_invoice_lines: {
        Args: { _invoice_id: string }
        Returns: {
          description: string
          line_total: number
          quantity: number
          unit_price: number
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
      ss_portal_pay_invoice: {
        Args: { p_invoice_id: string; p_method: string; p_reference?: string }
        Returns: Json
      }
      ss_portal_update_profile: { Args: { p_patch: Json }; Returns: Json }
      ss_recalc_visit_upsell: {
        Args: { _visit_id: string }
        Returns: undefined
      }
      ss_request_visit_reschedule: {
        Args: { p_customer_id: string; p_date: string; p_note?: string }
        Returns: Json
      }
      ss_seed_stage_items: {
        Args: { p_name: string; p_project: string; p_stage: string }
        Returns: undefined
      }
      ss_set_visit_flag: {
        Args: { p_customer_id: string; p_flag: string; p_value: boolean }
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
      ss_unit_factor: { Args: { p_unit: string }; Returns: number }
      ss_unit_family: { Args: { p_unit: string }; Returns: string }
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
