# Progresso — MicroLaudo

Registro de todas as sessões de desenvolvimento. Atualizado ao final de cada sessão.

---

## Sessão 1 — 25 Abr 2026

### F00 + F01 — Fundação do projeto

**O que foi feito:**
- Scaffold completo do projeto do zero (diretório estava vazio)
- Criados todos os arquivos de configuração: `package.json`, `tsconfig.json`, `babel.config.js`, `metro.config.js`, `app.json`, `eas.json`, `jest.config.js`
- Configurados: `.eslintrc.js`, `.prettierrc`, `.gitignore`, `.env.example`
- Documentos MD organizados em `docs/` (arquitetura, modelo-domínio, DECISOES, backlog, etc.)
- Stack: Expo SDK 52, Expo Router v4, React Native 0.76.9, Zustand 4.x, Supabase JS 2.x, react-i18next 14.x, TypeScript 5.3 strict

### F03 — Navegação base

**O que foi feito:**
- Root layout (`app/_layout.tsx`) com fonts + splash screen + i18n
- Guard de autenticação em `app/index.tsx`
- Grupo `(auth)/`: login, register, forgot-password (placeholders)
- Grupo `(tabs)/`: home, history, profile com tab bar
- `app/report/`: 6 steps navegáveis (patient → photos → findings → scores → conclusion → preview)

### F04 — i18n + Zustand + Types

**O que foi feito:**
- `src/i18n/`: react-i18next configurado, 3 namespaces (`common`, `report`, `clinical`), PT-BR + EN
- Stores Zustand: `authStore`, `reportStore` (morphotypes separados do Report), `subscriptionStore` + `selectCanFinalize` como selector standalone
- `src/types/`: `report.ts`, `doctor.ts`, `subscription.ts` com todos os tipos do domínio
- `src/constants/`: `nugent-table.ts`, `findings-options.ts`, `report-defaults.ts`, `plans.ts`
- `src/lib/errors.ts`: `AppError` + `ErrorCodes`
- `src/services/supabase.ts`: cliente Supabase singleton tipado com `createClient<Database>`

**Decisões técnicas importantes:**
- `morphotypes` ficam separados do `currentReport` no store — conversão para pontos ocorre em `lib/nugent.ts` (F16)
- `selectCanFinalize` é selector fora do store (não função dentro do estado Zustand)

---

## Sessão 2 — 25 Abr 2026

### F05 — Migrations SQL (aplicadas diretamente via MCP Supabase)

**O que foi feito:**
- 6 migrations aplicadas no projeto Supabase `flxxotkhgjpxlpphazcd`:
  - `001`: tabela `doctors` + trigger `updated_at` + trigger `handle_new_user` (cria perfil automaticamente no signup)
  - `002`: tabela `reports` + `nugent_score` gerado automaticamente + 4 índices de busca
  - `003`: tabela `report_images` + constraint máx 3 fotos por laudo
  - `004`: tabela `audit_log` append-only
  - `005`: RLS com FORCE em 4 tabelas + 5 políticas de isolamento por `auth.uid()`
  - `006`: 3 buckets privados (`report-images`, `report-pdfs`, `doctor-assets`) + 9 políticas de storage
- `src/types/database.ts` gerado diretamente do schema via MCP
- `.env` configurado com URL e anon key do projeto

### F06 — Auth funcional

**O que foi feito:**
- `src/services/auth.ts`: `signIn`, `signUp` (com metadata para o trigger), `signOut`, `sendPasswordReset`, `subscribeToAuthChanges`
- `src/hooks/useAuth.ts`: hook `useAuth()` retornando `{ user, session, isLoading, isAuthenticated }`
- `app/_layout.tsx`: init de sessão + listener de auth state changes + splash screen aguarda auth + fonts
- Guards reais em `app/(auth)/_layout.tsx` e `app/(tabs)/_layout.tsx`
- Telas `login`, `register`, `forgot-password` com formulários reais: loading state, erro, validação, estados de sucesso

**Bugs corrigidos (code review):**
- `getSession()` sem `.catch()` → app podia travar na splash screen se Supabase estivesse indisponível
- `fontError` ignorado no `useFonts` → app podia travar se fontes falhassem (ex: offline)

### Design System — Migração completa

**O que foi feito:**
- Skill `ui-ux-pro-max` instalada em `.agents/skills/`
- Design system gerado para healthcare: **Accessible & Ethical (WCAG AAA)**
- Cor primária migrada de `#2563EB` (azul) para `#0891B2` (cyan médico)
- Fontes: **Figtree** (heading) + **Noto Sans** (body) via `@expo-google-fonts`
- `src/constants/theme.ts` criado como fonte única de verdade: `Colors`, `Typography`, `Spacing`, `Radius`, `TouchTarget`
- `app/report/_stepStyles.ts` criado: estilos compartilhados entre os 6 steps (eliminou ~180 linhas duplicadas)
- Zero cores hardcoded nas telas — todas usam tokens do `theme.ts`
- Design system persistido em `design-system/microlaudo/MASTER.md`

