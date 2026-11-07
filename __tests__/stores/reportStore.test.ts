import { beforeEach, describe, expect, it } from '@jest/globals';

import { createDefaultUsgContent, usgContentToJson } from '@/lib/usgContent';
import { useReportStore } from '@/stores/reportStore';

import type { ReportRow } from '@/types/database';

function baseRow(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    id: 'r1',
    doctor_id: 'd1',
    report_type: 'microscopia',
    content: null,
    patient_name: 'Paciente Teste',
    patient_birth_date: null,
    patient_cpf: null,
    patient_sus_card: null,
    collection_date: '2026-11-06',
    requesting_doctor: null,
    material: 'm',
    method: 'm',
    lactobacilli: null,
    cocci: null,
    coccobacilli_gram_pos: null,
    coccobacilli_gram_neg: null,
    leukocytes: null,
    red_blood_cells: null,
    epithelial_cells: null,
    fungal_elements: null,
    trichomonas: null,
    clue_cells: null,
    mucus: null,
    microscopic_description: null,
    nugent_lactobacillus: null,
    nugent_gardnerella: null,
    nugent_mobiluncus: null,
    nugent_score: null,
    amsel_homogeneous_discharge: false,
    amsel_whiff_test: false,
    amsel_clue_cells_20: false,
    amsel_ph_above_45: false,
    amsel_ph_value: null,
    conclusion: null,
    bibliographic_reference: null,
    pdf_url: null,
    status: 'draft',
    revision_number: 1,
    evaluation_date: null,
    created_at: '2026-11-06T00:00:00Z',
    updated_at: '2026-11-06T00:00:00Z',
    ...overrides,
  };
}

describe('reportStore — tipos de laudo', () => {
  beforeEach(() => useReportStore.getState().reset());

  it('começa como microscopia, sem conteúdo USG', () => {
    const s = useReportStore.getState();
    expect(s.reportType).toBe('microscopia');
    expect(s.usgContent).toBeNull();
  });

  it('startReport de USG limpa o estado anterior e carrega o conteúdo inicial', () => {
    useReportStore.getState().setReportId('antigo');
    useReportStore.getState().startReport('usg_transvaginal', createDefaultUsgContent());
    const s = useReportStore.getState();
    expect(s.reportId).toBeNull();
    expect(s.reportType).toBe('usg_transvaginal');
    expect(s.usgContent).toEqual(createDefaultUsgContent());
  });

  it('setUsgSection faz patch só da seção e marca dirty', () => {
    useReportStore.getState().startReport('usg_transvaginal', createDefaultUsgContent());
    useReportStore.getState().setUsgSection('uterus', { length_cm: 6.3 });
    const s = useReportStore.getState();
    expect(s.usgContent?.uterus.length_cm).toBe(6.3);
    expect(s.usgContent?.uterus.shape).toBe('piriforme');
    expect(s.usgContent?.left_ovary).toEqual(createDefaultUsgContent().left_ovary);
    expect(s.isDirty).toBe(true);
  });

  it('setUsgSection/setUsgContent não fazem nada num laudo de microscopia', () => {
    useReportStore.getState().setUsgSection('uterus', { length_cm: 6.3 });
    useReportStore.getState().setUsgContent({ free_fluid: 'pequena' });
    expect(useReportStore.getState().usgContent).toBeNull();
  });

  it('hydrate de microscopia mantém usgContent nulo', () => {
    useReportStore.getState().hydrate(baseRow());
    const s = useReportStore.getState();
    expect(s.reportType).toBe('microscopia');
    expect(s.usgContent).toBeNull();
  });

  it('hydrate de USG carrega tipo, conteúdo e documentos do paciente', () => {
    const content = createDefaultUsgContent();
    content.endometrium.thickness_mm = 5.7;
    useReportStore.getState().hydrate(
      baseRow({
        report_type: 'usg_transvaginal',
        content: usgContentToJson(content),
        patient_cpf: '52998224725',
      }),
    );
    const s = useReportStore.getState();
    expect(s.reportType).toBe('usg_transvaginal');
    expect(s.usgContent?.endometrium.thickness_mm).toBe(5.7);
    expect(s.currentReport?.patient_cpf).toBe('52998224725');
    expect(s.isDirty).toBe(false);
  });

  it('reset volta para microscopia', () => {
    useReportStore.getState().startReport('usg_transvaginal', createDefaultUsgContent());
    useReportStore.getState().reset();
    expect(useReportStore.getState().reportType).toBe('microscopia');
    expect(useReportStore.getState().usgContent).toBeNull();
  });
});
