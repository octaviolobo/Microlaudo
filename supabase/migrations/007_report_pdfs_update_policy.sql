-- Faltava a policy de UPDATE em report-pdfs: o upload do PDF usa upsert (para
-- permitir regenerar o PDF de um laudo já existente), e isso dispara um UPDATE
-- em storage.objects quando o path já existe — sem essa policy, a regeneração
-- falhava com "new row violates row-level security policy".
CREATE POLICY "Report PDFs: update own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'report-pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'report-pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
