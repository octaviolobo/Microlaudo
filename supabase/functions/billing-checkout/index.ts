// Edge Function: billing-checkout
//
// Cria a assinatura do médico autenticado no Asaas e devolve a URL da 1ª fatura.
//
// Corpo: { plan: 'monthly' | 'annual', method: 'card' | 'invoice', cpfCnpj: string }
//   - cpfCnpj: exigido pelo Asaas para criar o cliente (e pela NFS-e). Fica só
//     no Asaas; não gravamos no nosso banco.
//
// Fluxo:
//   1. JWT → usuário → linha de doctors (client admin).
//   2. Já tem acesso (assinatura ativa/cortesia/cancelada no prazo) → 409.
//   3. Assinatura Asaas pendente de checkout anterior → apagada no Asaas (evita
//      duas cobranças abertas).
//   4. Cliente Asaas: reaproveita o salvo (atualizando o documento) ou cria,
//      com externalReference = doctors.id.
//   5. Cria a assinatura (1º vencimento hoje) e grava `subscriptions` como
//      pending. Quem ativa é o webhook, quando o pagamento confirmar.
//   6. Devolve a invoiceUrl da 1ª cobrança.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { AsaasError, CORS_HEADERS, adminClient, asaas, authenticatedUser, jsonResponse } from '../_shared/asaas.ts';
import {
  BILLING_TYPE,
  PLAN_CONFIG,
  isPaymentMethod,
  isPlan,
  isValidCpfCnpj,
  onlyDigits,
  todayInBrazil,
} from '../_shared/billingLogic.ts';

type AsaasList<T> = { data: T[] };
type AsaasPayment = { id: string; invoiceUrl?: string; status: string };

async function firstInvoiceUrl(subscriptionId: string): Promise<string | null> {
  // A 1ª cobrança nasce junto com a assinatura; uma nova tentativa cobre atraso.
  for (let attempt = 0; attempt < 3; attempt++) {
    const list = await asaas<AsaasList<AsaasPayment>>('GET', `/subscriptions/${subscriptionId}/payments`);
    const url = list.data.find((p) => p.invoiceUrl)?.invoiceUrl;
    if (url) return url;
    await new Promise((r) => setTimeout(r, 800));
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });

  const user = await authenticatedUser(req);
  if (!user) return jsonResponse(401, { error: 'unauthorized' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_body' });
  }
  const { plan, method } = body;
  const cpfCnpj = onlyDigits(body.cpfCnpj);
  if (!isPlan(plan) || !isPaymentMethod(method)) return jsonResponse(400, { error: 'invalid_plan' });
  if (!isValidCpfCnpj(cpfCnpj)) return jsonResponse(400, { error: 'invalid_document' });

  const admin = adminClient();

  try {
    const { data: doctor, error: doctorError } = await admin
      .from('doctors')
      .select('id, full_name')
      .eq('user_id', user.id)
      .single();
    if (doctorError || !doctor) return jsonResponse(404, { error: 'profile_not_found' });

    const { data: current } = await admin
      .from('subscriptions')
      .select('provider, provider_customer_id, provider_subscription_id, status, current_period_end')
      .eq('doctor_id', doctor.id)
      .maybeSingle();

    const hasAccess =
      current &&
      ['active', 'past_due', 'canceled'].includes(current.status) &&
      (current.current_period_end === null || new Date(current.current_period_end) > new Date());
    if (hasAccess) return jsonResponse(409, { error: 'already_subscribed' });

    if (current?.provider === 'asaas' && current.status === 'pending' && current.provider_subscription_id) {
      try {
        await asaas('DELETE', `/subscriptions/${current.provider_subscription_id}`);
      } catch (err) {
        // Já apagada no Asaas: segue. Outro erro: não cria uma segunda cobrança.
        if (!(err instanceof AsaasError && err.status === 404)) throw err;
      }
    }

    const customerPayload = {
      name: doctor.full_name?.trim() || user.email || 'Médico MicroLaudo',
      cpfCnpj,
      email: user.email ?? undefined,
      externalReference: doctor.id,
    };
    let customerId = current?.provider === 'asaas' ? current.provider_customer_id : null;
    if (customerId) {
      await asaas('POST', `/customers/${customerId}`, customerPayload);
    } else {
      const customer = await asaas<{ id: string }>('POST', '/customers', customerPayload);
      customerId = customer.id;
    }

    const config = PLAN_CONFIG[plan];
    const callbackUrl = Deno.env.get('ASAAS_CALLBACK_URL');
    const subscription = await asaas<{ id: string }>('POST', '/subscriptions', {
      customer: customerId,
      billingType: BILLING_TYPE[method],
      value: config.value,
      cycle: config.cycle,
      nextDueDate: todayInBrazil(),
      description: config.description,
      externalReference: doctor.id,
      ...(callbackUrl ? { callback: { successUrl: callbackUrl, autoRedirect: true } } : {}),
    });

    const { error: upsertError } = await admin.from('subscriptions').upsert(
      {
        doctor_id: doctor.id,
        provider: 'asaas',
        provider_customer_id: customerId,
        provider_subscription_id: subscription.id,
        plan,
        status: 'pending',
        current_period_end: null,
      },
      { onConflict: 'doctor_id' },
    );
    if (upsertError) throw new Error(`Falha ao gravar subscriptions: ${upsertError.message}`);

    const invoiceUrl = await firstInvoiceUrl(subscription.id);
    if (!invoiceUrl) throw new Error(`Assinatura ${subscription.id} sem fatura`);

    return jsonResponse(200, { invoiceUrl });
  } catch (err) {
    // Detalhe só no log; o client recebe um código genérico.
    if (err instanceof AsaasError) {
      console.error('[billing-checkout] Asaas', err.status, JSON.stringify(err.body));
      if (err.status === 400) return jsonResponse(400, { error: 'gateway_rejected' });
    } else {
      console.error('[billing-checkout]', err instanceof Error ? err.message : String(err));
    }
    return jsonResponse(502, { error: 'gateway_error' });
  }
});
