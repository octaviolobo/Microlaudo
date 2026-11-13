// Cliente mínimo da API do Asaas + utilitários HTTP das Edge Functions de cobrança.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   ASAAS_API_KEY        chave da API (sandbox: $aact_hmlg_…, produção: $aact_prod_…)
//   ASAAS_API_URL        https://api-sandbox.asaas.com (padrão) ou https://api.asaas.com
//   ASAAS_WEBHOOK_TOKEN  token configurado no webhook do Asaas (header asaas-access-token)
//   ASAAS_CALLBACK_URL   opcional: para onde o Asaas manda o médico depois de pagar
import { createClient } from 'npm:@supabase/supabase-js@2';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

export function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export class AsaasError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`Asaas respondeu ${status}`);
  }
}

// Sandbox por padrão: esquecer o secret nunca cobra de verdade.
function apiBase(): string {
  return (Deno.env.get('ASAAS_API_URL') ?? 'https://api-sandbox.asaas.com').replace(/\/+$/, '');
}

export async function asaas<T = Record<string, unknown>>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const apiKey = Deno.env.get('ASAAS_API_KEY');
  if (!apiKey) throw new Error('ASAAS_API_KEY ausente');

  const res = await fetch(`${apiBase()}/v3${path}`, {
    method,
    headers: {
      access_token: apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'microlaudo-edge',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) throw new AsaasError(res.status, parsed);
  return parsed as T;
}

export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Server misconfigured');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

// Valida o JWT do header e devolve o usuário (o user_id nunca vem do corpo).
export async function authenticatedUser(req: Request) {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('Authorization');
  if (!url || !anonKey || !authHeader) return null;

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await userClient.auth.getUser();
  return error || !data.user ? null : data.user;
}
