-- Buckets privados — nenhum acesso público (RNF segurança)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('report-images', 'report-images', false, 10485760,  ARRAY['image/jpeg','image/png','image/webp']),
  ('report-pdfs',   'report-pdfs',   false, 20971520,  ARRAY['application/pdf']),
  ('doctor-assets', 'doctor-assets', false, 5242880,   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Convenção de paths:
--   report-images/{user_id}/{report_id}/{filename}
--   report-pdfs/{user_id}/{report_id}/{filename}
--   doctor-assets/{user_id}/{filename}   (logo, assinatura)

-- ─── report-images ─────────────────────────────────────────────
CREATE POLICY "Report images: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'report-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Report images: read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'report-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Report images: delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'report-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── report-pdfs ───────────────────────────────────────────────
CREATE POLICY "Report PDFs: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'report-pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Report PDFs: read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'report-pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Report PDFs: delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'report-pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── doctor-assets ─────────────────────────────────────────────
CREATE POLICY "Doctor assets: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'doctor-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Doctor assets: read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'doctor-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Doctor assets: delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'doctor-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