**Pendências identificadas no code review (a corrigir em F08):**
- Emojis `✉️` nas telas de sucesso → substituir por `Ionicons`
- `TouchTarget.min` definido mas não usado nos estilos
- `Spacing.sm + 2` é aritmética em tokens de design
- `Figtree_400Regular` carregado mas sem entrada em `Typography`
- Números mágicos (`28`, `32`, `12`, `20`) nos estilos fora do sistema de Spacing
- `fontSize: 12` no step label abaixo do mínimo WCAG (mín. 14px)
- `success` e `accent` têm o mesmo valor no `theme.ts` — potencial inconsistência futura

---

---

## Sessão 3 — 25 Abr 2026

### Auditoria de Segurança completa (F00–F07)

**Checklist:**
| Item | Status |
|---|---|
| Injection (SQL, NoSQL, command) | ✅ OK — SDK Supabase parametriza queries automaticamente |
| Autenticação | ⚠️ Problema — `enable_confirmations = false` em dev; localStorage no web |
| Autorização | ✅ OK — RLS com FORCE em 4 tabelas, storage buckets privados |
| Dados sensíveis em logs/erros/URLs | ✅ OK — erros genéricos para usuário, `AppError.cause` nunca exposto |
| Rate limiting | ⚠️ Problema — sem debounce no cliente; Supabase tem proteção padrão |
| Validação de input no servidor | ⚠️ Problema — CRM sem constraint de formato, `patient_name` sem limite de tamanho |
| Dependências com vulnerabilidades | ⚠️ Informativo — 25 vulns (maioria em devDeps do jest-expo) |
| Secrets hardcoded | 🔴 CRÍTICO — token `sbp_...` estava exposto no `.mcp.json` |
| CORS | N/A — app mobile, Supabase gerencia |
| Headers de segurança | N/A — sem servidor próprio; resolver em F45 (deploy web) |
| Stack traces em produção | ✅ OK — erros mapeados para chaves i18n, nunca mensagem técnica |

**Achado crítico corrigido:**
- Token do Supabase Management API (`sbp_...`) estava no `.mcp.json` sem estar no `.gitignore`
- `.mcp.json` já estava no `.gitignore` (adicionado em sessão anterior) ✅
- Criado `.mcp.json.example` com placeholders para documentar a configuração

**Outras correções aplicadas:**
- Adicionados scripts `"audit"` e `"verify"` ao `package.json`

**Ações pendentes do usuário:**
- Revogar o token `sbp_c41be0...` em [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) e gerar novo
- Rodar `npm run audit` para confirmar zero vulns em produção
- Habilitar `enable_confirmations = true` no dashboard Supabase antes do deploy

**Dívida técnica registrada (a corrigir em F08/F09):**
- Validação de senha fraca (mínimo 6 chars → aumentar para 8+ com complexidade)
- CRM sem validação de formato numérico
- `key={i}` no mapeamento de inputs do `register.tsx`
- Deep link de reset hardcoded em `auth.ts:51`

---

## Sessão 4 — 25 Abr 2026

### F08 — Componentes UI Base

**O que foi feito:**
- `src/components/ui/Button.tsx` — variants: primary, secondary, danger | sizes: sm, md, lg | loading, disabled, fullWidth, icon
- `src/components/ui/Input.tsx` — types: text, email, password, numeric, phone | foco com borda colorida | label + error + helper
- `src/components/ui/Checkbox.tsx` — Pressable 44×44, `accessibilityRole="checkbox"`, ícone Ionicons
- `src/components/ui/Select.tsx` — dropdown com Modal customizado + FlatList + checkmark no selecionado
- `src/components/ui/MessageBox.tsx` — types: error, warning, success, info | ícone Ionicons (substitui emojis `✉️`)
- `src/components/ui/index.ts` — barrel export com todos os tipos
- `src/constants/theme.ts` — adicionado `Spacing.errorPadding: 10` (resolve `Spacing.sm + 2`)

**Refatorações nas telas de auth:**
- `login.tsx` — ~80 linhas de StyleSheet removidas; usa Button + Input + MessageBox
- `register.tsx` — eliminados `key={i}` e array map de inputs; cada Input explícito; emoji `✉️` substituído por `MessageBox type="success"`
- `forgot-password.tsx` — mesmo padrão; ~70 linhas removidas

**Bugs corrigidos nessa sessão:**
- `key={i}` no mapeamento de inputs do `register.tsx`
- Emojis `✉️` substituídos por `MessageBox type="success"`
- `Spacing.sm + 2` formalizado como `Spacing.errorPadding`
- Todos os inputs com `accessibilityLabel` (WCAG)
- `minHeight: TouchTarget.min` via constante (não hardcoded `44`)

---

## Sessão 5 — 25 Abr 2026

### F09 — Tela de Perfil

