-- Log append-only: registra eventos sem guardar conteúdo clínico.
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,   -- 'report.finalized', 'report.edited', 'account.deleted'
  actor_id    UUID NOT NULL,   -- doctor.user_id
  resource_id UUID,            -- report_id quando aplicável
  metadata    JSONB,           -- { revision: 2 } — nunca conteúdo clínico
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sem UPDATE/DELETE — append-only por design
CREATE INDEX idx_audit_log_actor_id ON audit_log (actor_id, created_at DESC);
