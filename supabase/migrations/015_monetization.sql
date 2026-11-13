-- Monetização — base independente de gateway (sessão "pagamento", 12/11/2026).
--
-- Regras de negócio (docs/arquitetura.md §8):
--   - Teste grátis: 1 laudo finalizado no total, por conta.
--   - Assinatura (mensal R$49 / anual R$399): laudos ilimitados.
--   - O paywall trava só FINALIZAR (o PDF só é gerado de laudo finalizado).
--     Rascunho, histórico e PDFs antigos continuam livres.
--   - Re-finalizar um laudo já finalizado (RF21, edição) não gasta teste. Sem
--     assinatura, só vale se o paciente for o mesmo da primeira finalização —
--     senão o laudo grátis viraria um laudo infinito, trocando o paciente.
--
-- A verificação é no banco (trigger em `reports`), não no client: um
-- `update({ status: 'completed' })` direto no PostgREST passa pelo mesmo
-- trigger. Erro do paywall: SQLSTATE PT402 → PostgREST responde HTTP 402.
--
-- 1. `subscriptions`: uma linha por médico, escrita só pelo servidor (webhook
--    do gateway, ou SQL para cortesias). Campo `provider` já prevê as lojas
--    (RevenueCat) para quando o app nativo for publicado.
-- 2. `doctors.subscription_status` sai: o status passa a vir de
--    `subscriptions`. `trial_reports_used` fica (contador do teste).
-- 3. `reports.first_finalized_at` / `finalized_identity`: marcam a primeira
--    finalização e o paciente dela. Só o servidor escreve.
-- 4. Trigger `reports_enforce_entitlement` + RPC `get_billing_status()`.

-- ─── 0. Schema privado (não exposto pelo PostgREST) ────────────
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- Fonte única do limite do teste no servidor. O client lê pelo
-- get_billing_status(); src/constants/plans.ts só tem o fallback de UI.
CREATE OR REPLACE FUNCTION private.trial_report_limit()
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$ SELECT 1 $$;

-- ─── 1. subscriptions ──────────────────────────────────────────
CREATE TABLE subscriptions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL UNIQUE REFERENCES doctors(id) ON DELETE CASCADE,

  -- 'manual' = cortesia/ajuste feito à mão pelo administrador.
  provider TEXT NOT NULL CHECK (provider IN ('asaas', 'apple', 'google', 'manual')),
  provider_customer_id     TEXT,
  provider_subscription_id TEXT,

  plan   TEXT NOT NULL CHECK (plan IN ('monthly', 'annual')),
  -- pending:  checkout criado, primeiro pagamento ainda não confirmado
  -- active:   pago e renovando
  -- past_due: renovação falhou; acesso mantido até current_period_end
  -- canceled: não renova; acesso mantido até current_period_end
  -- expired:  sem acesso
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'past_due', 'canceled', 'expired')),
  current_period_end TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Só cortesia pode ser sem prazo; assinatura paga com acesso sempre tem fim.
  CONSTRAINT subscriptions_period_end_required CHECK (
    current_period_end IS NOT NULL
    OR provider = 'manual'
    OR status IN ('pending', 'expired')
  ),
  CONSTRAINT subscriptions_provider_ref_unique UNIQUE (provider, provider_subscription_id)
);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;

-- O médico só lê a própria. Sem policy de escrita: INSERT/UPDATE/DELETE só
-- com service_role (webhook) ou postgres (SQL editor).
CREATE POLICY "Subscriptions: read own row"
  ON subscriptions FOR SELECT
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

REVOKE ALL ON TABLE subscriptions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE subscriptions FROM authenticated;

-- Assinatura dá acesso agora? Usada pelo trigger e pelo RPC.
CREATE OR REPLACE FUNCTION private.has_active_subscription(p_doctor_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.doctor_id = p_doctor_id
      AND s.status IN ('active', 'past_due', 'canceled')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  )
$$;