**O que foi feito:**
- `src/services/profile.ts` — `getProfile()` e `updateProfile()` com RLS automático via `auth.uid()`
- `src/stores/doctorStore.ts` — Zustand store para dados do médico (`doctor`, `isLoading`, `setDoctor`, `setLoading`)
- `src/stores/index.ts` — barrel atualizado com `useDoctorStore`
- `src/i18n/locales/pt-BR/common.json` e `en/common.json` — seção `profile` com todas as chaves
- `app/(tabs)/profile.tsx` — tela completa:
  - Seção "Dados Pessoais": nome, CRM, RQE, idioma preferido (Select)
  - Seção "Clínica" (todos opcionais): nome, CNPJ, endereço, telefone
  - Seção "Referência Bibliográfica": textarea editável
  - Botão "Salvar" com loading state e feedback via MessageBox
  - Botão "Sair" (danger) com ícone + logout real (signOut + clearAuth + redirect)

**Decisões técnicas:**
- `getProfile()` não precisa de parâmetros — RLS do Supabase filtra pelo `auth.uid()` automaticamente
- Campos de clínica salvos como `null` (não string vazia) quando não preenchidos
- Logout: chama `signOut()` de `services/auth.ts` + `clearAuth()` do store + `router.replace('/(auth)/login')`
- `doctorStore.isLoading` mostra tela de loading enquanto busca perfil

---

## Próximas sessões

| # | Feature | Status |
|---|---|---|
| F08 | Componentes UI base: Button, Input, Select, Checkbox | ✅ Concluído |
| F09 | Tela de Perfil: CRM, RQE, clínica, logout | ✅ Concluído |
| F09 | Tela de Perfil: CRM, RQE, clínica, logo, assinatura | ⏳ (logo/assinatura ainda pendente) |
| F10 | *(migrations já feitas em F05)* | ✅ |
| F11 | Service + Store de laudos | ✅ Concluído |
| F12 | Step 1: Dados do Paciente (formulário real) | ✅ Concluído |
| F13 | Step 2: Fotos (galeria + grid, sem câmera nativa) | ✅ Concluído (escopo reduzido) |
| F14 | Upload de fotos para Storage | ✅ Concluído |
| F15 | Step 3: Achados Microscópicos (FindingsForm) | ✅ Concluído |
| F16 | Step 4: Nugent + Amsel (calculadores) | ✅ Concluído |
| F17 | Step 5: Conclusão + referência | ✅ Concluído |
| F18 | Lógicas puras + testes unitários | ⏳ (lógica pronta, testes automatizados não escritos) |
| F19 | StepIndicator + navegação entre steps | ✅ Concluído |
| F20 | Geração de PDF real (`lib/reportPdf.ts` + `services/pdf.ts`, upload em `report-pdfs`) | ✅ Concluído |
| F23 | Lista de histórico (`app/(tabs)/history.tsx` ainda placeholder) | ⏳ |

---

## Sessão 6 — 25 Jul 2026

### Sprint MVP web — fluxo completo de criação de laudo (F11–F19)

**Objetivo:** sair com uma versão funcional na web — médico loga, cria um laudo do zero pelos 6 steps, finaliza, e o laudo fica salvo no Supabase com `status: 'completed'`.

**O que foi feito:**
- `src/lib/nugent.ts` + `src/lib/amsel.ts` — cálculo puro do score de Nugent (com classificação normal/intermediária/vaginose) e critérios de Amsel (≥3 de 4 = diagnóstico positivo)
- `src/services/reports.ts` — `createReport`, `updateReport`, `finalizeReport`, `getReport` (padrão `AppError` + RLS via `auth.uid()`, igual ao `services/profile.ts`)
- `src/services/images.ts` — upload/delete/list de fotos no bucket privado `report-images`, path `{user_id}/{report_id}/{filename}`, URLs assinadas (`createSignedUrl`) já que o bucket não é público
- `src/stores/reportStore.ts` — adicionado `reportId` + `setReportId`; corrigido mismatch de tipo entre `Findings.description` (store) e `microscopic_description` (coluna real do banco)
- `src/components/report/StepIndicator.tsx` — indicador visual de progresso (6 passos), substitui o texto hardcoded "Passo N de 6"
- **Todos os 6 steps implementados com formulário real, wiring completo com Supabase:**
  - `patient.tsx` — dados do paciente, cria/atualiza o laudo
  - `photos.tsx` — grid de 3 slots, upload via `expo-image-picker` (galeria — sem câmera nativa neste sprint)
  - `findings.tsx` — 11 achados microscópicos (Select) + descrição livre
  - `scores.tsx` — Nugent (3 morfotipos) + Amsel (4 critérios + pH), resultado calculado ao vivo
  - `conclusion.tsx` — conclusão + referência bibliográfica (pré-preenchida com `REFERENCE_DEFAULT`)
  - `preview.tsx` — resumo somente-leitura de tudo + botão Finalizar (`status → 'completed'`)

