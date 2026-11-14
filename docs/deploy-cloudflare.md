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

## 3. Domínio e Auth (👤) — feito em 13/11/2026

Domínio: **`microlaudo.com`**, registrado na Cloudflare Registrar em nome da IGARATECH
(renovação automática ligada). DNS na própria Cloudflare: `CNAME @` e `CNAME www` →
`microlaudo.pages.dev`, ambos *Proxied*. O `microlaudo.pages.dev` continua no ar (com `noindex`).

1. Pages → **Custom domains**: `microlaudo.com` e `www.microlaudo.com`. Como o domínio está na
   mesma conta, a Cloudflare cria os CNAMEs sozinha; não criar à mão. Se o domínio raiz ficar em
   "Verification is in undefined status" com o site já respondendo, é falha do painel: remover e
   adicionar de novo.
2. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://microlaudo.com`.
   - **Redirect URLs**: `https://microlaudo.com`, `https://microlaudo.com/reset-password`,
     `https://www.microlaudo.com`, `https://www.microlaudo.com/reset-password`,
     `https://microlaudo.pages.dev`, `https://microlaudo.pages.dev/reset-password` e
     `microlaudo://reset-password` (app nativo).
3. Google Cloud Console → credencial OAuth → **Authorized JavaScript origins**:
   `https://microlaudo.com` e `https://www.microlaudo.com`. (O redirect do Google continua sendo
   o callback do Supabase: `https://okkemcrsrngahyzaddkr.supabase.co/auth/v1/callback`.)

Sem o passo 2, o login (e-mail de confirmação, recuperação de senha e Google) volta para a URL
antiga.

## 3a. E-mail do domínio (👤) — feito em 13/11/2026

- **Envio (Brevo):** domínio `microlaudo.com` autenticado no Brevo (código `brevo-code` no TXT
  da raiz, DKIM `brevo1/brevo2._domainkey`, DMARC `p=none`). É o SMTP do Supabase Auth
  (`smtp-relay.brevo.com:587`); o remetente é um endereço `@microlaudo.com`.
- **Recebimento (Cloudflare Email Routing):** MX `route1/2/3.mx.cloudflare.net`, SPF
  `v=spf1 include:_spf.mx.cloudflare.net ~all` e DKIM `cf2024-1._domainkey`, criados pelo
  próprio onboarding. Regras: `contato@` e `privacidade@` → `microlaudo@gmail.com`. Catch-all
  desligado (atrai spam).
- Só pode existir **um** registro SPF. Se algum serviço futuro pedir SPF, juntar no mesmo:
  `v=spf1 include:_spf.mx.cloudflare.net include:<outro> ~all`.

## 3b. Turnstile — CAPTCHA no login, cadastro e reset (👤, só web)

**A ordem importa:** o site no ar precisa já mandar o token antes de o Supabase passar a exigir.
Ao contrário, ninguém consegue entrar.

1. Cloudflare Dashboard → **Turnstile** → **Add widget**: modo *Managed*; hostnames = `microlaudo.com`,
   `www.microlaudo.com`, `microlaudo.pages.dev` e `localhost` (para dev contra produção). Anotar *site key* e *secret key*.
2. Pages → Settings → Environment variables (*Production* e *Preview*):
   `EXPO_PUBLIC_TURNSTILE_SITE_KEY` = site key → **novo deploy**. Conferir que o widget aparece no
   login, cadastro e "Esqueci minha senha".
3. Só então: Supabase → **Authentication → Attack Protection → Enable Captcha protection** →
   provedor *Turnstile* → colar a **secret key** (nunca no repositório nem no Pages).
4. Testar login, cadastro e reset no domínio publicado.

Com o CAPTCHA ligado no Supabase:
- **App nativo para de autenticar** (login/cadastro/reset exigem token e o nativo não tem widget).
  Antes de publicar builds nativos: widget do Turnstile numa WebView em `Turnstile.tsx`.
- Dev local precisa da site key real (com `localhost` nos hostnames do widget). Para testar só a
  renderização com o CAPTCHA desligado, a chave de teste `1x00000000000000000000AA` sempre aprova.
- Login social (Google/Facebook) e troca de senha pelo link não pedem CAPTCHA.
- Os erros de console vindos do iframe `challenges.cloudflare.com` (Permissions-Policy,
  TrustedScript, sandbox `about:blank`) são internos do Turnstile e não são violações da nossa CSP.

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
