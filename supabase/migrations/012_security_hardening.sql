-- Endurecimento de banco — achados de "hardening" da auditoria de segurança
-- (run-1, 06/11/2026). Nenhum item aqui era explorável sozinho; são camadas
-- extras para quando algo mudar (nova RPC, nova tela, novo client).
--
-- 1. Privilégios: anon não precisa de nada nas tabelas (todas as policies
--    exigem auth.uid()). authenticated perde TRUNCATE/REFERENCES/TRIGGER —
--    TRUNCATE ignora RLS e apagaria a tabela inteira se algum caminho futuro
--    (RPC, SQL dinâmico) o expusesse. PostgREST não usa nenhum dos três.
-- 2. handle_new_user (SECURITY DEFINER) com search_path fixo.
-- 3. Trigger de doctors passa a travar também id, user_id e created_at.
-- 4. Limites de tamanho no servidor, iguais aos de src/lib/validation.ts
--    (antes só o client validava; uma chamada direta ao PostgREST pulava).
--    Conferido em produção antes: nenhuma linha existente viola os limites.

-- ─── 1. Privilégios ────────────────────────────────────────────
REVOKE ALL ON TABLE doctors, reports, report_images, audit_log FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE doctors, reports, report_images, audit_log
  FROM authenticated;

-- ─── 2. search_path fixo na função SECURITY DEFINER ────────────
-- O corpo já usa public.doctors qualificado; '' impede que qualquer objeto
-- criado em outro schema do search_path seja resolvido no lugar de um builtin.
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- ─── 3. Identidade da linha de doctors imutável para o client ──
CREATE OR REPLACE FUNCTION protect_doctors_admin_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND (
       NEW.prodoctor_enabled   IS DISTINCT FROM OLD.prodoctor_enabled
    OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    OR NEW.trial_reports_used  IS DISTINCT FROM OLD.trial_reports_used
    OR NEW.id                  IS DISTINCT FROM OLD.id
    OR NEW.user_id             IS DISTINCT FROM OLD.user_id
    OR NEW.created_at          IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'id, user_id, created_at, prodoctor_enabled, subscription_status e trial_reports_used só podem ser alterados pelo servidor'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 4. Limites de tamanho e forma ─────────────────────────────
ALTER TABLE reports
  ADD CONSTRAINT reports_patient_name_len
    CHECK (char_length(patient_name) BETWEEN 1 AND 200),
  ADD CONSTRAINT reports_requesting_doctor_len
    CHECK (requesting_doctor IS NULL OR char_length(requesting_doctor) <= 200),
  ADD CONSTRAINT reports_material_len
    CHECK (char_length(material) <= 200),
  ADD CONSTRAINT reports_method_len
    CHECK (char_length(method) <= 200),
  ADD CONSTRAINT reports_microscopic_description_len
    CHECK (microscopic_description IS NULL OR char_length(microscopic_description) <= 5000),
  ADD CONSTRAINT reports_conclusion_len
    CHECK (conclusion IS NULL OR char_length(conclusion) <= 5000),
  ADD CONSTRAINT reports_bibliographic_reference_len
    CHECK (bibliographic_reference IS NULL OR char_length(bibliographic_reference) <= 5000),
  ADD CONSTRAINT reports_revision_number_positive
    CHECK (revision_number >= 1);

-- CRM vazio é permitido: usuários OAuth nascem sem CRM e completam o perfil
-- depois (app/complete-profile.tsx).
ALTER TABLE doctors
  ADD CONSTRAINT doctors_crm_len
    CHECK (crm = '' OR char_length(crm) BETWEEN 4 AND 20);