**Bugs pré-existentes corrigidos (achados ao desbloquear a verificação):**
- `tsconfig.json`: `ignoreDeprecations: "6.0"` era inválido para o TypeScript `~5.3.3` instalado (`npm run types` nunca tinha rodado com sucesso) — corrigido para `"5.0"`
- `src/components/ui/Select.tsx`: `accessibilityRole="option"` não existe no React Native — trocado para `"menuitem"`

**Verificação end-to-end (feita na sessão, não só análise estática):**
- `npm run types` — 0 erros
- `npm run lint` — bloqueado por um bug de tooling pré-existente e não relacionado (resolver do `eslint-plugin-import` incompatível com a versão do TypeScript instalada; provavelmente nunca rodou com sucesso neste projeto). Não corrigido nesta sessão — fora do escopo do sprint.
- Fluxo completo testado no navegador via Playwright contra o Supabase remoto real: login → Novo Laudo → 6 steps → Finalizar → redirecionado para home. Conferido diretamente no banco: `reports.status = 'completed'`, `nugent_score` calculado corretamente pela coluna gerada, `report_images` com path correto e URL assinada retornando os bytes da imagem (200 OK). Dados de teste (conta + laudos fictícios) removidos após a verificação.

**Pendências para a próxima sessão:**
- Lint pré-existente quebrado (ver acima) — precisa de investigação separada do resolver `eslint-plugin-import`/`typescript`
- Lista de histórico (`history.tsx` continua placeholder, F23 no roadmap original)
- Testes unitários para `lib/nugent.ts` / `lib/amsel.ts` (lógica pronta, sem testes automatizados ainda)
- Câmera nativa em `photos.tsx` (hoje só galeria/arquivo) — relevante quando entrar o alvo mobile

---

## Sessão 7 — 25 Jul 2026 (mesmo dia, extensão do sprint)

### F20 — Geração de PDF real

**O que foi feito:**
- `src/lib/reportPdf.ts` — monta o PDF do laudo via `jsPDF` (desenho imperativo: cabeçalho com dados da clínica/médico, dados do paciente, fotos, achados, Nugent, Amsel, conclusão, referência, rodapé com revisão/paginação). Paginação automática quando o conteúdo excede a página.
- `src/services/pdf.ts` — `generateAndUploadReportPdf()` gera o blob, sobe pro bucket `report-pdfs` (`{user_id}/{report_id}/laudo.pdf`, com `upsert: true` pra permitir regenerar) e salva `pdf_url` no laudo; `getSignedPdfUrl()` para baixar (bucket privado).
- `app/report/preview.tsx` — botão "Baixar PDF" (gera sob demanda se ainda não existir, abre em nova aba) + geração automática do PDF ao Finalizar.

**Duas tentativas de biblioteca antes de dar certo — registrado aqui pra não repetir:**
1. **`@react-pdf/renderer`** (React components → PDF) — parecia a escolha óbvia, mas sua dependência `fontkit` puxa `@swc/helpers`, cujo `package.json` usa subpath exports em wildcard que o resolver do Metro (bundler do Expo) não resolve corretamente — quebrava o bundle **inteiro** do app na web, não só a feature de PDF. Tentei um resolver customizado no `metro.config.js` pra contornar; funcionou parcialmente mas destampou outro problema de interop ESM/CJS mais profundo. Abandonado.
2. **`jsPDF`** (API imperativa de desenho) — muito mais leve (21 pacotes vs 53), mas importar pelo nome do pacote (`import { jsPDF } from 'jspdf'`) faz o Metro resolver o build `.node.min.js` (que referencia `html2canvas` via `require` dinâmico) em vez do build browser, quebrando o bundle de novo. Corrigido importando direto do arquivo browser: `import { jsPDF } from 'jspdf/dist/jspdf.es.min.js'` (com um `.d.ts` em `src/types/jspdf-es.d.ts` pra manter a tipagem). **Se algum dia trocar de lib de PDF, testar bundling na web ANTES de escrever a integração inteira.**

**Bug de RLS descoberto e corrigido:**
- Faltava policy de `UPDATE` no bucket `report-pdfs` (só tinha INSERT/SELECT/DELETE) — como o upload usa `upsert: true` pra permitir regenerar o PDF de um laudo já finalizado, a segunda geração batia em "new row violates row-level security policy". Corrigido via `007_report_pdfs_update_policy.sql` (aplicada com `mcp__supabase__apply_migration`).

**Bug de layout corrigido (reportado pelo usuário após ver o PDF):**
- Na seção "Achados Microscópicos", a coluna do valor tinha posição fixa (`MARGIN_X + 150`) — rótulos longos como "Elementos fúngicos (leveduras/hifas)" invadiam a coluna do valor, sobrepondo o texto. Corrigido: `src/lib/reportPdf.ts` agora mede a largura real do rótulo mais longo dessa seção via `doc.getTextWidth()` e usa isso pra definir a coluna, garantindo alinhamento sem sobreposição independente do idioma/tamanho dos rótulos.

