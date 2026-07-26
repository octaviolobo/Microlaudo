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
