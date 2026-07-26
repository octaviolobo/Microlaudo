-- audit_log tem FORCE ROW LEVEL SECURITY (migration 005), o que impede até
-- mesmo o service_role de inserir sem passar por uma policy. A Edge Function
-- `delete-account` precisa registrar 'account.deleted' após validar o JWT do
-- usuário (o actor_id vem do JWT verificado, não do corpo da requisição).
--
-- Esta policy permite exclusivamente a role service_role inserir. Chamadas
-- vindas do app (role authenticated) continuam restritas por
-- "Audit log: insert own events only" (actor_id = auth.uid()).
CREATE POLICY "Audit log: service role can insert"
  ON audit_log FOR INSERT
  TO service_role
  WITH CHECK (true);
