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
      audit_log: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
        }
        Relationships: []
      }
      doctors: {
        Row: {
          clinic_address: string | null
          clinic_cnpj: string | null
          clinic_name: string | null
          clinic_phone: string | null
          created_at: string
          crm: string
          default_reference: string | null
          full_name: string
          id: string
          logo_url: string | null
          preferred_language: string | null
          prodoctor_enabled: boolean
          rqe: string | null
          signature_url: string | null
          trial_reports_used: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          clinic_address?: string | null
          clinic_cnpj?: string | null
          clinic_name?: string | null
          clinic_phone?: string | null
          created_at?: string
          crm: string
          default_reference?: string | null
          full_name: string
          id?: string
          logo_url?: string | null
          preferred_language?: string | null
          prodoctor_enabled?: boolean
          rqe?: string | null
          signature_url?: string | null
          trial_reports_used?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          clinic_address?: string | null
          clinic_cnpj?: string | null
          clinic_name?: string | null
          clinic_phone?: string | null
          created_at?: string
          crm?: string
          default_reference?: string | null
          full_name?: string
          id?: string
          logo_url?: string | null
          preferred_language?: string | null
          prodoctor_enabled?: boolean
          rqe?: string | null
          signature_url?: string | null
          trial_reports_used?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      report_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          report_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          report_id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          report_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_images_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          amsel_clue_cells_20: boolean
          amsel_homogeneous_discharge: boolean
          amsel_ph_above_45: boolean
          amsel_ph_value: number | null
          amsel_whiff_test: boolean
          bibliographic_reference: string | null
          clue_cells: string | null
          cocci: string | null
          coccobacilli_gram_neg: string | null
          coccobacilli_gram_pos: string | null
          collection_date: string
          conclusion: string | null
          content: Json | null
          created_at: string
          doctor_id: string
          epithelial_cells: string | null
          evaluation_date: string | null
          finalized_identity: string | null
          first_finalized_at: string | null
          fungal_elements: string | null
          id: string
          lactobacilli: string | null
          leukocytes: string | null
          material: string
          method: string
          microscopic_description: string | null
          mucus: string | null
          nugent_gardnerella: number | null
          nugent_lactobacillus: number | null
          nugent_mobiluncus: number | null
          nugent_score: number | null
          patient_birth_date: string | null
          patient_cpf: string | null
          patient_name: string
          patient_sus_card: string | null
          pdf_url: string | null
          red_blood_cells: string | null
          report_type: string
          requesting_doctor: string | null
          revision_number: number
          status: string
          trichomonas: string | null
          updated_at: string
        }
        Insert: {
          amsel_clue_cells_20?: boolean
          amsel_homogeneous_discharge?: boolean
          amsel_ph_above_45?: boolean
          amsel_ph_value?: number | null
          amsel_whiff_test?: boolean
          bibliographic_reference?: string | null
          clue_cells?: string | null
          cocci?: string | null
          coccobacilli_gram_neg?: string | null
          coccobacilli_gram_pos?: string | null
          collection_date: string
          conclusion?: string | null
          content?: Json | null
          created_at?: string
          doctor_id: string
          epithelial_cells?: string | null
          evaluation_date?: string | null
          finalized_identity?: string | null
          first_finalized_at?: string | null
          fungal_elements?: string | null
          id?: string
          lactobacilli?: string | null
          leukocytes?: string | null
          material?: string
          method?: string
          microscopic_description?: string | null
          mucus?: string | null
          nugent_gardnerella?: number | null
          nugent_lactobacillus?: number | null
          nugent_mobiluncus?: number | null
          nugent_score?: number | null
          patient_birth_date?: string | null
          patient_cpf?: string | null
          patient_name: string
          patient_sus_card?: string | null
          pdf_url?: string | null
          red_blood_cells?: string | null
          report_type?: string
          requesting_doctor?: string | null
          revision_number?: number
          status?: string
          trichomonas?: string | null
          updated_at?: string
        }
        Update: {
          amsel_clue_cells_20?: boolean
          amsel_homogeneous_discharge?: boolean
          amsel_ph_above_45?: boolean
          amsel_ph_value?: number | null
          amsel_whiff_test?: boolean
          bibliographic_reference?: string | null
          clue_cells?: string | null
          cocci?: string | null
          coccobacilli_gram_neg?: string | null
          coccobacilli_gram_pos?: string | null
          collection_date?: string
          conclusion?: string | null
          content?: Json | null
          created_at?: string
          doctor_id?: string
          epithelial_cells?: string | null
          evaluation_date?: string | null
          finalized_identity?: string | null
          first_finalized_at?: string | null
          fungal_elements?: string | null
          id?: string
          lactobacilli?: string | null
          leukocytes?: string | null
          material?: string
          method?: string
          microscopic_description?: string | null
          mucus?: string | null
          nugent_gardnerella?: number | null
          nugent_lactobacillus?: number | null
          nugent_mobiluncus?: number | null
          nugent_score?: number | null
          patient_birth_date?: string | null
          patient_cpf?: string | null
          patient_name?: string
          patient_sus_card?: string | null
          pdf_url?: string | null
          red_blood_cells?: string | null
          report_type?: string
          requesting_doctor?: string | null
          revision_number?: number
          status?: string
          trichomonas?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          doctor_id: string
          id: string
          plan: string
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          doctor_id: string
          id?: string
          plan: string
          provider: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          doctor_id?: string
          id?: string
          plan?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_billing_status: {
        Args: never
        Returns: {
          current_period_end: string
          has_active_subscription: boolean
          plan: string
          provider: string
          status: string
          trial_report_limit: number
          trial_reports_used: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
