-- Flag por médico para a integração ProDoctor (autofill de paciente).
--
-- A Edge Function `prodoctor-patients` usa uma credencial GLOBAL
-- (PRODOCTOR_API_KEY/PASSWORD) apontando para o consultório de uma clínica
-- específica. Sem este flag, qualquer médico cadastrado no app veria os
-- pacientes dessa clínica no autocomplete — vazamento de dado de saúde de
-- terceiros. Default `false`: só é habilitado manualmente (SQL editor /
-- service_role) para a conta do médico dono da credencial.
ALTER TABLE doctors
  ADD COLUMN prodoctor_enabled BOOLEAN NOT NULL DEFAULT false;

-- A policy "Doctors: own row only" (migration 005) é FOR ALL, ou seja, o
-- próprio médico pode dar UPDATE/INSERT na própria linha. Sem esta trava,
-- bastaria um `update({ prodoctor_enabled: true })` do client para burlar o
-- flag. Requisições vindas do app rodam como `authenticated`/`anon`
-- (PostgREST faz SET ROLE); service_role, postgres e funções SECURITY
-- DEFINER (ex.: handle_new_user) continuam livres para alterar.
CREATE OR REPLACE FUNCTION protect_doctors_prodoctor_enabled()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' AND NEW.prodoctor_enabled THEN
      RAISE EXCEPTION 'prodoctor_enabled só pode ser alterado por um administrador'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.prodoctor_enabled IS DISTINCT FROM OLD.prodoctor_enabled THEN
      RAISE EXCEPTION 'prodoctor_enabled só pode ser alterado por um administrador'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER doctors_protect_prodoctor_enabled
  BEFORE INSERT OR UPDATE ON doctors
  FOR EACH ROW EXECUTE PROCEDURE protect_doctors_prodoctor_enabled();
