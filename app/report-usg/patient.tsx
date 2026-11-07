import { PatientStep } from '@/components/report/PatientStep';
import { USG_TOTAL_STEPS } from '@/constants/usg-options';

export function UsgPatientScreen() {
  return (
    <PatientStep
      reportType="usg_transvaginal"
      nextRoute="/report-usg/analysis"
      totalSteps={USG_TOTAL_STEPS}
      dateLabelKey="steps.patient.examDate"
      showDocuments
    />
  );
}

export default UsgPatientScreen;