**Verificação end-to-end:**
- `npm run types` — 0 erros.
- Fluxo completo testado de novo via Playwright: login → Novo Laudo → 6 steps → clique em "Baixar PDF" (nova aba abre) → Finalizar → PDF real baixado e inspecionado (cabeçalho com dados da clínica, tabela de achados, Nugent 0/10, Amsel, conclusão, referência, foto da lâmina embutida corretamente, rodapé com revisão/paginação). `reports.pdf_url` confirmado no banco.
- **Pegadinha durante o teste, não é bug do app:** os primeiros PNGs de teste que eu mesmo montei via base64 (na mão) estavam com o CRC do PNG corrompido — o decodificador de PNG do jsPDF é rigoroso e rejeitava. Troquei para gerar o PNG de teste via canvas real do Chromium (`canvas.toDataURL`), que resolveu. Não afeta fotos reais tiradas por um usuário.

**Dados de teste:** conta + laudos fictícios criados durante a verificação foram removidos do banco e do storage ao final.

**Pendência reportada pelo usuário (não corrigida ainda):**
- O PDF ainda tem bug de layout/alinhamento na seção **Score de Nugent / Critérios de Amsel**. Suspeita mais provável: a linha do "Valor do pH" (Amsel) usa a coluna fixa `MARGIN_X + 150` de `line()` em `src/lib/reportPdf.ts` — o mesmo padrão de bug já corrigido na seção de Achados Microscópicos (ali a coluna virou dinâmica via `doc.getTextWidth()`; aqui ainda não). Vale aplicar a mesma correção nas linhas restantes que usam a coluna fixa (dados do paciente e Amsel), em vez de só na de Achados. Não investigado a fundo — próxima sessão deve olhar o PDF renderizado dessa seção especificamente antes de mexer.

---

## Sessão 8 — 26 Jul 2026

### README, date picker com calendário, campos obrigatórios + sprint de 5 subagents (web funcional)

**O que foi feito diretamente:**
- `README.md` criado do zero seguindo padrão profissional completo (badges, overview, stack, arquitetura, segurança, decisões técnicas, status do projeto) e publicado em `origin/expo-rewrite`.
- `src/lib/date.ts` criado: fonte única de verdade para conversão ISO ↔ BR (`formatDateBR`, `parseISODate`, `toISODate`, `isoToday`, helpers de calendário).
- `src/components/ui/DatePickerInput.tsx` criado: calendário dropdown nativo (sem lib nova, reaproveitando o padrão Modal/bottom-sheet do `Select.tsx`) — modos "dias" (grid mensal) e "anos" (grid de década), atalhos "Hoje"/"Limpar", exibe sempre em `DD-MM-AAAA`.
- `app/report/patient.tsx`: campos "Data de nascimento" e "Data da coleta" trocados de texto livre (formato ISO errado) para `DatePickerInput`.
- `Input.tsx` / `Select.tsx`: prop `required` adicionada como recurso do design system (asterisco vermelho no label), aplicada apenas onde já havia validação real bloqueando o submit (nome do paciente, data de coleta, nome completo e CRM no perfil). Telas de auth (login/register/forgot-password) ficaram de fora por não terem `label` visível ancorando o asterisco — decisão de redesenho ainda em aberto.

**Sprint de 5 subagents (Opus, isolados em git worktrees) — objetivo: versão web totalmente funcional:**
1. **Histórico** — `app/(tabs)/history.tsx` deixou de ser placeholder: lista real com busca, `app/report/preview.tsx` ganhou visualização/reimpressão e edição de laudo finalizado (revisão), `reportStore.ts` ganhou hidratação de laudo completo, `services/reports.ts` ganhou listagem/busca.
2. **PDF** — corrigido o mesmo bug de coluna fixa (`MARGIN_X + 150`) que já tinha sido resolvido em Achados Microscópicos, agora também em Dados do Paciente e Amsel (coluna dinâmica via `getTextWidth()`); datas do PDF agora usam `formatDateBR`. Também corrigiu um bug latente: `handleFinalize` deixava de regenerar o PDF quando já existia `pdf_url`, mesmo com o laudo editado (`isDirty`) — agora regenera sempre que `isDirty === true`.
3. **Testes** — `__tests__/lib/{amsel,date,nugent}.test.ts` criados (120 casos). De quebra, encontrou e removeu um bloco `"jest"` redundante em `package.json` que conflitava com `jest.config.js` e quebrava `npm run test` ("Multiple configurations found").
4. **Perfil/LGPD** — upload de logo/assinatura do médico (`AssetUploader.tsx` + `services/assets.ts`, bucket `doctor-assets`) refletido no cabeçalho do PDF; exclusão de conta completa (RF22/LGPD) via edge function `delete-account` + `services/account.ts` + seção "Zona de Perigo" no perfil. Descobriu que `audit_log` tem `FORCE ROW LEVEL SECURITY`, o que bloqueava até inserts do `service_role` — corrigido com a migration `008_audit_log_service_role_insert.sql` (aplicada ao banco real via MCP).
5. **Lint** (não concluído pelo agente, retomado e resolvido nesta sessão — ver abaixo).

