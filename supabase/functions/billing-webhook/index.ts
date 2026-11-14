// Edge Function: billing-webhook
//
// Recebe os eventos do Asaas e atualiza `subscriptions`. Sem JWT
// (verify_jwt = false em supabase/config.toml): a autenticação é o token do
// webhook no header `asaas-access-token`, comparado com ASAAS_WEBHOOK_TOKEN.
//
// Configurar no Asaas (Integrações → Webhooks):
//   URL:    https://<project-ref>.supabase.co/functions/v1/billing-webhook
//   Token:  o mesmo valor de ASAAS_WEBHOOK_TOKEN (32+ caracteres aleatórios)
//   Eventos: cobranças (PAYMENT_*) e assinaturas (SUBSCRIPTION_*)
//
// Entrega "pelo menos uma vez": o id do evento é a chave de `billing_events`;
// evento já processado responde 200 sem refazer nada. Depois de 15 falhas
// seguidas o Asaas pausa a fila, então só devolvemos erro (para ele tentar de
// novo) em falha nossa de banco; evento sem assinatura conhecida é registrado
// e respondido com 200.
//
// Estorno/chargeback: além de cortar o acesso, apaga a assinatura no Asaas.
// Estornar uma cobrança não cancela a assinatura lá, e a próxima renovação
// cobraria o cartão de novo (e o webhook reativaria o plano).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { AsaasError, adminClient, asaas, jsonResponse } from '../_shared/asaas.ts';
import { actionForEvent, applyAction, safeEqual } from '../_shared/billingLogic.ts';

import type { Plan, SubscriptionStatus } from '../_shared/billingLogic.ts';

type AsaasEvent = {
  id?: unknown;
  event?: unknown;
  payment?: { id?: string; subscription?: string; dueDate?: string; status?: string };
  subscription?: { id?: string };
};

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });

  const expected = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
  const received = req.headers.get('asaas-access-token') ?? '';
  if (!expected || !safeEqual(received, expected)) {
    console.warn('[billing-webhook] token inválido');
    return jsonResponse(401, { error: 'unauthorized' });
  }

  let event: AsaasEvent;
  try {
    event = await req.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_body' });
  }
  if (typeof event.id !== 'string' || typeof event.event !== 'string') {
    return jsonResponse(400, { error: 'invalid_event' });
  }

  const admin = adminClient();

  // 1. Registra (idempotência + trilha para "paguei e o app não liberou").
  const { data: inserted, error: insertError } = await admin
    .from('billing_events')
    .upsert(
      { id: event.id, provider: 'asaas', event_type: event.event, payload: event },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    .select('id');
  if (insertError) {
    console.error('[billing-webhook] falha ao registrar evento', insertError.message);
    return jsonResponse(500, { error: 'storage_error' });
  }
  if (!inserted || inserted.length === 0) {
    const { data: previous } = await admin.from('billing_events').select('processed_at').eq('id', event.id).single();
    if (previous?.processed_at) return jsonResponse(200, { ok: true, duplicate: true });
  }

  const finish = async (result: string) => {
    await admin
      .from('billing_events')
      .update({ processed_at: new Date().toISOString(), result })
      .eq('id', event.id as string);
    return jsonResponse(200, { ok: true, result });
  };

  // 2. Decide o que fazer.
  const action = actionForEvent(event.event);
  if (action.kind === 'ignore') return finish('ignored');

  const subscriptionId = event.event.startsWith('SUBSCRIPTION_') ? event.subscription?.id : event.payment?.subscription;
  if (!subscriptionId) return finish('no_subscription');

  const { data: row, error: rowError } = await admin
    .from('subscriptions')
    .select('id, status, plan, current_period_end')
    .eq('provider', 'asaas')
    .eq('provider_subscription_id', subscriptionId)
    .maybeSingle();
  if (rowError) {
    console.error('[billing-webhook] falha ao ler subscriptions', rowError.message);
    return jsonResponse(500, { error: 'storage_error' });
  }
  // Assinatura antiga (checkout refeito) ou de outro sistema: só registra.
  if (!row) return finish('unknown_subscription');

  const patch = applyAction(
    action,
    { status: row.status as SubscriptionStatus, plan: row.plan as Plan, current_period_end: row.current_period_end },
    event.payment ?? null,
  );
  if (!patch) return finish('no_change');

  const { error: updateError } = await admin.from('subscriptions').update(patch).eq('id', row.id);
  if (updateError) {
    console.error('[billing-webhook] falha ao atualizar subscriptions', updateError.message);
    return jsonResponse(500, { error: 'storage_error' });
  }

  let suffix = '';
  if (action.kind === 'revoke') {
    try {
      await asaas('DELETE', `/subscriptions/${subscriptionId}`);
    } catch (err) {
      if (!(err instanceof AsaasError && err.status === 404)) {
        // Acesso já cortado; a assinatura no Asaas precisa ser removida à mão.
        console.error('[billing-webhook] falha ao apagar assinatura após estorno', subscriptionId, String(err));
        suffix = ':asaas_delete_failed';
      }
    }
  }

  return finish(`${action.kind}:${patch.status}${suffix}`);
});
