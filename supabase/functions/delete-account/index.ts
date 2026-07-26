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

// Remove todos os objetos do bucket sob a "pasta" {userId}/, paginando quando
// necessário. Storage.list retorna no máximo 1000 itens por página.
async function purgeBucket(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  userId: string,
): Promise<void> {
  const PAGE_SIZE = 1000;
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: entries, error: listError } = await admin.storage
      .from(bucket)
      .list(userId, { limit: PAGE_SIZE, offset });

    if (listError) throw new Error(`Falha ao listar ${bucket}: ${listError.message}`);
    if (!entries || entries.length === 0) break;

    // Storage.list retorna arquivos E subpastas. Para arquivos direto em {userId}/
    // temos o path `${userId}/${entry.name}`. Para subpastas (report-images e
    // report-pdfs usam {userId}/{report_id}/...), precisamos descer um nível.
    const filePaths: string[] = [];
    for (const entry of entries) {
      // Um arquivo tem metadata (com mimetype/size); uma "pasta" retornada pelo
      // list vem sem metadata. Descobrimos os arquivos dela listando de novo.
      if (entry.metadata) {
        filePaths.push(`${userId}/${entry.name}`);
      } else {
        // subpasta (ex: report_id) — listar recursivamente 1 nível
        const subPrefix = `${userId}/${entry.name}`;
        let subOffset = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: subEntries, error: subError } = await admin.storage
            .from(bucket)
            .list(subPrefix, { limit: PAGE_SIZE, offset: subOffset });
          if (subError) throw new Error(`Falha ao listar ${bucket}/${subPrefix}: ${subError.message}`);
          if (!subEntries || subEntries.length === 0) break;
          for (const sub of subEntries) {
            if (sub.metadata) filePaths.push(`${subPrefix}/${sub.name}`);
          }
          if (subEntries.length < PAGE_SIZE) break;
          subOffset += PAGE_SIZE;
        }
      }
    }

    if (filePaths.length > 0) {
      const { error: removeError } = await admin.storage.from(bucket).remove(filePaths);
      if (removeError) {
        throw new Error(`Falha ao remover arquivos de ${bucket}: ${removeError.message}`);
      }
    }

    if (entries.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
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
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(500, { error: 'Account deletion failed', detail: message });
  }
});
