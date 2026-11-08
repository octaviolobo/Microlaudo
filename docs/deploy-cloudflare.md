# Deploy da versão web — Cloudflare Pages

Substitui o Vercel previsto no F45. Faz parte da Sprint USG-Web (U07/U08 em `docs/backlog.md`).

---

## 1. Antes do primeiro deploy com paciente real

- [ ] **Supabase Pro** no projeto de produção (o Free pausa e não tem backup — ver backlog).
- [ ] **SMTP próprio** no Supabase (Authentication → Emails → SMTP Settings — ex.: Resend com
      domínio verificado). O SMTP padrão só envia para membros do time e ~2 e-mails/hora: sem isso,
      médicos não recebem confirmação de cadastro nem link de redefinição de senha.
- [ ] Política de senha no Supabase (Authentication → Policies): mínimo 10, *Letters and digits*
      (o app valida igual — `getPasswordIssue` em `src/lib/validation.ts`).
- [x] Migration `014_report_types.sql` aplicada no projeto de produção (SQL Editor do dashboard) e
      tipos regenerados (`npm run db:types`). ✅ Feito em 06/11/2026.

## 2. Criar o projeto no Pages (👤 uma vez)

Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → repositório `microlaudo`.

| Campo | Valor |
|---|---|
| Production branch | `master` |
| Framework preset | None |
| Build command | `npm run build:web` |
| Build output directory | `dist` |

**Environment variables** (Settings → Environment variables, em *Production* e *Preview*):

| Variável | Valor |
|---|---|
| `NODE_VERSION` | `24` (mesma versão usada localmente; React Native 0.86 exige ≥ 20.19.4) |
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | chave anon/publishable |

As `EXPO_PUBLIC_*` entram **no build** (ficam no bundle do navegador). Mudou o valor → precisa de
novo deploy. Nunca colocar aqui segredos de servidor (ProDoctor, webhooks): esses ficam só nas
Edge Functions.

Cada push no `master` publica em produção; cada PR ganha uma URL de preview.

**Proteger os previews (obrigatório — eles usam o Supabase de produção):** Pages → projeto →
Settings → General → **Access policy → Enable**. Isso cria uma aplicação no Cloudflare Access
cobrindo `*.microlaudo.pages.dev` (previews); só quem passar no login do Access abre. Conferir em
Zero Trust → Access → Applications que a política permite só o seu e-mail.

## 3. Domínio e Auth (👤)

1. Pages → **Custom domains** → adicionar o domínio (ex.: `app.microlaudo.com.br`).
2. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: o domínio final (`https://app.microlaudo.com.br`).
   - **Redirect URLs**: adicionar o domínio final e `https://*.microlaudo.pages.dev` (previews).
3. Google Cloud Console → credencial OAuth → **Authorized JavaScript origins**: adicionar o
   domínio final. (O redirect do Google continua sendo o callback do Supabase.)

Sem o passo 2, o login (e-mail de confirmação, recuperação de senha e Google) volta para a URL
antiga.

## 4. O que já está no repositório

- `public/_headers`: CSP fechada (só o próprio site + o Supabase), HSTS, anti-iframe,
  `noindex` em `*.pages.dev` e cache longo dos bundles com hash. Testada com
  `npx wrangler pages dev dist` (login, foto, PDF, histórico, perfil sem violações no console).
  Se algo novo for bloqueado, o console mostra `violates the following Content Security Policy`
  com a diretiva — ajustar lá e explicar no comentário do arquivo. O `vercel.json`
  saiu: seu único ajuste (`cleanUrls`) o Pages já faz por padrão.
- Rotas desconhecidas: o export não gera `404.html`, então o Pages entra em modo SPA e serve o
  `index.html`, e o expo-router mostra a tela `+not-found`.

**Conferir no primeiro deploy:** abrir `/home`, `/history` e `/report-usg/patient` direto pela
barra de endereço e recarregar (F5) — não pode dar 404 do Cloudflare.

## 5. Keep-alive do Supabase de dev (opcional, U08)

Só para o projeto de **desenvolvimento** no plano Free. Código em `scripts/supabase-keepalive/`.

```bash
cd scripts/supabase-keepalive
npx wrangler login
npx wrangler secret put SUPABASE_URL        # URL do projeto de DEV
npx wrangler secret put SUPABASE_ANON_KEY   # anon key do projeto de DEV
npx wrangler deploy
```

Roda a cada 3 dias (`wrangler.toml`). Logs: Dashboard → Workers → `microlaudo-supabase-keepalive` → Logs.
