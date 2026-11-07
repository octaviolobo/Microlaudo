// Keep-alive do projeto Supabase de DESENVOLVIMENTO (plano Free pausa após ~7 dias sem
// requisições). Cloudflare Worker com Cron Trigger: faz uma consulta leve na API REST.
// NÃO usar em produção — produção fica no plano Pro, que não pausa.
//
// Secrets (configurar com `npx wrangler secret put <NOME>`):
//   SUPABASE_URL       ex.: https://xxxx.supabase.co
//   SUPABASE_ANON_KEY  chave pública (anon/publishable) do projeto de dev
//
// A consulta usa a anon key sem login: o RLS devolve lista vazia, mas a requisição passa
// pelo PostgREST e pelo banco, o que conta como atividade.
//
// Sem handler `fetch` de propósito: o Worker não expõe URL pública. Para testar:
//   npx wrangler dev --test-scheduled   e abrir http://localhost:8787/__scheduled
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(ping(env));
  },
};

async function ping(env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/doctors?select=id&limit=1`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  });
  console.log(`[keep-alive] ${new Date().toISOString()} → HTTP ${res.status}`);
  if (!res.ok) throw new Error(`keep-alive falhou: HTTP ${res.status}`);
}
