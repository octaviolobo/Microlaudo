import { Platform } from 'react-native';

import type { ReportType } from '@/types/report';

// Trava por plataforma dos tipos de laudo (Sprint USG-Web, docs/backlog.md).
// O USG transvaginal está no código desde já, mas só aparece na web até o lançamento
// oficial. Para liberar no mobile: trocar a regra do usg_transvaginal para `true`
// (e testar câmera/PDF no nativo — hoje o PDF do USG só é gerado na web).
const REPORT_TYPE_RULES: Record<ReportType, (platform: typeof Platform.OS) => boolean> = {
  microscopia: () => true,
  usg_transvaginal: (platform) => platform === 'web',
};

export function isReportTypeEnabled(type: ReportType, platform: typeof Platform.OS = Platform.OS): boolean {
  return REPORT_TYPE_RULES[type](platform);
}

export function enabledReportTypes(platform: typeof Platform.OS = Platform.OS): ReportType[] {
  return (Object.keys(REPORT_TYPE_RULES) as ReportType[]).filter((type) => isReportTypeEnabled(type, platform));
}
