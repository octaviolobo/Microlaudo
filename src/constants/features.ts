import { Platform } from 'react-native';

import type { ReportType } from '@/types/report';

// Trava por plataforma dos tipos de laudo. Hoje todos estão liberados em todas as
// plataformas (o USG ganhou PDF nativo via expo-print); a estrutura fica para travar
// um tipo novo numa plataforma antes do lançamento dele.
const REPORT_TYPE_RULES: Record<ReportType, (platform: typeof Platform.OS) => boolean> = {
  microscopia: () => true,
  usg_transvaginal: () => true,
};

export function isReportTypeEnabled(type: ReportType, platform: typeof Platform.OS = Platform.OS): boolean {
  return REPORT_TYPE_RULES[type](platform);
}

export function enabledReportTypes(platform: typeof Platform.OS = Platform.OS): ReportType[] {
  return (Object.keys(REPORT_TYPE_RULES) as ReportType[]).filter((type) => isReportTypeEnabled(type, platform));
}
