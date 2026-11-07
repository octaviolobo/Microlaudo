-- Tipos de laudo (Sprint USG-Web — ver docs/spec-usg-transvaginal.md).
--
-- Até aqui `reports` só modelava microscopia vaginal (colunas tipadas para
-- achados, Nugent e Amsel). Em vez de adicionar dezenas de colunas por tipo
-- novo, cada laudo passa a ter:
--   - report_type: qual laudo é. Default 'microscopia', então todas as linhas
--     existentes continuam válidas sem backfill.
--   - content: campos específicos do tipo (JSONB). Microscopia continua usando
--     as colunas tipadas e deixa content NULL.
-- Dados do paciente (nome, nascimento, CPF, cartão SUS), status, revisão,
-- conclusão e PDF continuam em colunas comuns, servindo para qualquer tipo.
-- RLS (migration 005) é por doctor_id e já cobre as colunas novas.

ALTER TABLE reports
  ADD COLUMN report_type TEXT NOT NULL DEFAULT 'microscopia'
    CHECK (report_type IN ('microscopia', 'usg_transvaginal')),
  ADD COLUMN content JSONB
    -- Sempre um objeto, e com teto de tamanho: o client valida o formato
    -- (src/lib/usgContent.ts), o banco só impede lixo grande ou de outro tipo.
    CHECK (content IS NULL OR (jsonb_typeof(content) = 'object' AND pg_column_size(content) <= 65536)),
  -- CPF e cartão SUS são opcionais e guardados só com dígitos. O dígito
  -- verificador é validado no client (src/lib/validation.ts).
  ADD COLUMN patient_cpf TEXT
    CHECK (patient_cpf IS NULL OR patient_cpf ~ '^[0-9]{11}$'),
  ADD COLUMN patient_sus_card TEXT
    CHECK (patient_sus_card IS NULL OR patient_sus_card ~ '^[0-9]{15}$');

-- Microscopia nunca tem content. USG sempre tem.
ALTER TABLE reports
  ADD CONSTRAINT reports_content_matches_type CHECK (
    (report_type = 'microscopia' AND content IS NULL)
    OR (report_type <> 'microscopia' AND content IS NOT NULL)
  );

-- O tipo é definido na criação e não muda depois: trocar o tipo de um laudo
-- finalizado deixaria o PDF e as revisões inconsistentes.
CREATE OR REPLACE FUNCTION protect_reports_report_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.report_type IS DISTINCT FROM OLD.report_type THEN
    RAISE EXCEPTION 'report_type não pode ser alterado depois da criação do laudo'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER reports_protect_report_type
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE PROCEDURE protect_reports_report_type();

-- Histórico filtra/mostra por tipo.
CREATE INDEX idx_reports_type ON reports (doctor_id, report_type);