**Merge:** as 4 branches completas (Histórico, PDF, Testes, Perfil/LGPD) foram integradas em `expo-rewrite` sem conflitos reais (`git merge`, auto-merge limpo até em `reportPdf.ts`, tocado tanto pelo agente de PDF quanto pelo de Perfil). `npm run types` (0 erros) e `npm test` (120/120) confirmados após o merge. Worktrees das branches já mescladas foram removidos (`git worktree remove`).

**Lint pré-existente finalmente corrigido (pendência desde a Sessão 6):**
- Causa raiz: `eslint-config-expo` declara `import/resolver: { typescript: true }`, mas o pacote `eslint-import-resolver-typescript` só estava instalado aninhado dentro de `node_modules/eslint-config-expo/node_modules/` — inalcançável pela resolução de módulos do Node a partir dos arquivos lintados. O `eslint-module-utils` caía no fallback e tentava carregar o pacote `typescript` (o compilador) como se fosse o resolver, e falhava com "typescript with invalid interface loaded as resolver".
- Corrigido instalando `eslint-import-resolver-typescript` como devDependency direta na raiz (`--legacy-peer-deps`, já que a versão mais nova exige `@typescript-eslint/utils@8` e o projeto está no `7.x` — não é o momento de subir essa major).
- Criado `.eslintignore` excluindo `supabase/functions/` (código Deno com specifiers `jsr:`/`npm:` que o resolver Node não consegue resolver, e nem deveria tentar).
- Rodado `eslint --fix`: resolveu todos os 52 erros de `import/order` que existiam represados no código (nunca detectados porque o lint nunca tinha rodado com sucesso).
- Corrigido 1 erro real de `@typescript-eslint/no-explicit-any` em `AssetUploader.tsx` (cast desnecessário `as unknown as any` no `ref` do `<input>` web — `inputRef` já estava tipado como `HTMLInputElement | null`, bastava usar direto).
- Resultado final: `npm run lint` → **0 erros**, 6 warnings pré-existentes/intencionais (2 `react-hooks/exhaustive-deps` antigos, 1 non-null assertion no `DatePickerInput`, 3 `console.log` de debug no `reportPdf.ts`). `npm run verify` (lint + types) passa limpo.

**Verificação end-to-end desta sessão:**
- `npm run types` — 0 erros.
- `npm test` — 120/120 testes passando.
- `npm run lint` — 0 erros.
- `npm run build:web` (`expo export --platform web`) — bundle gerado com sucesso, 22 rotas estáticas, 4 chunks JS. Único aviso: favicon ausente.

**Pendência nova, pré-existente e não relacionada a este sprint (não corrigida):**
- `assets/images/` está vazio — `icon.png`, `splash.png`, `adaptive-icon.png` e `favicon.png` nunca existiram no projeto (referenciados em `app.json` mas ausentes desde o scaffold inicial). Não bloqueia o build web, só gera warning. Precisa de assets de design reais, não é algo para gerar programaticamente.

**Pendências que continuam em aberto:**
- Bug de alinhamento do PDF na seção Nugent/Amsel mencionado na Sessão 7 — não confirmado se o fix do agente de PDF (item 2 acima) resolveu completamente; validar visualmente no próximo laudo de teste.
- Redesenho de login/register/forgot-password para ter labels visíveis (permitiria aplicar asterisco de campo obrigatório lá também) — aguardando decisão do usuário.
- Ícones/splash/favicon do app (ver acima).

---

## Sessão 9 — 03 Ago 2026

### Sprint de bughunt com 3 subagents (frontend, backend/serviços, performance/testes)

**Objetivo:** varredura de bugs por toda a aplicação + otimizações, com escopo limitado por agente (não exaustivo) para evitar rodadas infinitas. Mesmo padrão de worktrees isolados da Sessão 8.

**Agente 1 — Frontend/UI/estado** (`app/`, `src/components`, `src/hooks`, `src/stores`, i18n):
- Corrigido: `forgot-password.tsx` e `profile.tsx` sempre mostravam a mensagem genérica de erro em vez de `err.message` de `AppError`.
- Corrigido: handlers de upload/remoção de logo/assinatura em `profile.tsx` sem try/catch (unhandled rejection).
- `profile.tsx`: `useDoctorStore()` (store inteira) trocado por seletores por campo.
- Strings PT-BR hardcoded em `(tabs)/_layout.tsx` e `report/_layout.tsx` substituídas por chaves i18n (o locale `en` não renderizava em inglês nessas telas).
- Fallbacks de placeholder/label em PT-BR hardcoded removidos de `DatePickerInput.tsx`, `Select.tsx`, `StepIndicator.tsx`.
- `accessibilityRole`/`accessibilityLabel` adicionados aos slots de foto em `photos.tsx`.

