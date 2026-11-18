// Edge Function: revenuecat-webhook
//
// Recebe os eventos da RevenueCat (compras pela App Store) e atualiza
// `subscriptions`. Sem JWT (verify_jwt = false em supabase/config.toml): a
// autenticação é o header Authorization, comparado com REVENUECAT_WEBHOOK_SECRET.
//
// Configurar na RevenueCat (Project settings → Integrations → Webhooks):
//   URL:                  https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
//   Authorization header: o mesmo valor de REVENUECAT_WEBHOOK_SECRET (32+ caracteres aleatórios)
//   Environment:          Both (produção e sandbox — a revisão da Apple e o TestFlight compram no sandbox)
//
// O corpo do evento só diz QUEM mudou: para cada app_user_id envolvido, a
// assinatura é relida na API da RevenueCat (syncAppleForUser) e o estado lido é
// gravado. Por isso todos os tipos de evento (INITIAL_PURCHASE, RENEWAL,
// CANCELLATION, UNCANCELLATION, EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE,
// TRANSFER, reembolso...) seguem o mesmo caminho, e eventos repetidos ou fora de
// ordem não estragam nada.
//
// Idempotência e trilha: o id do evento é a chave de `billing_events`. Falha
// nossa (banco, API da RevenueCat) responde 500 e a RevenueCat tenta de novo.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { adminClient, jsonResponse } from '../_shared/asaas.ts';
import { appUserIdsForEvent } from '../_shared/appleBilling.ts';
import { safeEqual } from '../_shared/billingLogic.ts';
import { syncAppleForUser } from '../_shared/revenuecat.ts';

type RevenueCatEvent = {
  id?: unknown;
  type?: unknown;
  app_user_id?: unknown;
  original_app_user_id?: unknown;
  transferred_from?: unknown;
  transferred_to?: unknown;
};

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  const received = req.headers.get('Authorization') ?? '';
  if (!expected || !safeEqual(received, expected)) {
    console.warn('[revenuecat-webhook] Authorization inválido');
    return jsonResponse(401, { error: 'unauthorized' });
  }

  let body: { event?: RevenueCatEvent };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_body' });
  }
  const event = body.event;
  if (!event || typeof event.id !== 'string' || typeof event.type !== 'string') {
    return jsonResponse(400, { error: 'invalid_event' });
  }

  const admin = adminClient();

  const { data: inserted, error: insertError } = await admin
    .from('billing_events')
    .upsert(
      { id: `rc:${event.id}`, provider: 'apple', event_type: event.type, payload: body },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    .select('id');
  if (insertError) {
    console.error('[revenuecat-webhook] falha ao registrar evento', insertError.message);
    return jsonResponse(500, { error: 'storage_error' });
  }
  if (!inserted || inserted.length === 0) {
    const { data: previous } = await admin
      .from('billing_events')
      .select('processed_at')
      .eq('id', `rc:${event.id}`)
      .single();
    if (previous?.processed_at) return jsonResponse(200, { ok: true, duplicate: true });
  }

  const finish = async (result: string) => {
    await admin
      .from('billing_events')
      .update({ processed_at: new Date().toISOString(), result })
      .eq('id', `rc:${event.id}`);
    return jsonResponse(200, { ok: true, result });
  };

  // Botão "Send test event" da RevenueCat.
  if (event.type === 'TEST') return finish('test');

  const userIds = appUserIdsForEvent(event);
  if (userIds.length === 0) return finish('no_app_user_id');

  const results: string[] = [];
  try {
    for (const id of userIds) results.push(`${id.slice(0, 8)}:${await syncAppleForUser(admin, id)}`);
  } catch (err) {
    console.error('[revenuecat-webhook] falha ao sincronizar', String(err));
    return jsonResponse(500, { error: 'sync_failed' });
  }
  return finish(results.join(' '));
});
