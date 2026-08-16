// Edge Function: prodoctor-patients
//
// Duas ações sobre a API aberta do ProDoctor (prontuário/agenda médica), para
// autocompletar o formulário de laudo (RF: autofill de paciente):
//   - action "search": busca pacientes por nome (POST Pacientes)
//   - action "lastDoctor": acha o médico do último atendimento realizado de
//     uma paciente (POST Agenda/Buscar, filtrando por paciente.codigo)
//
// Repositório de exemplos oficial usado como referência para a busca por nome:
//   https://github.com/ProDoctorSoftware/api-aberta-exemplos (src/business/index.js)
// O endpoint Agenda/Buscar não está nesse repositório de exemplos — foi
// confirmado a partir do OpenAPI spec público em
// https://open-api.prodoctor.net/swagger/v1/swagger.json (schemas
// AgendamentoPacienteRequest / AgendamentoProcuraConsultaViewModel).
//
// Por quê uma Edge Function e não chamar direto do app: as credenciais
// X-APIKEY/X-APIPASSWORD são client credentials do consultório (não um token
// de usuário) e JAMAIS podem ir para o bundle do client. Mesmo padrão de
// supabase/functions/delete-account/index.ts:
//   1. Valida o JWT do médico autenticado via header Authorization (client
//      com anon key + auth.getUser()) — só médicos logados podem consultar.
//   2. Só então chama a API do ProDoctor usando segredos lidos de Deno.env.
//
// action "search": só "buscar por nome" (POST Pacientes). O endpoint de
// detalhe (GET Pacientes/Detalhar/{codigo}) não é chamado porque a própria
// busca já retorna nome + dataNascimento, que é tudo que o autofill precisa —
// evita uma segunda chamada de rede e reduz a superfície de dados pessoais
// trafegados (LGPD / minimização de dados).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const PRODOCTOR_BASE_URL = 'https://open-api.prodoctor.net/api/v1/';
const MIN_TERM_LENGTH = 2;
// Teto de agendamentos buscados para achar o último atendimento — não
// precisamos do histórico completo (a API aceita até 5000), só o suficiente
// para cobrir o volume de consultas de uma paciente em um consultório.
const AGENDA_MAX_RESULTS = 500;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

// Payload bruto da API do ProDoctor. Só declaramos os campos que de fato
// consumimos — o resto (incluindo `foto` em base64) é ignorado e nunca sai
// desta função.
type ProDoctorRawPatient = {
  codigo?: string | number;
  nome?: string;
  dataNascimento?: string;
};

type ProDoctorSearchResponse = {
  payload?: {
    pacientes?: ProDoctorRawPatient[];
  };
};

// Campos usados de AgendamentoProcuraConsultaViewModel (ver swagger.json) —
// só o necessário para achar o médico do último atendimento realizado.
type ProDoctorAgendamento = {
  usuario?: { nome?: string } | null;
  data?: string; // "DD/MM/YYYY", mesma convenção usada no resto da API
  hora?: string; // "HH:mm"
  estadoAgendaConsulta?: { atendido?: boolean; compareceu?: boolean; faltou?: boolean } | null;
};

type ProDoctorAgendaBuscarResponse = {
  payload?: {
    agendamentos?: ProDoctorAgendamento[];
  };
};

// Converte "DD/MM/YYYY" (+ "HH:mm" opcional) num timestamp comparável.
// Retorna -1 se a data vier num formato inesperado, para que esses registros
// afundem no fim da ordenação (nunca "vençam" um registro válido).
function agendamentoTimestamp(agendamento: ProDoctorAgendamento): number {
  const dataMatch = agendamento.data ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(agendamento.data) : null;
  if (!dataMatch) return -1;
  const [, dd, mm, yyyy] = dataMatch;
  const [hh, min] = (agendamento.hora ?? '00:00').split(':').map((n) => Number(n) || 0);
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), hh, min).getTime();
}

