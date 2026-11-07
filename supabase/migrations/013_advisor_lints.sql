-- Zera os avisos do Security Advisor do Supabase que restaram após a 012.
--
-- 1. Funções de trigger SECURITY DEFINER expostas em /rest/v1/rpc. A chamada
--    direta já falha (funções de trigger só rodam como trigger), mas não há
--    motivo para anon/authenticated terem EXECUTE. O Postgres só checa EXECUTE
--    na criação do trigger, não no disparo, então os triggers continuam
--    funcionando.
--    rls_auto_enable é o event trigger criado pelo Supabase que liga RLS em
--    tabelas novas do schema public.
-- 2. search_path fixo nas funções de trigger restantes (só usam now(),
--    current_user e NEW/OLD — tudo resolvido via pg_catalog).

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.protect_doctors_admin_columns() SET search_path = '';
