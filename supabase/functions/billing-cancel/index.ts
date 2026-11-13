// Edge Function: billing-cancel
//
// Cancela a assinatura Asaas do médico autenticado. O acesso continua até o fim
// do período já pago (status `canceled`); uma assinatura que nunca foi paga
// (`pending`) vira `expired` direto.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { AsaasError, CORS_HEADERS, adminClient, asaas, authenticatedUser, jsonResponse } from '../_shared/asaas.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });

  const user = await authenticatedUser(req);
  if (!user) return jsonResponse(401, { error: 'unauthorized' });

  const admin = adminClient();

  try {
    const { data: doctor } = await admin.from('doctors').select('id').eq('user_id', user.id).single();
    if (!doctor) return jsonResponse(404, { error: 'profile_not_found' });

    const { data: row } = await admin
      .from('subscriptions')
      .select('id, provider, provider_subscription_id, status, current_period_end')
      .eq('doctor_id', doctor.id)
      .maybeSingle();

    if (!row || row.provider !== 'asaas' || !row.provider_subscription_id) {
      return jsonResponse(404, { error: 'no_subscription' });
    }
    if (row.status === 'canceled' || row.status === 'expired') return jsonResponse(200, { status: row.status });

    try {
      await asaas('DELETE', `/subscriptions/${row.provider_subscription_id}`);
    } catch (err) {
      if (!(err instanceof AsaasError && err.status === 404)) throw err;
    }

    const status = row.status === 'pending' ? 'expired' : 'canceled';
    const { error } = await admin.from('subscriptions').update({ status }).eq('id', row.id);
    if (error) throw new Error(`Falha ao gravar subscriptions: ${error.message}`);

    await admin.from('audit_log').insert({
      event_type: 'subscription.canceled',
      actor_id: user.id,
      metadata: { provider: 'asaas', previous_status: row.status },
    });

    return jsonResponse(200, { status });
  } catch (err) {
    console.error('[billing-cancel]', err instanceof AsaasError ? `Asaas ${err.status}` : String(err));
    return jsonResponse(502, { error: 'gateway_error' });
  }
});
