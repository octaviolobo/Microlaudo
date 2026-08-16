// Integração com a API aberta do ProDoctor (prontuário/agenda médica) para
// autocompletar o nome/nascimento da paciente no formulário de laudo.
//
// A chamada real (com X-APIKEY/X-APIPASSWORD) acontece na Edge Function
// `prodoctor-patients` (supabase/functions/prodoctor-patients/index.ts) — este
// serviço só invoca a function autenticada, nunca fala com open-api.prodoctor.net
// diretamente do client.
//
// Importante: esta busca é um recurso de conveniência. Se a API do ProDoctor
// (ou a Edge Function) falhar por qualquer motivo, NUNCA lançamos erro daqui —
// apenas logamos um warning e devolvemos lista vazia, para não travar o
// preenchimento manual do laudo.
import { toISODate } from '@/lib/date';

import { supabase } from './supabase';

export type ProDoctorPatientSummary = {
  codigo: string;
  nome: string;
  // Formato bruto como devolvido pela API — use `parseProDoctorBirthDate` para
  // converter para ISO (YYYY-MM-DD) antes de usar em um DatePickerInput.
  dataNascimento: string | null;
};

const MIN_SEARCH_LENGTH = 2;

// Busca pacientes por nome. Termos com menos de 2 caracteres nem chegam a
// disparar uma chamada de rede (evita spam de requisições enquanto o usuário
// ainda está digitando a primeira letra).
export async function searchPatients(term: string): Promise<ProDoctorPatientSummary[]> {
  const trimmed = term.trim();
  if (trimmed.length < MIN_SEARCH_LENGTH) return [];

  try {
    const { data, error } = await supabase.functions.invoke<{
      patients?: ProDoctorPatientSummary[];
      error?: string;
    }>('prodoctor-patients', {
      method: 'POST',
      body: { action: 'search', term: trimmed },
    });

    if (error) {
      console.warn('[prodoctor] busca de pacientes falhou:', error.message);
      return [];
    }
    if (!data?.patients) {
      if (data?.error) console.warn('[prodoctor] busca de pacientes falhou:', data.error);
      return [];
    }
    return data.patients;
  } catch (err) {
    console.warn('[prodoctor] busca de pacientes falhou:', err);
    return [];
  }
}

// Acha o nome do médico do último atendimento REALIZADO da paciente (não o
// último agendamento marcado — filtra faltas/cancelamentos na Edge Function,
// ver supabase/functions/prodoctor-patients). Usado para autopreencher o
// campo "médica solicitante" ao selecionar uma paciente da busca.
//
// Assim como `searchPatients`, nunca lança erro: uma falha aqui não deve
// impedir o preenchimento manual do médico solicitante.
export async function getLastAttendingDoctor(codigo: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      doctorName?: string | null;
      error?: string;
    }>('prodoctor-patients', {
      method: 'POST',
      body: { action: 'lastDoctor', codigo },
    });

    if (error) {
      console.warn('[prodoctor] busca do médico do último atendimento falhou:', error.message);
      return null;
    }
    if (data?.error) {
      console.warn('[prodoctor] busca do médico do último atendimento falhou:', data.error);
      return null;
    }
    return data?.doctorName ?? null;
  } catch (err) {
    console.warn('[prodoctor] busca do médico do último atendimento falhou:', err);
    return null;
  }
}

// Converte `dataNascimento` (formato bruto da API do ProDoctor) para ISO
// (YYYY-MM-DD), formato que DatePickerInput/toISODate esperam.
//
// Formato confirmado no OpenAPI spec público (open-api.prodoctor.net/swagger/v1/swagger.json,
// schemas PeriodoRequest/AgendamentoIDRequest): datas na API são sempre
// "DD/MM/YYYY". Mantemos o fallback para Date.parse por segurança (cobre
// eventuais respostas em ISO), mas DD/MM/AAAA é o caminho esperado.
export function parseProDoctorBirthDate(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    const day = Number(dd);
    const month = Number(mm) - 1;
    const year = Number(yyyy);
    if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
      return toISODate(year, month, day);
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return toISODate(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return undefined;
}
