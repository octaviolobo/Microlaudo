-- Trava de checkout por médico (billing-checkout).
--
-- Dois cliques em "Assinar" (ou duas abas) chegavam juntos na Edge Function:
-- os dois liam "sem assinatura", os dois criavam uma assinatura no Asaas e só
-- uma ficava gravada em `subscriptions`. A outra virava cobrança órfã: se o
-- médico pagasse justo ela, o webhook não achava a assinatura e o acesso não
-- era liberado.
--
-- Agora a função pega uma trava antes de falar com o Asaas. A trava é um prazo
-- (checkout_lock_until): se a função cair no meio, ela expira sozinha.

ALTER TABLE subscriptions ADD COLUMN checkout_lock_until TIMESTAMPTZ;

-- Pega a trava numa única instrução (atômica). Devolve true se conseguiu.
--   - Sem linha ainda: cria uma linha `pending` (sem assinatura no Asaas) já travada.
--   - Com linha: trava só se não houver trava válida. Não mexe no status.
-- Só o service_role (Edge Function) executa.
CREATE OR REPLACE FUNCTION public.claim_checkout_lock(p_doctor_id uuid, p_plan text, p_seconds integer DEFAULT 120)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH claimed AS (
    INSERT INTO public.subscriptions (doctor_id, provider, plan, status, checkout_lock_until)
    VALUES (p_doctor_id, 'asaas', p_plan, 'pending', now() + make_interval(secs => p_seconds))
    ON CONFLICT (doctor_id) DO UPDATE
      SET checkout_lock_until = now() + make_interval(secs => p_seconds)
      WHERE public.subscriptions.checkout_lock_until IS NULL
         OR public.subscriptions.checkout_lock_until < now()
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM claimed)
$$;

REVOKE ALL ON FUNCTION public.claim_checkout_lock(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_checkout_lock(uuid, text, integer) TO service_role;