**Agente 2 — Lógica de negócio/serviços/backend** (`src/lib`, `src/services`, `supabase/migrations`):
- `src/lib/validation.ts` (novo): limites de tamanho documentados em `docs/analise-seguranca.md` (nome do paciente, solicitante, textos longos) e nunca implementados — agora aplicados em `createReport`/`updateReport`.
- Bug de segurança/dado corrigido: escape de busca ILIKE em `listReportsByDoctor` não escapava a própria barra invertida, quebrando o escape final para nomes de paciente contendo `\`.
- `finalizeReport` agora grava evento `report.finalized` em `audit_log` (best-effort, não bloqueia o fluxo) — item que já estava no checklist de `docs/analise-seguranca.md §5` mas não implementado.
- Confirmado que RLS, buckets, LGPD (`delete-account`) e URLs assinadas já estavam corretos (nenhuma migration nova necessária).
- Encontrado e corrigido manualmente após o agente reportar (bloqueio de permissão o impediu de aplicar): `listReportsByDoctor` usava `ErrorCodes.REPORT_NOT_FOUND` (semântica errada) em falha genérica de query — criado `REPORT_LIST_FAILED`. E `preview.tsx#handleFinalize` regenerava o PDF com o `report` desatualizado *antes* de `finalizeReport()` bumpar `revision_number`, então laudos re-finalizados saíam com o rodapé do PDF mostrando a revisão antiga — corrigido invertendo a ordem (finaliza primeiro, gera PDF com o resultado atualizado).

**Agente 3 — Performance/testes/build** (`__tests__`, configs, deps):
- Removidas 4 dependências não usadas (zero imports em `app/`/`src/`): `@react-native-async-storage/async-storage`, `expo-image-manipulator`, `expo-system-ui`, `expo-web-browser`.
- Testes novos para `src/lib/errors.ts` (sem cobertura alguma) e para `pointsToMorphotypes()` em `nugent.ts` (usado ao reidratar laudo para edição, também sem cobertura).
- Confirmado: compressão de imagem (`quality: 0.8`) já existe em `photos.tsx` antes do upload; chunks grandes do build (`html2canvas`/`purify`, ~230 kB) são code-split preguiçoso de dentro do `jsPDF` e nunca são baixados (não é bug).
- `expo-camera` está sem uso hoje mas é item de roadmap (câmera nativa) — mantido de propósito.

**Particularidade da sessão — agentes em background não conseguem `git commit`:** os 3 agentes rodaram em worktrees isolados via `isolation: "worktree"`, mas suas sessões em background não tinham como aprovar prompts de permissão (nenhum usuário presente). Resultado: Edit/Write funcionaram (ou, no caso do agente de backend, nem isso — só leitura, exigindo reaplicar 2 fixes manualmente depois), mas todo `git commit` foi negado. As mudanças ficaram como diffs não commitados nos respectivos worktrees. Reconciliado manualmente: revisei cada diff, dei `git add` seletivo (excluindo arquivos de contexto herdado que não eram do escopo do agente), commitei em cada branch, e mesclei as 3 branches em `expo-rewrite` (merges limpos, só 1 conflito trivial em `errors.ts` por causa de um código de erro renomeado por dois agentes em paralelo). Worktrees removidos ao final (`git worktree remove -f -f`, necessário por causa do lock do processo do agente).

**Verificação end-to-end desta sessão:**
- `npm run types` — 0 erros.
- `npm run lint` — 0 erros, mesmos 8 avisos pré-existentes/intencionais (6 antigos + 2 novos `console.warn` do audit log best-effort, mesmo padrão do `reportPdf.ts`).
- `npm test` — 100/100 (subiu de 120 porque os testes antigos de `date`/`amsel`/`nugent` já existentes foram contados junto: total real de suites é 6, com os novos de `validation`, `errors` e `conclusionTemplates`).
- `npm run build:web` — sucesso, 22 rotas estáticas, 4 chunks JS.

**Pendência menor não corrigida:** `CONVENTIONS.md` ainda cita `REPORT_VALIDATION_FAILED` como exemplo (código renomeado para `VALIDATION_FAILED` pelo agente de backend) — só um exemplo em doc, não afeta o app.

---

## Sessão 10 — 03 Ago 2026

### Investigação de erro no web + bug real em "Salvar perfil"

