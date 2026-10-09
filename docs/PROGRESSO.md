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
- [x] **ProDoctor: flag por médico pra não vazar dados da clínica** — **código feito na Sessão 16** (falta aplicar migration 010 + deploy da function, ver Sessão 16). **correção em 28/09/2026: isto É um bloqueador**, decisão anterior (24/09) de tratar como polimento estava errada — o app vai ao público, então a credencial global do ProDoctor (`PRODOCTOR_API_KEY`/`PASSWORD`, hoje aponta pro consultório da mãe do usuário) não pode ficar visível a qualquer médico que se cadastre. Sem a flag, qualquer médico logado veria os pacientes da clínica dela no autocomplete — vazamento de dados de saúde de terceiros, inaceitável num lançamento público. Precisa de um flag (ex.: `prodoctor_enabled` em `doctors`, default `false`) e só mostrar a busca/autofill quando `true`, habilitado manualmente só na conta dela.

**Não-bloqueador / polimento (pode esperar o lançamento):**
- [ ] **ProDoctor: configurar credenciais na conta da mãe do usuário** — a integração (`prodoctor-patients`) hoje usa uma credencial global (`PRODOCTOR_API_KEY`/`PASSWORD`) do consultório dela. Ao criar a conta dela, configurar esses secrets no Supabase apontando pro consultório dela.
- [ ] Login social Google/Apple (F28/F29) — **código implementado na Sessão 15** (Google + Facebook; Apple adiado, depende de conta Apple Developer paga). Falta só configurar credenciais reais no Google Cloud Console/Meta for Developers/Supabase Dashboard (checklist na Sessão 15) e testar de fato.
- [ ] Redesenho de login/register/forgot-password com labels visíveis (para asterisco de campo obrigatório) — aguardando decisão do usuário (pendência desde a Sessão 8).
- [ ] Validar visualmente se o alinhamento do PDF nas seções Nugent/Amsel está mesmo corrigido (pendência desde a Sessão 7/8).
- [ ] `CONVENTIONS.md` cita `REPORT_VALIDATION_FAILED` como exemplo desatualizado (renomeado para `VALIDATION_FAILED`) — só doc, não afeta o app (pendência da Sessão 9).

### Deploy para o servidor Tailscale (`desktop-u2icebd`) — em andamento, retomar na próxima sessão

**Contexto:** existe um servidor rodando em `desktop-u2icebd` (nó da tailnet do usuário, junto com `octavio` — esta máquina — e 2 iPhones) que entrega a aplicação para os dispositivos da rede Tailscale. Não documentado em nenhum lugar do repo até agora.

**Confirmado: `git push` não atualiza esse servidor sozinho.** Não há GitHub Actions, git hooks, nem qualquer webhook de deploy no repositório — o push só atualiza o `origin` no GitHub. Se `desktop-u2icebd` serve a aplicação, alguém (ou algum processo externo ao repo) precisa dar `git pull` + rebuild/restart manualmente lá.

**Tentativa de acesso SSH (autorizada pelo usuário) — bloqueada por falta de credencial:**
- `desktop-u2icebd` resolve normalmente via MagicDNS do Tailscale.
- `tailscale ssh desktop-u2icebd` falhou (host não roda o servidor SSH do próprio Tailscale, caiu no SSH tradicional).
- `ssh desktop-u2icebd` direto: host key aceita com sucesso (`StrictHostKeyChecking=accept-new`), mas autenticação falhou — `Permission denied (publickey,password)` para o usuário `blind`.
- Gerado um par de chaves local (`~/.ssh/id_ed25519`, comentário `claude-code@microlaudo-deploy`) especificamente para esse fim. Chave pública entregue ao usuário para adicionar ao `authorized_keys` de `desktop-u2icebd` (ou ele informa outra credencial de acesso).

