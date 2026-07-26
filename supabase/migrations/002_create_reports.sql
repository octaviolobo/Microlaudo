CREATE TABLE reports (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,

  -- Dados do paciente (Step 1)
  patient_name       TEXT NOT NULL,
  patient_birth_date DATE,
  collection_date    DATE NOT NULL,
  requesting_doctor  TEXT,
  material TEXT NOT NULL DEFAULT 'Secreção vaginal',
  method   TEXT NOT NULL DEFAULT 'Microscopia óptica (a fresco e coloração de Gram)',

  -- Achados microscópicos (Step 3)
  lactobacilli         TEXT CHECK (lactobacilli         IN ('ausente','raros','alguns','numerosos')),
  cocci                TEXT CHECK (cocci                IN ('ausente','raros','alguns','numerosos')),
  coccobacilli_gram_pos TEXT CHECK (coccobacilli_gram_pos IN ('ausente','raros','alguns','numerosos')),
  coccobacilli_gram_neg TEXT CHECK (coccobacilli_gram_neg IN ('ausente','raros','alguns','numerosos')),
  leukocytes           TEXT CHECK (leukocytes           IN ('ausente','raros','alguns','numerosos')),
  red_blood_cells      TEXT CHECK (red_blood_cells      IN ('ausente','raros','alguns','numerosos')),
  epithelial_cells     TEXT CHECK (epithelial_cells     IN ('ausente','raros','alguns','numerosos')),
  fungal_elements      TEXT CHECK (fungal_elements      IN ('ausente','raros','alguns','numerosos')),
  trichomonas          TEXT CHECK (trichomonas          IN ('ausente','raros','alguns','numerosos')),
  clue_cells           TEXT CHECK (clue_cells           IN ('ausente','raros','alguns','numerosos')),
  mucus                TEXT CHECK (mucus                IN ('ausente','raros','alguns','numerosos')),
  microscopic_description TEXT,

  -- Score de Nugent — médico informa os pontos por morfotipo (Step 4)
  -- Lactobacillus: 0-4 (invertido), Gardnerella: 0-4, Mobiluncus: 0-2
  nugent_lactobacillus INTEGER CHECK (nugent_lactobacillus BETWEEN 0 AND 4),
  nugent_gardnerella   INTEGER CHECK (nugent_gardnerella   BETWEEN 0 AND 4),
  nugent_mobiluncus    INTEGER CHECK (nugent_mobiluncus    BETWEEN 0 AND 2),
  nugent_score         INTEGER GENERATED ALWAYS AS (
    COALESCE(nugent_lactobacillus, 0) +
    COALESCE(nugent_gardnerella, 0)   +
    COALESCE(nugent_mobiluncus, 0)
  ) STORED,

  -- Critérios de Amsel (Step 4)
  amsel_homogeneous_discharge BOOLEAN NOT NULL DEFAULT FALSE,
  amsel_whiff_test            BOOLEAN NOT NULL DEFAULT FALSE,
  amsel_clue_cells_20         BOOLEAN NOT NULL DEFAULT FALSE,
  amsel_ph_above_45           BOOLEAN NOT NULL DEFAULT FALSE,
  amsel_ph_value              NUMERIC(3,1),

  -- Conclusão (Step 5)
  conclusion             TEXT,
  bibliographic_reference TEXT,

  -- Metadados
  pdf_url         TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'completed')),
  revision_number INTEGER NOT NULL DEFAULT 1,
  evaluation_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Índices para busca no histórico
CREATE INDEX idx_reports_doctor_id    ON reports (doctor_id);
CREATE INDEX idx_reports_status       ON reports (doctor_id, status);
CREATE INDEX idx_reports_patient_name ON reports (doctor_id, patient_name);
CREATE INDEX idx_reports_created_at   ON reports (doctor_id, created_at DESC);
