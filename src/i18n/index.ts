import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptBRCommon from './locales/pt-BR/common.json';
import ptBRReport from './locales/pt-BR/report.json';
import ptBRClinical from './locales/pt-BR/clinical.json';
import enCommon from './locales/en/common.json';
import enReport from './locales/en/report.json';
import enClinical from './locales/en/clinical.json';

i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': {
      common: ptBRCommon,
      report: ptBRReport,
      clinical: ptBRClinical,
    },
    en: {
      common: enCommon,
      report: enReport,
      clinical: enClinical,
    },
  },
  lng: 'pt-BR',
  fallbackLng: 'pt-BR',
  ns: ['common', 'report', 'clinical'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
});

export { i18n };
