-- Colunas administrativas de `doctors` não podem ser alteradas pelo próprio
-- médico.
--
-- A policy "Doctors: own row only" (migration 005) era FOR ALL: o médico
-- podia dar UPDATE/INSERT/DELETE na própria linha. A migration 010 travou só
-- `prodoctor_enabled`; `subscription_status` e `trial_reports_used` seguiam
-- abertos — bastava um `update({ subscription_status: 'active' })` do client
-- para virar assinante, ou DELETE + INSERT da própria linha para zerar o
-- contador do trial.
--
-- 1. Policies: o médico só lê e atualiza a própria linha. Sem policy de
--    INSERT/DELETE para `authenticated`. Não quebra nada:
--    - a linha é criada por handle_new_user() (SECURITY DEFINER, owner
--      postgres, que tem BYPASSRLS);
--    - a exclusão de conta (Edge Function delete-account) apaga auth.users e a
--      linha sai pelo ON DELETE CASCADE, que não passa por RLS.
-- 2. Trigger: no UPDATE, o médico não pode mudar as colunas administrativas.
--    service_role, postgres e funções SECURITY DEFINER continuam podendo.
--    Quando a monetização existir, o incremento de `trial_reports_used` e a
--    mudança de `subscription_status` precisam vir do servidor (Edge
--    Function com service_role, webhook de pagamento ou RPC SECURITY
--    DEFINER), nunca do client.

-- ─── 1. Policies ───────────────────────────────────────────────
DROP POLICY "Doctors: own row only" ON doctors;

CREATE POLICY "Doctors: read own row"
  ON doctors FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Doctors: update own row"
  ON doctors FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── 2. Trigger (substitui o da migration 010) ─────────────────
DROP TRIGGER doctors_protect_prodoctor_enabled ON doctors;
DROP FUNCTION protect_doctors_prodoctor_enabled();

CREATE OR REPLACE FUNCTION protect_doctors_admin_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND (
       NEW.prodoctor_enabled   IS DISTINCT FROM OLD.prodoctor_enabled
    OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    OR NEW.trial_reports_used  IS DISTINCT FROM OLD.trial_reports_used
  ) THEN
    RAISE EXCEPTION 'prodoctor_enabled, subscription_status e trial_reports_used só podem ser alterados pelo servidor'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER doctors_protect_admin_columns
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE PROCEDURE protect_doctors_admin_columns();