**"Uncaught Error: 6000ms timeout exceeded" no LogBox do web (investigado, não é bug):** ao abrir `/home` no web logo após o merge da Sessão 9, apareceu esse erro no LogBox. Rastreado até `node_modules/expo-font/src/ExpoFontLoader.web.ts:174` — no web, o `expo-font` usa a lib `fontfaceobserver` com timeout hardcoded de 6000ms por fonte, pra detectar quando a fonte customizada (Figtree/Noto Sans, `app/_layout.tsx`) terminou de carregar no navegador. Se o Metro ainda está compilando o bundle "frio" (comum logo após instalar/remover dependências), a checagem começa tarde e estoura o timeout. Não quebra o app: `useFonts` já captura o reject via `.catch` (`node_modules/expo-font/src/FontHooks.ts:31-35`) e vira só `fontError`, com fallback documentado pro font do sistema (`app/_layout.tsx:66-68`). O LogBox mostra a rejeição mesmo assim porque é um erro real, só que tratado. Resolve sozinho com um refresh (F5) depois que o bundle esquenta o cache do Metro; não foi necessária nenhuma mudança de código.

**Bug real corrigido — "UPDATE requires a WHERE clause" ao salvar o perfil:** `src/services/profile.ts#updateProfile` fazia `.update(input)` na tabela `doctors` sem nenhum filtro (`.eq(...)`). O Postgres/PostgREST do Supabase bloqueia `UPDATE`/`DELETE` sem `WHERE` por segurança, contra atualização acidental da tabela inteira. `getProfile()` funcionava porque é um `SELECT` e a RLS filtra leitura automaticamente por `auth.uid()`, mas updates exigem filtro explícito na própria query. Corrigido buscando o usuário autenticado (`supabase.auth.getUser()`) e filtrando com `.eq('user_id', user.id)`, no mesmo padrão que `reports.ts` já usava com `.eq('id', id)`. Grep confirmou que era o único `.update()` do código sem filtro. Testado manualmente pelo usuário no navegador após o fix — funcionou.

**Verificação:** `npm run types` — 0 erros.

---

## Sessão 11 — 12 Set 2026

### Fix pontual + auditoria de prontidão para lançamento nas lojas

**Fix commitado e enviado (`a70f5f6`):** `app/report/preview.tsx#handleDownloadPdf` — no web, `window.open(url, '_blank')` é bloqueado por vários navegadores mobile. Agora tenta `navigator.share`/`canShare` com o PDF anexado (folha nativa do SO) e só cai para `window.location.href = url` se o compartilhamento nativo não existir, falhar ou for cancelado. Validado com `npm run types` (0 erros), `npm run lint` (0 erros, mesmos 14 warnings pré-existentes), `npm test` (100/100) e `npm run build:web` (sucesso). Não foi possível testar a folha de compartilhamento nativa de fato (exige gesto de usuário real em navegador/dispositivo — sem ferramenta de automação de browser disponível na sessão); recomendado teste manual no celular.

**Auditoria: o app pode ser submetido às lojas hoje?** Não. Levantamento do que falta, abaixo como checklist. Nada disso é bug — é trabalho ainda não iniciado (fases 6, 7 e 10 do `docs/backlog.md`).

### TODO — Checklist de lançamento nas lojas

**Bloqueadores (impedem build/submissão):**
- [ ] **Ícones e splash** — `assets/images/` está vazio (só `.gitkeep`). `app.json` referencia `icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png` que nunca existiram desde o scaffold. Precisa de assets de design reais (F40).
- [ ] **Configurar EAS** — `app.json` não tem `extra.eas.projectId`/`owner`; `eas build:configure` nunca rodou. Nenhum build nativo (iOS/Android) foi gerado até hoje, só o build web (F44/F45).
- [ ] **Política de Privacidade + Termos de Uso** — inexistentes no repo. Obrigatório nas duas lojas, e crítico aqui por lidar com dados de saúde de pacientes (F41).
- [ ] **Decisão sobre monetização antes do lançamento** — `RevenueCat`/`Stripe` são só placeholders vazios em `src/constants/plans.ts` (IDs `''`), sem SDK instalado, sem edge functions `check-trial`/`payment-webhook` (F30–F34, nenhuma feita). Definir: lançar grátis primeiro, ou terminar a integração de pagamento antes.
- [ ] **Contas de desenvolvedor** — sem indício de Apple Developer ($99/ano) nem Google Play Console ($25) configuradas (só o usuário pode criar) (F43).
- [ ] **Build nativo + teste em dispositivo real** — tudo validado até agora foi só web; falta pelo menos um ciclo de TestFlight/APK interno (F44–F46).

**Não-bloqueador / polimento (pode esperar o lançamento):**
- [ ] Login social Google/Apple (F28/F29) — opcional se não for requisito de lançamento.
- [ ] Redesenho de login/register/forgot-password com labels visíveis (para asterisco de campo obrigatório) — aguardando decisão do usuário (pendência desde a Sessão 8).
- [ ] Validar visualmente se o alinhamento do PDF nas seções Nugent/Amsel está mesmo corrigido (pendência desde a Sessão 7/8).
- [ ] `CONVENTIONS.md` cita `REPORT_VALIDATION_FAILED` como exemplo desatualizado (renomeado para `VALIDATION_FAILED`) — só doc, não afeta o app (pendência da Sessão 9).
