// Tipos do banco. A parte gerada fica em database.generated.ts (regenerar com
// `npm run db:types` depois de cada migration); aqui ficam só os atalhos.
import type { Tables, TablesInsert, TablesUpdate } from './database.generated';

export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './database.generated';

export type DoctorRow = Tables<'doctors'>;
export type DoctorInsert = TablesInsert<'doctors'>;
export type ReportRow = Tables<'reports'>;
export type ReportInsert = TablesInsert<'reports'>;
export type ReportUpdate = TablesUpdate<'reports'>;
export type ReportImageRow = Tables<'report_images'>;
export type AuditLogInsert = TablesInsert<'audit_log'>;
