-- Cobrança via Asaas (Edge Functions billing-checkout / billing-webhook /
-- billing-cancel e delete-account).
--
-- 1. Policies de service_role em `subscriptions`. A tabela tem FORCE ROW LEVEL
--    SECURITY (migration 015) e, como já visto no audit_log (migration 008),
--    sem policy nem o service_role das Edge Functions lê ou escreve.
-- 2. `billing_events`: todo evento recebido do gateway. O id do evento é a
--    chave (o Asaas entrega "pelo menos uma vez"), e a tabela é a trilha para
--    "paguei e o app não liberou". Só o service_role acessa; o payload tem
--    dados de cobrança (nome, valor), não dados clínicos.

-- ─── 1. subscriptions: service_role ────────────────────────────
CREATE POLICY "Subscriptions: service role full access"
  ON subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 2. billing_events ─────────────────────────────────────────
CREATE TABLE billing_events (
  id           TEXT PRIMARY KEY,           -- id do evento no gateway
  provider     TEXT NOT NULL CHECK (provider IN ('asaas', 'apple', 'google')),
  event_type   TEXT NOT NULL,
  payload      JSONB NOT NULL CHECK (pg_column_size(payload) <= 65536),
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  result       TEXT                         -- ex.: 'activate:active', 'unknown_subscription'
);

CREATE INDEX idx_billing_events_received ON billing_events (received_at DESC);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events FORCE ROW LEVEL SECURITY;

CREATE POLICY "Billing events: service role full access"
  ON billing_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE billing_events FROM anon, authenticated;
