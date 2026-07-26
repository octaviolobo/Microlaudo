export type FindingLevel = 'ausente' | 'raros' | 'alguns' | 'numerosos';

export type ReportStatus = 'draft' | 'completed';

export type MorphotypeLevel = '0' | '1+' | '2+' | '3+' | '4+';

export type NugentClassification = 'normal' | 'intermediate' | 'bacterial_vaginosis';

export type Morphotypes = {
  lactobacillus: MorphotypeLevel;
  gardnerella: MorphotypeLevel;
  mobiluncus: MorphotypeLevel;
};

export type NugentResult = {
  score: number;
  classification: NugentClassification;
  breakdown: {
    lactobacillusPoints: number;
    gardnerellaPoints: number;
    mobiluncusPoints: number;
  };
};

export type Findings = {
  lactobacilli: FindingLevel;
  cocci: FindingLevel;
  coccobacilli_gram_pos: FindingLevel;
  coccobacilli_gram_neg: FindingLevel;
  leukocytes: FindingLevel;
  red_blood_cells: FindingLevel;
  epithelial_cells: FindingLevel;
  fungal_elements: FindingLevel;
  trichomonas: FindingLevel;
  clue_cells: FindingLevel;
  mucus: FindingLevel;
  description?: string;
};

export type AmselCriteria = {
  homogeneous_discharge: boolean;
  whiff_test: boolean;
  clue_cells_20: boolean;
  ph_above_45: boolean;
  ph_value?: number;
};

export type PatientData = {
  patient_name: string;
  patient_birth_date?: string;
  collection_date: string;
  requesting_doctor?: string;
};

export type Report = {
  id: string;
  doctor_id: string;
  status: ReportStatus;
  revision_number: number;
  // Dados do paciente (Step 1)
  patient_name: string;
  patient_birth_date?: string;
  collection_date: string;
  requesting_doctor?: string;
  material: string;
  method: string;
  // Achados (Step 3)
  lactobacilli?: FindingLevel;
  cocci?: FindingLevel;
  coccobacilli_gram_pos?: FindingLevel;
  coccobacilli_gram_neg?: FindingLevel;
  leukocytes?: FindingLevel;
  red_blood_cells?: FindingLevel;
  epithelial_cells?: FindingLevel;
  fungal_elements?: FindingLevel;
  trichomonas?: FindingLevel;
  clue_cells?: FindingLevel;
  mucus?: FindingLevel;
  microscopic_description?: string;
  // Nugent (Step 4)
  nugent_lactobacillus?: number;
  nugent_gardnerella?: number;
  nugent_mobiluncus?: number;
  nugent_score?: number;
  // Amsel (Step 4)
  amsel_homogeneous_discharge?: boolean;
  amsel_whiff_test?: boolean;
  amsel_clue_cells_20?: boolean;
  amsel_ph_above_45?: boolean;
  amsel_ph_value?: number;
  // Conclusão (Step 5)
  conclusion?: string;
  bibliographic_reference?: string;
  // PDF (Step 6)
  pdf_url?: string;
  evaluation_date?: string;
  // Meta
  created_at: string;
  updated_at: string;
};