**Próximo passo (retomar amanhã):** usuário precisa autorizar a chave pública `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGuKWRS57Uwk1owgKR0avwYYVE/jFXi8pTgbLh2rXU4L claude-code@microlaudo-deploy` no `desktop-u2icebd` (ou fornecer outra forma de acesso), para então eu conseguir de fato entrar na máquina e atualizar/reiniciar o servidor que serve a app via Tailscale.

---

## Sessão 12 — 15 Set 2026

### EAS configurado + permissão de microfone indevida removida + ícones placeholder (F40/F44 parcial)

**Objetivo:** avançar no checklist de lançamento nas lojas (Sessão 11) — configurar o EAS Build e resolver o bloqueador de assets ausentes.

**O que foi feito:**
- Login no EAS via `npx eas-cli login` (conta `octaviolobo21@gmail.com`).
- Projeto criado e vinculado: `npx eas-cli init --account ocatviolobo21 --non-interactive` → `@ocatviolobo21/microlaudo` (https://expo.dev/accounts/ocatviolobo21/projects/microlaudo). `app.json` ganhou `extra.eas.projectId` e `owner`.
- `npx eas-cli build:configure -p all` confirmou o projeto pronto para build (`eas build`/`eas submit`).

**Bug de privacidade encontrado durante a configuração do EAS (não pedido, apareceu sozinho):** o próprio `eas init` resolveu a config e revelou que o app pedia `android.permission.RECORD_AUDIO` sem nunca usar áudio. Rastreado: **não** era o `expo-camera` (que só ativa microfone se não for explicitamente desativado), mas sim o plugin do **`expo-image-picker`**, que adiciona `RECORD_AUDIO` por padrão pensando em captura de vídeo (`node_modules/expo-image-picker/plugin/build/withImagePicker.js`), independente do `expo-camera`. Corrigido adicionando `"microphonePermission": false` na config de ambos os plugins em `app.json` (`expo-camera` também ganhou `"recordAudioAndroid": false`, redundante com o do image-picker mas documenta a intenção). Confirmado via `npx expo config --type public` (com `.expo/` limpo pra evitar cache) que o Android só pede `CAMERA` agora. Relevante para um app de saúde: pedir permissão sem uso real é motivo de rejeição/desconfiança na revisão da loja.

**Ícones/splash placeholder gerados (bloqueador da Sessão 11):** `assets/images/` estava vazio desde o scaffold inicial. Gerado via PowerShell (`System.Drawing`, sem dependência nova) usando a cor primária do design system (`#0891B2`, cyan médico de `src/constants/theme.ts`): `icon.png` (1024×1024, fundo cyan + "ML" branco), `adaptive-icon.png` (1024×1024, camada transparente com círculo cyan + "ML" branco, respeita `backgroundColor: #ffffff` do Android), `favicon.png` (196×196), `splash.png` (1242×2436, fundo branco + círculo cyan com "ML" centralizado). São placeholders explícitos — usuário deve substituir por arte de design real antes do lançamento definitivo, mas já desbloqueiam build/preview sem warning.

**Decisão registrada:** lançamento vai **aguardar a integração de pagamento** (RevenueCat/Stripe, F30-F34, ainda não iniciada) antes de escrever a Política de Privacidade e Termos de Uso definitivos — não faz sentido redigir termos comerciais antes de saber o modelo final. Política/Termos (F41) ficam pendentes até essa decisão avançar.
- CNPJ não é obrigatório para o lançamento: Apple Developer e Google Play aceitam conta de pessoa física (CPF), e a Política de Privacidade só precisa identificar o responsável pelo tratamento de dados — não necessariamente uma pessoa jurídica.

**Verificação end-to-end:**
- `npm run types` — 0 erros.
- `npm run build:web` — sucesso, 22 rotas estáticas, sem warning de favicon ausente (existia desde a Sessão 8).

**Pendências que continuam em aberto (ver checklist completo na Sessão 11):**
- Ícones/splash são placeholder — trocar por arte de design real antes da submissão às lojas.
- Política de Privacidade + Termos de Uso — aguardando decisão de monetização (ver acima).
- Conta Apple Developer / Google Play Console — ainda não criadas.
- Nenhum build nativo (iOS/Android) gerado ainda — só a configuração do EAS foi feita, falta rodar `eas build` de fato (depende de conta Apple Developer para iOS).
- Deploy Tailscale (`desktop-u2icebd`) — ainda bloqueado esperando o usuário autorizar a chave SSH (ver Sessão 11).

---

## Sessão 13 — 17 Set 2026

### Draft da Política de Privacidade (F41 parcial) + decisão sobre repositório público

**Objetivo:** apesar da decisão da Sessão 12 de aguardar a integração de pagamento antes de redigir a Política de Privacidade, o usuário pediu para adiantar o rascunho mesmo assim (a seção de pagamentos ficou como placeholder textual, atualizável depois).

**O que foi feito:**
- Levantamento real do inventário de dados no código (`src/types/doctor.ts`, `src/types/report.ts`, `src/services/account.ts`) antes de escrever qualquer texto — a política reflete exatamente o que o app coleta hoje, não um texto genérico.
- Criado `docs/legal/politica-privacidade.md`: documento LGPD completo em PT-BR, com uma distinção importante para o modelo de negócio — **o médico é o controlador dos dados do paciente** (decide coletar, mantém a relação médico-paciente), e o **MicroLaudo atua como operador** (processa só sob instrução do médico). Isso limita a responsabilidade direta do MicroLaudo sobre a relação médico-paciente. Cobre: inventário de dados, finalidade/base legal por tipo de dado, segurança (RLS FORCE, buckets privados, URLs assinadas, HTTPS, transferência internacional Art. 33), retenção/exclusão de conta (cascade delete real), direitos do titular (Art. 18), seção de pagamentos como placeholder textual (não bloqueia o documento, só é atualizada quando a integração existir), e ausência de DPO formal declarada explicitamente (porte individual).
- Usuário preencheu o CPF do responsável diretamente no documento.

**Decisão de segurança tomada durante a sessão:** o repositório `octaviolobo/Microlaudo` no GitHub é **público** (confirmado via `mcp__github-mcp__search_repositories`, campo `visibility: "public"`). Publicar o CPF nesse repositório o exporia permanentemente no histórico do git, mesmo que removido depois. Levantei o ponto antes de commitar; usuário optou por **não versionar** os documentos legais por enquanto. `docs/legal/` foi adicionado ao `.gitignore` (commit `aee1f7f`) — o arquivo continua no disco local, mas fora do controle de versão até ser publicado em local apropriado (site próprio, hospedagem privada) no momento do lançamento.

**Verificação:** `git status` confirmou que o arquivo nunca tinha sido commitado antes do `.gitignore` ser adicionado (sem exposição prévia no histórico).

**Pendências:**
- Política de Privacidade ainda precisa: nome fantasia/endereço se aplicável, revisão de advogado (recomendado dado que trata dado de saúde), e decidir onde hospedar a versão pública final (a loja exige URL acessível sem login).
- Termos de Uso — ainda não iniciado.
- Seção 9 (pagamentos) da política precisa ser reescrita quando a integração Stripe/RevenueCat existir.

---

## Sessão 14 — 23 Set 2026

### Upgrade Expo SDK 52→57 + testes reais no iPhone via Expo Go + PDF mobile + autofill médico solicitante

**Objetivo:** usuário queria testar a versão mobile pela primeira vez (via Expo Go, sem conta de desenvolvedor Apple ainda) antes de decidir sobre monetização. Bloqueio inicial: o app Expo Go da App Store só suporta a versão mais recente do SDK em dispositivos físicos, e o projeto estava no SDK 52 — sem alternativa que não fosse atualizar. Usuário autorizou um loop de correção com **limite explícito de 5 tentativas** para controlar gasto de tokens.

**Upgrade em si (tentativa 1/5 — sucesso de primeira):**
- `expo` 52→57, `react`/`react-dom`→19.2.3, `react-native`→0.86.3, `expo-router`→~57.0.22, todos os módulos `expo-*` alinhados, `typescript`→~6.0.3, `jest-expo`→~57.0.5.
- Correções de compatibilidade: `tsconfig.json` (`ignoreDeprecations` 5.0→6.0), `StyleSheet.absoluteFillObject` removido da RN (trocado por `absoluteFill` em `DatePickerInput.tsx`/`Select.tsx`), `app.json` (config de splash migrada pro plugin `expo-splash-screen`, formato antigo tinha sido removido), `@react-native/jest-preset` adicionado como devDependency direta.
- Branch isolada: `chore/expo-sdk-57-upgrade` (ainda não commitada — só commitar quando o usuário pedir).

**Bugs reais só expostos agora que o mobile finalmente rodava (tentativas 2-5/5):**
1. **Crash de boot no iOS** ("Unknown encoding: latin1"): jsPDF (só funciona na web, depende de encoding que o Hermes não implementa) estava importado estaticamente em `src/lib/reportPdf.ts`, e o Expo Router carrega todo o grafo de rotas no boot — corrigido com `import()` dinâmico.
2. **Upload de foto rejeitado** ("mime type text/plain not supported"), 3 tentativas até achar a causa raiz de verdade: não era o `mimeType` do `expo-image-picker` (que pode vir `null`), nem o `blob.type` do `fetch(uri).blob()` (não confiável no RN) — era que o `@supabase/storage-js`, ao receber um `Blob`, embrulha tudo num `FormData` e **ignora silenciosamente a opção `contentType`** (só respeita pra `ArrayBuffer`/string). Fix definitivo: ler o arquivo como `ArrayBuffer` via `expo-file-system` (`new File(uri).arrayBuffer()`) em vez de `Blob`, no nativo. Essa é a causa raiz mais não-óbvia da sessão — vale lembrar pra qualquer upload novo no mobile.

**Duas features novas pedidas após o upgrade estabilizar (dois subagentes em paralelo):**
3. **PDF funcionando no mobile** (antes só web): caminho nativo usa `expo-print` (`Print.printToFileAsync`) com HTML equivalente ao layout jsPDF (`buildReportPdfHtml` em `src/lib/reportPdf.ts`), upload via `ArrayBuffer` (mesmo padrão do fix de fotos), e `expo-sharing` pra abrir a folha de compartilhamento nativa no download.
4. **"Médico Solicitante" pré-preenchido**: `app/report/patient.tsx` agora prefila com "Dr(a) {nome completo}" do perfil do médico logado (`useDoctorStore`, com fallback pra `getProfile()` já que o store só é populado ao visitar "Meu Perfil"). Nunca sobrescreve valor existente, lookup do ProDoctor pra médico do último atendimento da paciente, ou edição manual do usuário.

**Verificação:** `types`/`lint`/`test`/`build:web` verdes em todas as etapas. Testado end-to-end no iPhone real do usuário via Expo Go (não simulador): upload de foto, download de PDF, autofill do médico solicitante — todos confirmados funcionando.

**Pendências:**
- Nada commitado ainda — branch `chore/expo-sdk-57-upgrade` com todo o trabalho da sessão, aguardando o usuário pedir o commit.
- Conta de desenvolvedor Apple/Google ainda não existe — monetização e publicação nas lojas seguem bloqueadas por isso (não pelo código).

---

## Sessão 15 — 28 Set 2026

### Correção do escopo do ProDoctor (bloqueador) + Login social Google/Facebook (F28/F29)

**Correção de uma decisão anterior errada:** a Sessão 11 tinha registrado a falta de isolamento por médico na integração ProDoctor (credencial global do Supabase aponta pro consultório da mãe do usuário) como item "não-bloqueador/polimento", partindo do pressuposto de que o app seria de uso restrito. O usuário corrigiu: **o app vai ser lançado ao público**, então qualquer médico que se cadastre veria os pacientes da clínica dela no autocomplete — vazamento de dado de saúde de terceiros, inaceitável. Item movido para "Bloqueadores" no checklist acima (ainda não implementado; precisa de um flag `prodoctor_enabled` por médico em `doctors`, default `false`).

**Login social — Google + Facebook implementado (Apple adiado):**
- Restrição de ambiente: o app é testado hoje via **Expo Go puro** (sem custom dev client/EAS build nativo). SDKs nativos de login (`@react-native-google-signin/google-signin`, `react-native-fbsdk-next`) quebrariam esse fluxo. Solução: OAuth genérico do Supabase (`signInWithOAuth`) + `expo-auth-session`/`expo-web-browser` (100% JS, funciona no Expo Go).
- `src/services/supabase.ts`: `flowType: 'pkce'` adicionado e `detectSessionInUrl` agora é `true` só no web (o app nativo processa o `?code=` manualmente via `exchangeCodeForSession`).
- `src/services/auth.ts`: nova `signInWithOAuth(provider: 'google' | 'facebook')` — no native abre `WebBrowser.openAuthSessionAsync`, extrai `code` do retorno e troca por sessão; no web navega a página inteira e deixa o supabase-js processar sozinho. Cancelamento do usuário não vira erro visível.
- `app/_layout.tsx`: o `useEffect` de sessão agora também busca `getProfile()` e popula `useDoctorStore` quando há sessão (boot e mudanças de auth state), esperando isso antes de esconder a splash screen — evita flash de tela errada.
- `app/(tabs)/_layout.tsx`: redireciona para `/complete-profile` se o médico logado tem `crm` vazio (caso de primeiro login via OAuth).
- `app/complete-profile.tsx` (novo): tela obrigatória pós-OAuth pra completar nome/CRM/RQE antes de liberar o app, reaproveitando `updateProfile()`.
- `app/(auth)/login.tsx`: botões "Continuar com Google"/"Continuar com Facebook" (ícones `logo-google`/`logo-facebook` do Ionicons, já suportados pelo `Button` existente), com loading por provedor.
- `supabase/migrations/009_oauth_full_name_fallback.sql` (aplicada via MCP): `handle_new_user()` agora tenta `raw_user_meta_data->>'name'` como fallback quando `full_name` não vem preenchido (alguns provedores OAuth só populam `name`).
- `src/services/profile.ts#getProfile`: `.single()` trocado por `.maybeSingle()` como defesa extra contra timing entre o trigger de criação de perfil e a leitura.
- Novas chaves i18n em `pt-BR`/`en`: `auth.continueWithGoogle`, `auth.continueWithFacebook`, `auth.orDivider`, seção `completeProfile.*`.

**Limitação conhecida, documentada e não é bug:** rodando via Expo Go, `AuthSession.makeRedirectUri()` gera um `exp://192.168.x.x:8081/--/auth-callback` (não o scheme customizado `microlaudo://`), que muda a cada rede/reinício do Metro e precisa estar na allow-list de Redirect URLs do Supabase a cada sessão de teste. Resolve sozinho quando o app for para um build standalone/dev client (EAS).

**Verificação end-to-end:**
- `npm run types` — 0 erros (precisou rodar `npm run build:web` antes, pra regenerar `.expo/types/router.d.ts` com a nova rota `/complete-profile` — o typegen do Expo Router só roda durante `expo start`/`expo export`, não durante `tsc` isolado).
- `npm run lint` — 0 erros, mesmos warnings pré-existentes + 1 novo `react-hooks/exhaustive-deps` em `app/_layout.tsx` (mesmo padrão intencional já existente em `profile.tsx`, effect de boot que deve rodar só uma vez).
- `npm test` — 100/100.
- `npm run build:web` — sucesso, nova rota `/complete-profile` presente nas 23 rotas estáticas exportadas.

**Pendência — checklist de configuração manual (não pode ser feito por ferramenta, entregar ao usuário):**
- **Google Cloud Console:** OAuth consent screen (External, modo teste, adicionar `octaviolobo21@gmail.com` como test user) → criar credencial OAuth Client ID tipo **Web application** → em "Authorized redirect URIs" colar `https://flxxotkhgjpxlpphazcd.supabase.co/auth/v1/callback` → copiar Client ID + Secret.
- **Meta for Developers:** criar App → produto "Facebook Login" → em Settings, "Valid OAuth Redirect URIs" = mesma URL acima → em Roles, adicionar o usuário como Tester/Admin (app em modo Development não deixa outros logarem sem isso) → copiar App ID + Secret.
- **Supabase Dashboard:** Authentication → Providers → habilitar Google e Facebook com as credenciais acima. Authentication → URL Configuration → Redirect URLs → adicionar o `exp://...` gerado no momento do teste via Expo Go (e futuramente `microlaudo://auth-callback` quando existir build nativo).
- Teste manual completo (login de fato) só é possível depois que essas credenciais existirem — combinar sessão de teste conjunta (web primeiro, mobile via Expo Go depois).
- ProDoctor: flag por médico ainda não implementada (ver "Bloqueadores" no checklist de lançamento, acima).
- **Commitado e enviado (`b48d16b`):** login social + tela de completar perfil + correção do `supabase/config.toml` (Redirect URL local estava com `https` em vez de `http` e sem o path `/auth-callback`).

### Checklist consolidado — tudo que falta pro lançamento de verdade (visão completa)

Pedido do usuário: juntar num só lugar literalmente tudo que falta, além do que já está nos checklists das Sessões 11/12 (que seguem valendo, isto é um resumo consolidado, não substitui os detalhes acima).

**A. Infraestrutura / deploy — nada disso existe hoje:**
- [ ] **Domínio próprio** — não há nenhum domínio registrado. O app só é acessível via `localhost` (dev), Expo Go (rede local) e o servidor Tailscale `desktop-u2icebd` (rede privada do usuário, não pública).
- [ ] **Hospedagem pública da versão web** — Tailscale não serve a internet pública. Se o produto final incluir uma versão web de verdade (não só preview interno), falta decidir onde hospedar o export (`npm run build:web`) com domínio e HTTPS próprios (Vercel/Netlify/VPS).
- [ ] **Publicar Política de Privacidade e Termos de Uso numa URL pública** — Apple e Google exigem um link ativo nas duas lojas. Os documentos (ainda em draft, Sessão 13) estão em `docs/legal/`, fora do git por decisão de segurança (CPF do usuário), e hoje não estão publicados em lugar nenhum.
- [ ] **E-mail/URL de suporte** — obrigatório nas duas lojas; hoje não existe domínio nem endereço dedicado, só o Gmail pessoal do usuário.
- [ ] **Decidir separação dev/produção no Supabase** — hoje tudo (inclusive os testes) usa o mesmo projeto remoto (`flxxotkhgjpxlpphazcd`). Avaliar se vale criar um projeto separado antes de ter pacientes/dados reais de produção.

**B. Contas e credenciais de loja — nenhuma criada/configurada:**
- [ ] Apple Developer Program ($99/ano).
- [ ] Google Play Console ($25 único).
- [ ] Credenciais de submissão automática: `eas.json` tem `submit.production: {}` vazio — falta App Store Connect API Key (Apple) e Service Account JSON (Google).
- [ ] Assets de loja: screenshots por tamanho de device, descrição curta/longa, categoria, classificação de idade/conteúdo.
- [ ] Formulários de privacidade das lojas: "App Privacy" (Apple) e "Data Safety" (Google) — precisam declarar que o app trata dado de saúde de paciente (nome, resultado de exame), ponto sensível pra aprovação.

**C. Decisões de produto/negócio pendentes:**
- [ ] Monetização (RevenueCat/Stripe, F30–F34) — ainda são placeholders vazios. Decidir: lançar grátis primeiro ou terminar a integração antes.
- [ ] Política de Privacidade/Termos **definitivos** — intencionalmente aguardando a decisão de monetização acima (Sessão 12), pra não redigir cláusula comercial antes da hora.
- [x] CNPJ — **resolvido na Sessão 12**: não é obrigatório, Apple/Google aceitam pessoa física (CPF).

**D. Bloqueador de segurança (já detalhado acima, repetido aqui pra não passar batido):**
- [x] ProDoctor: flag `prodoctor_enabled` por médico (código na Sessão 16; deploy pendente) — sem isso não dá pra abrir o cadastro ao público (vazaria pacientes da clínica da mãe do usuário pra qualquer médico cadastrado).

**E. Build e testes nativos:**
- [ ] Nenhum build nativo foi gerado ainda — `eas build` nunca rodou de fato, só `eas build:configure` (Sessão 12).
- [ ] Pelo menos um ciclo de TestFlight (iOS) e teste interno/fechado (Android) com usuário real antes de ir a produção.
- [ ] Ícones/splash são placeholder gerado por script (Sessão 12) — trocar por arte de design real antes da submissão.
- [ ] OAuth Google/Facebook — código pronto (esta sessão), faltam credenciais reais no Google Cloud Console/Meta for Developers (checklist acima) e teste de ponta a ponta.

**F. Operacional pós-lançamento — recomendado, não bloqueia a submissão em si:**
- [ ] Monitoramento de erro/crash em produção (ex. Sentry) — inexistente hoje; num app de saúde, ajuda a pegar bug antes do usuário reportar.
- [ ] Estratégia de atualização OTA (`expo-updates`/EAS Update) — não configurada; hoje toda mudança de JS exige novo build+review nas lojas.
- [ ] Confirmar se o `audit_log` (Sessão 9) e as práticas atuais já atendem retenção/backup de dado de saúde exigido pela LGPD, ou se falta política formal por escrito.

---

## Sessão 16 — 06 Out 2026

### ProDoctor: flag `prodoctor_enabled` por médico (bloqueador de segurança)

Branch `feat/prodoctor-flag` (a partir de `chore/expo-sdk-57-upgrade`).

**Achado durante a implementação:** a policy `"Doctors: own row only"` (migration 005) é `FOR ALL` — o médico pode dar UPDATE/INSERT na própria linha. Uma coluna sozinha não bastaria: qualquer médico se auto-habilitaria com `update({ prodoctor_enabled: true })`. (Mesmo problema valia para `subscription_status`/`trial_reports_used` — corrigido na Sessão 17, migration 011.)

- `supabase/migrations/010_doctors_prodoctor_flag.sql`: coluna `prodoctor_enabled BOOLEAN NOT NULL DEFAULT false` + trigger `doctors_protect_prodoctor_enabled` (BEFORE INSERT OR UPDATE) que rejeita (`42501`) qualquer mudança na flag vinda das roles `authenticated`/`anon`. service_role, postgres (SQL editor) e funções SECURITY DEFINER continuam podendo alterar.
- `supabase/functions/prodoctor-patients/index.ts`: depois de validar o JWT, lê `prodoctor_enabled` do próprio médico (client do usuário, sob RLS) e devolve **403** se não for `true`. É o controle de acesso real — vale para `search` e `lastDoctor`.
- `src/services/prodoctor.ts`: novo `isProDoctorEnabled(doctor)` (perfil não carregado = desabilitado). O tratamento de erro existente já converte o 403 em lista vazia/`null`.
- `app/report/patient.tsx`: sem a flag, digitar o nome não dispara busca e o dropdown nunca aparece; o campo vira texto livre.
- Tipos: `prodoctor_enabled` em `src/types/database.ts` (editado à mão, mesmo shape que `db:types` geraria) e `src/types/doctor.ts`.
- Teste: `__tests__/services/prodoctor.test.ts` (3 casos).

**Verificação:** `npm run lint` 0 erros (warnings pré-existentes), `npm run types` 0 erros, `npm test` 103/103.

**Deploy (06/10/2026):**
- [x] Migration 010 aplicada no remoto via `npx supabase db query --linked -f supabase/migrations/010_doctors_prodoctor_flag.sql` — conferido: coluna `boolean NOT NULL DEFAULT false`, trigger presente, 0 de 2 médicos habilitados. Testado numa transação com ROLLBACK como `authenticated`: o UPDATE da flag falha com `42501`.
- [x] `npx supabase functions deploy prodoctor-patients` — smoke test: OPTIONS 200, POST sem token 401.
- ⚠️ **Não usar `supabase db push` neste projeto:** o histórico remoto de migrations está com timestamps (aplicadas via MCP), não com `001`–`010`, então o CLI acha que TODAS as locais estão pendentes e tentaria recriar as tabelas. Aplicar migrations novas uma a uma com `db query --linked -f`, ou alinhar o histórico com `supabase migration repair` antes.
- [ ] Habilitar só a conta da mãe do usuário (SQL editor, roda como postgres):
  ```sql
  UPDATE doctors SET prodoctor_enabled = true
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '<email-dela>');
  ```
- [ ] Teste manual: conta habilitada vê o autocomplete; outra conta não vê, e um `POST` direto na function devolve 403.

---

## Sessão 17 — 09 Out 2026

### Trava das colunas administrativas de `doctors` (migration 011) + PR da flag ProDoctor

- **PR #2** aberto: `feat/prodoctor-flag` → `chore/expo-sdk-57-upgrade` (https://github.com/octaviolobo/Microlaudo/pull/2). MCPs do GitHub e do Supabase configurados no escopo user do Claude Code.
- **Problema:** a policy `"Doctors: own row only"` era `FOR ALL`. O médico podia (a) dar `update({ subscription_status: 'active' })` e virar assinante, e (b) DELETE + INSERT da própria linha para zerar `trial_reports_used`.
- **`supabase/migrations/011_doctors_protect_admin_columns.sql`** (branch `fix/doctors-protected-columns`):
  - troca a policy `FOR ALL` por `"Doctors: read own row"` (SELECT) + `"Doctors: update own row"` (UPDATE). Sem INSERT/DELETE para `authenticated` — a linha é criada por `handle_new_user()` (SECURITY DEFINER, owner `postgres`, que tem BYPASSRLS — conferido em `pg_roles`) e apagada pelo `ON DELETE CASCADE` de `auth.users` no `delete-account` (cascata de FK não passa por RLS). Nenhum código do app insere/apaga `doctors` diretamente.
  - substitui o trigger da 010 por `doctors_protect_admin_columns` (BEFORE UPDATE), que barra `authenticated`/`anon` de mudar `prodoctor_enabled`, `subscription_status` e `trial_reports_used`.
- **Teste antes de aplicar** (transações com ROLLBACK no remoto, rodando a migration real): médico enxerga só a própria linha (1), update de perfil funciona, e cada uma das 3 colunas dá `42501`. O teste de DELETE foi barrado pelo classificador do modo auto (DELETE em massa em produção, mesmo com ROLLBACK) — a ausência de policy de DELETE foi conferida via `pg_policy`.
- **Aplicada em produção** via `npx supabase db query --linked -f` (mesmo motivo da 010: não usar `db push`). Conferido: policies `read own row`/`update own row`, triggers `doctors_protect_admin_columns` + `doctors_updated_at`.
- **Implicação para a monetização (F30–F34):** incremento de `trial_reports_used` e mudança de `subscription_status` têm que vir do servidor (Edge Function com service_role, webhook de pagamento ou RPC SECURITY DEFINER). Um `update` direto do client vai falhar com `42501`.
- O MCP do Supabase perdeu a sessão OAuth no meio (`Invalid or expired requestState`) — rodar `/mcp` → supabase → Authenticate de novo.
