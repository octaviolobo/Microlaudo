// Gerado automaticamente via: npm run db:types
// NÃO editar manualmente — regenerar com: npm run db:types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          rqe: string | null
          signature_url: string | null
          subscription_status: string
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
          rqe?: string | null
          signature_url?: string | null
          subscription_status?: string
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
          rqe?: string | null
          signature_url?: string | null
          subscription_status?: string
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
          created_at: string
          doctor_id: string
          epithelial_cells: string | null
          evaluation_date: string | null
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
          patient_name: string
          pdf_url: string | null
          red_blood_cells: string | null
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
          created_at?: string
          doctor_id: string
          epithelial_cells?: string | null
          evaluation_date?: string | null
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
          patient_name: string
          pdf_url?: string | null
          red_blood_cells?: string | null
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
          created_at?: string
          doctor_id?: string
          epithelial_cells?: string | null
          evaluation_date?: string | null
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
          patient_name?: string
          pdf_url?: string | null
          red_blood_cells?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]),
> = (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never

// Atalhos convenientes
export type DoctorRow = Tables<'doctors'>
export type DoctorInsert = TablesInsert<'doctors'>
export type ReportRow = Tables<'reports'>
export type ReportInsert = TablesInsert<'reports'>
export type ReportUpdate = TablesUpdate<'reports'>
export type ReportImageRow = Tables<'report_images'>
export type AuditLogInsert = TablesInsert<'audit_log'>
