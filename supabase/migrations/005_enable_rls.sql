-- Row Level Security — isolamento total entre médicos (RNF LGPD)
ALTER TABLE doctors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log    ENABLE ROW LEVEL SECURITY;

-- FORCE garante que nem o service_role bypassa sem intenção
ALTER TABLE doctors      FORCE ROW LEVEL SECURITY;
ALTER TABLE reports      FORCE ROW LEVEL SECURITY;
ALTER TABLE report_images FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log    FORCE ROW LEVEL SECURITY;

-- ─── doctors ───────────────────────────────────────────────────
CREATE POLICY "Doctors: own row only"
  ON doctors FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── reports ───────────────────────────────────────────────────
CREATE POLICY "Reports: own doctor only"
  ON reports FOR ALL
  USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  )
  WITH CHECK (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  );

-- ─── report_images ─────────────────────────────────────────────
CREATE POLICY "Report images: own doctor only"
  ON report_images FOR ALL
  USING (
    report_id IN (
      SELECT r.id FROM reports r
      JOIN   doctors d ON r.doctor_id = d.id
      WHERE  d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    report_id IN (
      SELECT r.id FROM reports r
      JOIN   doctors d ON r.doctor_id = d.id
      WHERE  d.user_id = auth.uid()
    )
  );

-- ─── audit_log ─────────────────────────────────────────────────
-- INSERT permitido (o médico loga os próprios eventos)
-- SELECT/UPDATE/DELETE bloqueados — append-only
CREATE POLICY "Audit log: insert own events only"
  ON audit_log FOR INSERT
  WITH CHECK (actor_id = auth.uid());

CREATE POLICY "Audit log: read own events only"
  ON audit_log FOR SELECT
  USING (actor_id = auth.uid());
