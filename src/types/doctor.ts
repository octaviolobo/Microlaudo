import type { SubscriptionStatus } from './subscription';

export type Doctor = {
  id: string;
  user_id: string;
  full_name: string;
  crm: string;
  rqe?: string;
  signature_url?: string;
  preferred_language: string;
  // Dados da clínica (todos opcionais — ADR-006)
  clinic_name?: string;
  clinic_cnpj?: string;
  clinic_address?: string;
  clinic_phone?: string;
  logo_url?: string;
  // Referência bibliográfica padrão
  default_reference: string;
  // Trial e assinatura
  trial_reports_used: number;
  subscription_status: SubscriptionStatus;
  created_at: string;
  updated_at: string;
};
