import { create } from 'zustand';

import { pointsToMorphotypes } from '@/lib/nugent';
import { FINDING_LEVELS } from '@/constants/findings-options';

import type { ReportRow } from '@/types/database';
import type {
  Report,
  PatientData,
  Findings,
  AmselCriteria,
  Morphotypes,
  FindingLevel,
} from '@/types/report';

function toFindingLevel(value: string | null): FindingLevel | undefined {
  if (!value) return undefined;
  return (FINDING_LEVELS as string[]).includes(value) ? (value as FindingLevel) : undefined;
}

type FindingsPatch = Partial<Omit<Findings, 'description'>> & { microscopic_description?: string };

type ReportState = {
  reportId: string | null;
  currentReport: Partial<Report> | null;
  // Morphotypes ficam separados do Report: são os níveis qualitativos que o médico informa.
  // A conversão MorphotypeLevel → pontos ocorre em src/lib/nugent.ts ao finalizar.
  morphotypes: Partial<Morphotypes> | null;
  isDirty: boolean;
  currentStep: number;
  setReportId: (id: string) => void;
  setPatientData: (data: PatientData) => void;
  setFindings: (findings: FindingsPatch) => void;
  setMorphotypes: (morphotypes: Partial<Morphotypes>) => void;
  setAmsel: (amsel: Partial<AmselCriteria>) => void;
  setConclusion: (conclusion: string, reference?: string) => void;
  setPdfUrl: (url: string) => void;
  setStep: (step: number) => void;
  // Popula o estado completo a partir de um laudo persistido (edição / retomar rascunho).
  // Diferente dos setters incrementais (que servem para IR preenchendo um laudo NOVO),
  // hydrate substitui `currentReport` inteiro e reconstrói os morfotipos qualitativos a
  // partir dos pontos salvos usando pointsToMorphotypes (ver caveat da conversão inversa
  // do mobiluncus em src/lib/nugent.ts).
  hydrate: (report: ReportRow) => void;
  reset: () => void;
};

export const useReportStore = create<ReportState>((set) => ({
  reportId: null,
  currentReport: null,
  morphotypes: null,
  isDirty: false,
  currentStep: 1,

  setReportId: (reportId) => set({ reportId }),

  setPatientData: (data) =>
    set((state) => ({
      currentReport: { ...state.currentReport, ...data },
      isDirty: true,
    })),

  setFindings: (findings) =>
    set((state) => ({
      currentReport: { ...state.currentReport, ...findings },
      isDirty: true,
    })),

  // Guarda os níveis brutos (ex: { lactobacillus: '3+' }).
  // Não toca em currentReport — a conversão para pontos é responsabilidade de lib/nugent.ts.
  setMorphotypes: (morphotypes) =>
    set((state) => ({
      morphotypes: { ...state.morphotypes, ...morphotypes },
      isDirty: true,
    })),

  // `amsel` chega no formato de AmselCriteria (chaves sem prefixo, usado para o cálculo em
  // lib/amsel.ts), mas currentReport segue o formato do Report/DB (chaves `amsel_*`). Precisa
  // mapear explicitamente — um merge direto (`...amsel`) grava nas chaves erradas e deixa
  // `currentReport.amsel_*` sempre undefined (bug: fazia o diagnóstico em findings.tsx/
  // conclusion.tsx nunca fechar, mesmo com o Nugent calculado corretamente).
  setAmsel: (amsel) =>
    set((state) => {
      const patch: Partial<Report> = {};
      if (amsel.homogeneous_discharge !== undefined) patch.amsel_homogeneous_discharge = amsel.homogeneous_discharge;
      if (amsel.whiff_test !== undefined) patch.amsel_whiff_test = amsel.whiff_test;
      if (amsel.clue_cells_20 !== undefined) patch.amsel_clue_cells_20 = amsel.clue_cells_20;
      if (amsel.ph_above_45 !== undefined) patch.amsel_ph_above_45 = amsel.ph_above_45;
      if (amsel.ph_value !== undefined) patch.amsel_ph_value = amsel.ph_value;

      return {
        currentReport: { ...state.currentReport, ...patch },
        isDirty: true,
      };
    }),

  setConclusion: (conclusion, reference) =>
    set((state) => ({
      currentReport: {
        ...state.currentReport,
        conclusion,
        ...(reference !== undefined && { bibliographic_reference: reference }),
      },
      isDirty: true,
    })),

  setPdfUrl: (pdf_url) =>
    set((state) => ({
      currentReport: { ...state.currentReport, pdf_url },
    })),

  setStep: (currentStep) => set({ currentStep }),

  hydrate: (report) => {
    // Reconstrói morfotipos qualitativos a partir dos pontos salvos (best-effort).
    // A conversão do mobiluncus é ambígua (2+, 3+, 4+ → 2 pts), então pointsToMorphotypes
    // escolhe o menor nível equivalente. O médico pode ajustar antes de re-finalizar.
    const morphotypes = pointsToMorphotypes({
      lactobacillus: report.nugent_lactobacillus,
      gardnerella: report.nugent_gardnerella,
      mobiluncus: report.nugent_mobiluncus,
    });

    set({
      reportId: report.id,
      currentReport: {
        patient_name: report.patient_name,
        patient_birth_date: report.patient_birth_date ?? undefined,
        collection_date: report.collection_date,
        requesting_doctor: report.requesting_doctor ?? undefined,
        lactobacilli: toFindingLevel(report.lactobacilli),
        cocci: toFindingLevel(report.cocci),
        coccobacilli_gram_pos: toFindingLevel(report.coccobacilli_gram_pos),
        coccobacilli_gram_neg: toFindingLevel(report.coccobacilli_gram_neg),
        leukocytes: toFindingLevel(report.leukocytes),
        red_blood_cells: toFindingLevel(report.red_blood_cells),
        epithelial_cells: toFindingLevel(report.epithelial_cells),
        fungal_elements: toFindingLevel(report.fungal_elements),
        trichomonas: toFindingLevel(report.trichomonas),
        clue_cells: toFindingLevel(report.clue_cells),
        mucus: toFindingLevel(report.mucus),
        microscopic_description: report.microscopic_description ?? undefined,
        nugent_lactobacillus: report.nugent_lactobacillus ?? undefined,
        nugent_gardnerella: report.nugent_gardnerella ?? undefined,
        nugent_mobiluncus: report.nugent_mobiluncus ?? undefined,
        nugent_score: report.nugent_score ?? undefined,
        amsel_homogeneous_discharge: report.amsel_homogeneous_discharge,
        amsel_whiff_test: report.amsel_whiff_test,
        amsel_clue_cells_20: report.amsel_clue_cells_20,
        amsel_ph_above_45: report.amsel_ph_above_45,
        amsel_ph_value: report.amsel_ph_value ?? undefined,
        conclusion: report.conclusion ?? undefined,
        bibliographic_reference: report.bibliographic_reference ?? undefined,
        pdf_url: report.pdf_url ?? undefined,
      },
      morphotypes,
      isDirty: false,
      currentStep: 1,
    });
  },

  reset: () => set({ reportId: null, currentReport: null, morphotypes: null, isDirty: false, currentStep: 1 }),
}));