-- ─── 2. doctors: sai subscription_status ───────────────────────
-- Recria a trava das colunas administrativas (migration 012) sem a coluna.
CREATE OR REPLACE FUNCTION protect_doctors_admin_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND (
       NEW.prodoctor_enabled  IS DISTINCT FROM OLD.prodoctor_enabled
    OR NEW.trial_reports_used IS DISTINCT FROM OLD.trial_reports_used
    OR NEW.id                 IS DISTINCT FROM OLD.id
    OR NEW.user_id            IS DISTINCT FROM OLD.user_id
    OR NEW.created_at         IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'id, user_id, created_at, prodoctor_enabled e trial_reports_used só podem ser alterados pelo servidor'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

ALTER TABLE doctors DROP COLUMN subscription_status;

-- ─── 3. reports: marca da primeira finalização ─────────────────
ALTER TABLE reports
  ADD COLUMN first_finalized_at TIMESTAMPTZ,
  ADD COLUMN finalized_identity TEXT;

-- Identidade do paciente para a regra da re-finalização sem assinatura.
CREATE OR REPLACE FUNCTION private.report_patient_identity(r public.reports)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT md5(
    lower(btrim(r.patient_name)) || '|' ||
    coalesce(r.patient_birth_date::text, '') || '|' ||
    r.collection_date::text || '|' ||
    coalesce(r.patient_cpf, '')
  )
$$;

-- Backfill: laudos já finalizados antes desta migration contam como
-- finalizados (e gastam o teste do médico, como gastariam com a regra nova).
UPDATE reports
SET first_finalized_at = updated_at,
    finalized_identity = private.report_patient_identity(reports)
WHERE status = 'completed' OR pdf_url IS NOT NULL;

UPDATE doctors d
SET trial_reports_used = sub.n
FROM (
  SELECT doctor_id, count(*)::int AS n
  FROM reports WHERE first_finalized_at IS NOT NULL
  GROUP BY doctor_id
) sub
WHERE sub.doctor_id = d.id;

-- ─── 4. Trigger do paywall ─────────────────────────────────────
-- SECURITY DEFINER: precisa incrementar doctors.trial_reports_used, que o
-- médico não pode alterar (trigger acima). Por isso a decisão de "quem é o
-- chamador" usa o papel do JWT (auth.role()), não current_user — dentro da
-- função current_user é o dono. service_role (webhook/Edge Function) e o SQL
-- editor (sem JWT) passam direto.
CREATE OR REPLACE FUNCTION private.enforce_report_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_identity text;
BEGIN
  IF coalesce(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'completed' OR NEW.first_finalized_at IS NOT NULL OR NEW.finalized_identity IS NOT NULL THEN
      RAISE EXCEPTION 'laudo novo nasce como rascunho' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.first_finalized_at IS DISTINCT FROM OLD.first_finalized_at
     OR NEW.finalized_identity IS DISTINCT FROM OLD.finalized_identity THEN
    RAISE EXCEPTION 'first_finalized_at e finalized_identity só podem ser alterados pelo servidor'
      USING ERRCODE = '42501';
  END IF;

  -- Só interessa a transição para finalizado.
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_identity := private.report_patient_identity(NEW);

  IF private.has_active_subscription(NEW.doctor_id) THEN
    NULL; -- assinante: ilimitado
  ELSIF OLD.first_finalized_at IS NOT NULL THEN
    -- Re-finalização (edição) sem assinatura: só do mesmo paciente.
    IF OLD.finalized_identity IS DISTINCT FROM v_identity THEN
      RAISE EXCEPTION 'PAYWALL_REQUIRED' USING ERRCODE = 'PT402',
        DETAIL = 'Sem assinatura, um laudo já finalizado só pode ser re-finalizado com o mesmo paciente.';
    END IF;
  ELSE
    -- Primeira finalização sem assinatura: gasta o teste, de forma atômica
    -- (o UPDATE condicional trava a linha; duas abas não gastam 2x).
    UPDATE public.doctors
    SET trial_reports_used = trial_reports_used + 1
    WHERE id = NEW.doctor_id
      AND trial_reports_used < private.trial_report_limit();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PAYWALL_REQUIRED' USING ERRCODE = 'PT402',
        DETAIL = 'Teste grátis já usado.';
    END IF;
  END IF;

  IF OLD.first_finalized_at IS NULL THEN
    NEW.first_finalized_at := now();
    NEW.finalized_identity := v_identity;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_report_entitlement() FROM PUBLIC;

CREATE TRIGGER reports_enforce_entitlement
  BEFORE INSERT OR UPDATE ON reports
  FOR EACH ROW EXECUTE PROCEDURE private.enforce_report_entitlement();

-- ─── 5. RPC para o app ─────────────────────────────────────────
-- Tudo que a UI precisa para paywall/planos numa chamada. SECURITY DEFINER
-- para ler funções do schema private, mas sempre filtrado por auth.uid().
CREATE OR REPLACE FUNCTION public.get_billing_status()
RETURNS TABLE (
  has_active_subscription boolean,
  plan text,
  status text,
  provider text,
  current_period_end timestamptz,
  trial_reports_used integer,
  trial_report_limit integer
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    private.has_active_subscription(d.id),
    s.plan,
    s.status,
    s.provider,
    s.current_period_end,
    d.trial_reports_used,
    private.trial_report_limit()
  FROM public.doctors d
  LEFT JOIN public.subscriptions s ON s.doctor_id = d.id
  WHERE d.user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_billing_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_billing_status() TO authenticated;
