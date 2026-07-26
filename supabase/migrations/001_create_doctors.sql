-- Função reutilizável para auto-atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Perfil do médico
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Dados obrigatórios
  full_name TEXT NOT NULL,
  crm       TEXT NOT NULL,
  rqe       TEXT,
  signature_url      TEXT,
  preferred_language TEXT DEFAULT 'pt-BR',

  -- Clínica (todos opcionais — ADR-006)
  clinic_name    TEXT,
  clinic_cnpj    TEXT,
  clinic_address TEXT,
  clinic_phone   TEXT,
  logo_url       TEXT,

  -- Referência bibliográfica padrão
  default_reference TEXT DEFAULT 'Nugent, R. P., Krohn, M. A., & Hillier, S. L. (1991). Reliability of diagnosing bacterial vaginosis is improved by a standardized method of Gram stain interpretation. Journal of Clinical Microbiology, 29(2), 297-301.',

  -- Trial e assinatura
  trial_reports_used  INTEGER NOT NULL DEFAULT 0,
  subscription_status TEXT    NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'expired')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Trigger: cria perfil automaticamente ao criar usuário no Supabase Auth.
-- Evita problema de race condition com confirmação de e-mail (ADR-008).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.doctors (user_id, full_name, crm, rqe)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'crm', ''),
    NEW.raw_user_meta_data->>'rqe'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