// Escolhe o agendamento mais recente que efetivamente aconteceu. Prioriza
// "atendido" (atendimento concluído); se nenhum tiver esse campo marcado,
// aceita "compareceu"; na ausência de qualquer sinal de status, cai para o
// mais recente entre todos (evita não sugerir nada por causa de um campo que
// a API às vezes deixa null em integrações mais antigas).
function pickLastAttendedDoctor(agendamentos: ProDoctorAgendamento[]): string | null {
  const byRecency = [...agendamentos].sort((a, b) => agendamentoTimestamp(b) - agendamentoTimestamp(a));

  const attended =
    byRecency.find((a) => a.estadoAgendaConsulta?.atendido) ??
    byRecency.find((a) => a.estadoAgendaConsulta?.compareceu) ??
    byRecency.find((a) => !a.estadoAgendaConsulta?.faltou) ??
    byRecency[0];

  const nome = attended?.usuario?.nome?.trim();
  return nome ? nome : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const apiKey = Deno.env.get('PRODOCTOR_API_KEY');
  const apiPassword = Deno.env.get('PRODOCTOR_API_PASSWORD');

  if (!supabaseUrl || !anonKey || !apiKey || !apiPassword) {
    return jsonResponse(500, { error: 'Server misconfigured' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(401, { error: 'Missing Authorization header' });
  }

  // Client com anon key + JWT do usuário → valida a sessão. Só médicos
  // autenticados podem consultar dados de pacientes do ProDoctor.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse(401, { error: 'Invalid or expired token' });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  // "search" é o default (compatibilidade com o formato antigo { term }, que
  // não tinha "action") — só "lastDoctor" precisa ser pedido explicitamente.
  const action = (body as { action?: unknown } | null)?.action ?? 'search';
  const prodoctorHeaders = {
    'Content-Type': 'application/json',
    'X-APIKEY': apiKey,
    'X-APIPASSWORD': apiPassword,
  };

  if (action === 'lastDoctor') {
    const codigo = (body as { codigo?: unknown } | null)?.codigo;
    if (typeof codigo !== 'string' && typeof codigo !== 'number') {
      return jsonResponse(400, { error: 'Missing "codigo"' });
    }
    const codigoNum = Number(codigo);
    if (!Number.isFinite(codigoNum)) {
      return jsonResponse(400, { error: 'Invalid "codigo"' });
    }

    try {
      const upstream = await fetch(`${PRODOCTOR_BASE_URL}Agenda/Buscar`, {
        method: 'POST',
        headers: prodoctorHeaders,
        body: JSON.stringify({
          paciente: { codigo: codigoNum },
          quantidade: AGENDA_MAX_RESULTS,
        }),
      });

      if (!upstream.ok) {
        console.error(`[prodoctor-patients] upstream (Agenda/Buscar) respondeu ${upstream.status}`);
        return jsonResponse(502, { error: 'ProDoctor API request failed' });
      }

      const parsed = (await upstream.json()) as ProDoctorAgendaBuscarResponse;
      const agendamentos = parsed.payload?.agendamentos ?? [];
      const doctorName = agendamentos.length > 0 ? pickLastAttendedDoctor(agendamentos) : null;

      return jsonResponse(200, { doctorName });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[prodoctor-patients] falha na chamada upstream (Agenda/Buscar):', message);
      return jsonResponse(502, { error: 'ProDoctor API unavailable' });
    }
  }

  const term = (body as { term?: unknown } | null)?.term;
  if (typeof term !== 'string' || term.trim().length < MIN_TERM_LENGTH) {
    return jsonResponse(400, { error: 'Missing or too short "term"' });
  }

  try {
    const upstream = await fetch(`${PRODOCTOR_BASE_URL}Pacientes`, {
      method: 'POST',
      headers: prodoctorHeaders,
      body: JSON.stringify({ Termo: term.trim() }),
    });

    if (!upstream.ok) {
      // Não repassa o corpo bruto da resposta upstream (pode ecoar headers/erros
      // com detalhes internos) nem loga as credenciais — só o status.
      console.error(`[prodoctor-patients] upstream respondeu ${upstream.status}`);
      return jsonResponse(502, { error: 'ProDoctor API request failed' });
    }

    const parsed = (await upstream.json()) as ProDoctorSearchResponse;
    const pacientes = parsed.payload?.pacientes ?? [];

    // Repassa só os campos necessários para o autofill — nunca `foto` (base64)
    // nem outros dados sensíveis que a API eventualmente inclua.
    const patients = pacientes
      .filter((p) => p.codigo != null && p.nome)
      .map((p) => ({
        codigo: String(p.codigo),
        nome: p.nome as string,
        dataNascimento: p.dataNascimento ?? null,
      }));

    return jsonResponse(200, { patients });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[prodoctor-patients] falha na chamada upstream:', message);
    return jsonResponse(502, { error: 'ProDoctor API unavailable' });
  }
});
