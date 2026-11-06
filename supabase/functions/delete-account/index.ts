// Edge Function: delete-account
//
// Exclui completamente a conta do médico autenticado (LGPD / RF22).
//
// Fluxo:
//   1. Valida o JWT do header Authorization via cliente com anon key (auth.getUser)
//      — o user_id NUNCA vem do corpo da requisição, sempre é derivado do JWT
//      verificado pelo servidor de auth do Supabase.
//   2. Remove todos os objetos de Storage sob {user_id}/ nos 3 buckets privados
//      (report-images, report-pdfs, doctor-assets) usando o client admin.
//      Lista tudo antes de remover e confirma que o prefixo ficou vazio; se
//      sobrar algo, a exclusão falha (500) em vez de reportar sucesso.
//   3. Insere linha em audit_log { event_type: 'account.deleted', actor_id }
//      antes de deletar o usuário — audit_log não tem FK para auth.users, então
//      sobrevive à exclusão.
//   4. Chama admin.auth.admin.deleteUser(user_id): o ON DELETE CASCADE em
//      doctors.user_id / reports.doctor_id / report_images.report_id limpa
//      todas as tabelas do public schema.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKETS = ['report-images', 'report-pdfs', 'doctor-assets'] as const;

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

const PAGE_SIZE = 1000;
// Profundidade máxima de subpastas percorrida abaixo de {userId}/. O app grava
// no máximo {userId}/{report_id}/arquivo, mas as policies de Storage só travam
// o 1º segmento — o client pode criar paths mais fundos, então descemos além.
const MAX_DEPTH = 8;
// Passadas de "listar tudo → remover" até o prefixo ficar vazio.
const MAX_PASSES = 3;

// Lista TODOS os arquivos sob `prefix`, recursivamente, sem remover nada.
// Importante: não pode haver remoção entre páginas — Storage.list deriva as
// "pastas" dos objetos existentes, então apagar durante a paginação por offset
// encolhe a listagem e faz páginas seguintes pularem entradas.
async function collectFiles(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
  depth = 0,
): Promise<string[]> {
  const files: string[] = [];
  const folders: string[] = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: entries, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: PAGE_SIZE, offset });
    if (error) throw new Error(`Falha ao listar ${bucket}/${prefix}: ${error.message}`);
    if (!entries || entries.length === 0) break;

    // Um arquivo tem metadata (mimetype/size); uma "pasta" vem sem metadata.
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.metadata) files.push(path);
      else folders.push(path);
    }

    if (entries.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (folders.length > 0 && depth >= MAX_DEPTH) {
    throw new Error(`Estrutura de pastas mais funda que ${MAX_DEPTH} níveis em ${bucket}/${prefix}`);
  }
  for (const folder of folders) {
    files.push(...(await collectFiles(admin, bucket, folder, depth + 1)));
  }
  return files;
}

// Remove todos os objetos do bucket sob a "pasta" {userId}/ e confirma que o
// prefixo ficou vazio. Lança erro se sobrar algo — melhor falhar a exclusão
// (o usuário pode tentar de novo) do que reportar sucesso deixando dados de
// pacientes no Storage.
async function purgeBucket(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  userId: string,
): Promise<void> {
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const filePaths = await collectFiles(admin, bucket, userId);
    if (filePaths.length === 0) return;

    // remove() em lotes para respeitar o limite de paths por requisição.
    for (let i = 0; i < filePaths.length; i += PAGE_SIZE) {
      const batch = filePaths.slice(i, i + PAGE_SIZE);
      const { error } = await admin.storage.from(bucket).remove(batch);
      if (error) throw new Error(`Falha ao remover arquivos de ${bucket}: ${error.message}`);
    }
  }

  const leftover = await collectFiles(admin, bucket, userId);
  if (leftover.length > 0) {
    throw new Error(`${leftover.length} arquivo(s) restante(s) em ${bucket} após ${MAX_PASSES} passadas`);
  }
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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Server misconfigured' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(401, { error: 'Missing Authorization header' });
  }

  // Client com anon key + JWT do usuário → valida a sessão
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

  const userId = user.id;

  // Client admin com service_role — apenas dentro da Edge Function
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  try {
    // 1. Purga os buckets (namespaced por {user_id}/)
    for (const bucket of BUCKETS) {
      await purgeBucket(admin, bucket, userId);
    }

    // 2. audit_log ANTES de deletar (linha sobrevive à exclusão do usuário)
    const { error: auditError } = await admin.from('audit_log').insert({
      event_type: 'account.deleted',
      actor_id: userId,
      metadata: { source: 'edge-function:delete-account' },
    });
    if (auditError) {
      throw new Error(`Falha ao registrar audit_log: ${auditError.message}`);
    }

    // 3. Deleta o usuário — cascateia para doctors → reports → report_images
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw new Error(`Falha ao deletar usuário: ${deleteError.message}`);
    }

    return jsonResponse(200, { success: true });
  } catch (err) {
    // Detalhe só no log da função — não devolver mensagens internas de Storage/Auth ao client.
    const message = err instanceof Error ? err.message : String(err);
    console.error('[delete-account] falha na exclusão:', message);
    return jsonResponse(500, { error: 'Account deletion failed' });
  }
});
