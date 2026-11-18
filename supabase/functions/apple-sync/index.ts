// Edge Function: apple-sync
//
// Chamada pelo app logo depois de uma compra ou de "Restaurar compras" na App
// Store: relê a assinatura do médico autenticado na RevenueCat e grava em
// `subscriptions` na hora, sem esperar o webhook (que chega segundos depois e
// faz a mesma coisa).
//
// Autenticação: JWT do Supabase (o app_user_id é sempre o do token, nunca do corpo).
// Resposta: { result } — ex.: 'write:active', 'skip:other_provider_active:manual'.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { CORS_HEADERS, adminClient, authenticatedUser, jsonResponse } from '../_shared/asaas.ts';
import { syncAppleForUser } from '../_shared/revenuecat.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });

  const user = await authenticatedUser(req);
  if (!user) return jsonResponse(401, { error: 'unauthorized' });

  try {
    const result = await syncAppleForUser(adminClient(), user.id);
    return jsonResponse(200, { result });
  } catch (err) {
    console.error('[apple-sync] falha ao sincronizar', user.id.slice(0, 8), String(err));
    return jsonResponse(502, { error: 'sync_failed' });
  }
});
