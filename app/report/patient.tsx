import { PatientStep } from '@/components/report/PatientStep';

export function PatientScreen() {
  return <PatientStep reportType="microscopia" nextRoute="/report/photos" />;
}

export default PatientScreen;
