import { create } from 'zustand';

import type { Report, PatientData, Findings, AmselCriteria, Morphotypes } from '@/types/report';

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

  setAmsel: (amsel) =>
    set((state) => ({
      currentReport: { ...state.currentReport, ...amsel },
      isDirty: true,
    })),

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

  reset: () => set({ reportId: null, currentReport: null, morphotypes: null, isDirty: false, currentStep: 1 }),
}));
