# Estrutura de Pastas — MicroLaudo

**Solo dev. Sem over-engineering. Cada pasta justifica sua existência.**

---

```
microlaudo/
│
├── docs/                                # Tudo que não é código mas precisa existir
│   ├── DECISOES.md                      # Diário de decisões arquiteturais (ADRs)
│   ├── modelo-dominio.md                # Entidades, relacionamentos e regras de negócio
│   ├── analise-seguranca.md             # Superfícies de ataque, OWASP, checklists
│   ├── arquitetura.md                   # Visão geral da stack e diagramas
│   └── arquitetura.mermaid              # Diagrama Mermaid de componentes e fluxos
│
├── scripts/                             # Automações que você roda no terminal, não no app
│   ├── setup.sh                         # Instala dependências, configura .env, roda migrations
│   ├── reset-db.sh                      # Dropa e recria o banco local (desenvolvimento)
│   ├── seed.sh                          # Popula banco local com dados fake para testar
│   └── deploy-web.sh                    # Build + deploy da versão web (Vercel/Netlify)
│
├── supabase/                            # Tudo que vive no Supabase (backend)
│   ├── migrations/                      # SQL versionado — cada alteração no banco é um arquivo
│   │   ├── 001_create_doctors.sql
│   │   ├── 002_create_reports.sql
│   │   ├── 003_create_report_images.sql
│   │   ├── 004_create_audit_log.sql
│   │   ├── 005_enable_rls.sql
│   │   └── 006_storage_policies.sql
│   ├── functions/                       # Edge Functions (rodam no servidor Supabase)
│   │   ├── check-trial/index.ts         # Verifica cota do trial antes de finalizar laudo
│   │   └── payment-webhook/index.ts     # Recebe webhooks do RevenueCat e Stripe
│   ├── seed.sql                         # Dados iniciais para desenvolvimento local
│   └── config.toml                      # Config do Supabase CLI (projeto local)
│
├── app/                                 # Telas do app (Expo Router — file-based routing)
│   ├── _layout.tsx                      # Layout raiz — providers globais, fontes, i18n
│   ├── index.tsx                        # Splash / redirecionamento (logado → home, senão → login)
│   │
│   ├── (auth)/                          # Grupo de telas públicas (sem login)
│   │   ├── _layout.tsx                  # Layout do fluxo de auth
│   │   ├── login.tsx                    # Login (e-mail, Google, Apple)
│   │   ├── register.tsx                 # Cadastro de conta
│   │   └── forgot-password.tsx          # Recuperação de senha
│   │
│   ├── (tabs)/                          # Grupo de telas autenticadas com tab bar
│   │   ├── _layout.tsx                  # Layout com bottom tabs (Home, Histórico, Perfil)
│   │   ├── home.tsx                     # Dashboard — botão "Novo Laudo" + resumo
│   │   ├── history.tsx                  # Lista de laudos com busca
│   │   └── profile.tsx                  # Perfil do médico, clínica, assinatura, plano
│   │
│   └── report/                          # Fluxo de criação/edição do laudo (stack navigation)
│       ├── _layout.tsx                  # Layout do fluxo com stepper/progress bar
│       ├── patient.tsx                  # Step 1 — Dados do paciente
│       ├── photos.tsx                   # Step 2 — Captura/seleção/crop de fotos
│       ├── findings.tsx                 # Step 3 — Achados microscópicos (seletores)
│       ├── scores.tsx                   # Step 4 — Nugent (morfotipos) + Amsel (checkboxes)
│       ├── conclusion.tsx               # Step 5 — Descrição, conclusão, referência
│       └── preview.tsx                  # Step 6 — Preview do PDF, download, finalizar
│
├── src/                                 # Código que NÃO é tela — lógica, componentes, serviços
│   │
│   ├── components/                      # Componentes React reutilizáveis
│   │   ├── ui/                          # Primitivos genéricos (usados em qualquer tela)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx               # Seletor "ausente/raros/alguns/numerosos"
│   │   │   ├── Checkbox.tsx
│   │   │   ├── Slider.tsx               # Slider para morfotipos (0, 1+, 2+, 3+, 4+)
│   │   │   ├── PhotoPicker.tsx          # Botão câmera/galeria + preview thumbnail
│   │   │   ├── ImageCropper.tsx         # Wrapper do crop (expo-image-manipulator / react-easy-crop)
│   │   │   └── StepIndicator.tsx        # Progress bar do fluxo de 6 steps
│   │   │
│   │   └── report/                      # Componentes específicos do domínio laudo
│   │       ├── FindingsForm.tsx          # Formulário dos achados microscópicos
│   │       ├── NugentCalculator.tsx      # UI dos 3 morfotipos + score calculado
│   │       ├── AmselCriteria.tsx         # 4 checkboxes + campo pH
│   │       ├── PhotoGrid.tsx            # Grid de 1-3 fotos com reordenação
│   │       ├── ReportCard.tsx           # Card de laudo no histórico (nome, data, status)
│   │       └── PdfTemplate.tsx          # Layout do PDF (@react-pdf/renderer)
│   │
│   ├── lib/                             # Lógica de negócio pura (sem UI, sem React)
│   │   ├── nugent.ts                    # Cálculo: morfotipos → score → classificação
│   │   ├── amsel.ts                     # Contagem de critérios positivos
│   │   ├── description-generator.ts     # Seletores qualitativos → texto descritivo
│   │   ├── validators.ts               # Validação: laudo pode ser finalizado? campos ok?
│   │   └── format.ts                   # Formatação de datas, nomes, CRM, CNPJ
│   │
│   ├── services/                        # Camada de acesso a dados e serviços externos
│   │   ├── supabase.ts                  # Cliente Supabase configurado (singleton)
│   │   ├── auth.ts                      # Login, registro, logout, sessão
│   │   ├── reports.ts                   # CRUD de laudos (create, update, list, getById)
│   │   ├── images.ts                    # Upload/download de fotos (Storage)
│   │   ├── profile.ts                   # Perfil do médico, logo, assinatura
│   │   ├── subscription.ts             # Status do plano, verificação de trial
│   │   └── pdf.ts                       # Gerar PDF, salvar no Storage, download local
│   │
│   ├── stores/                          # Estado global (Zustand)
│   │   ├── authStore.ts                 # Sessão, user, loading
│   │   ├── reportStore.ts              # Laudo em progresso (6 steps), rascunho parcial
│   │   └── subscriptionStore.ts        # Plano ativo, trial restante, feature flags
│   │
│   ├── hooks/                           # Custom hooks React
│   │   ├── useCamera.ts                 # Permissão + captura via expo-camera
│   │   ├── useImagePicker.ts            # Seleção da galeria via expo-image-picker
│   │   ├── useReportForm.ts             # Lógica do formulário multi-step
│   │   └── useSubscription.ts           # Verificar plano, mostrar paywall
│   │
│   ├── types/                           # TypeScript — tipos do domínio
│   │   ├── report.ts                    # Report, PatientData, Findings, NugentScore, AmselCriteria
│   │   ├── doctor.ts                    # Doctor, Clinic, Signature
│   │   ├── subscription.ts             # Plan, TrialStatus, SubscriptionStatus
│   │   └── database.ts                 # Tipos gerados do Supabase (supabase gen types)
│   │
│   ├── constants/                       # Valores fixos usados em todo o app
│   │   ├── nugent-table.ts              # Tabela de conversão morfotipos → pontos
│   │   ├── findings-options.ts          # ['ausente', 'raros', 'alguns', 'numerosos']
│   │   ├── report-defaults.ts           # Material, método, referência bibliográfica padrão
│   │   └── plans.ts                     # IDs dos planos (RevenueCat product IDs, Stripe price IDs)
│   │
│   └── i18n/                            # Internacionalização
│       ├── index.ts                     # Config do react-i18next
│       └── locales/
│           ├── pt-BR/
│           │   ├── common.json          # Botões, navegação, mensagens genéricas
│           │   ├── report.json          # Campos do laudo, steps, labels
│           │   └── clinical.json        # Termos clínicos (achados, morfotipos, classificações)
│           └── en/
│               ├── common.json
│               ├── report.json
│               └── clinical.json
│
├── __tests__/                           # Testes — espelha a estrutura de src/
│   ├── lib/                             # Testes unitários da lógica de negócio
│   │   ├── nugent.test.ts               # Score calculado corretamente para todas as combinações
│   │   ├── amsel.test.ts                # Contagem correta de critérios
│   │   ├── description-generator.test.ts # Texto gerado corresponde aos seletores
│   │   └── validators.test.ts           # Laudo incompleto não pode ser finalizado
│   ├── services/                        # Testes de integração com Supabase
│   │   ├── reports.test.ts              # CRUD funciona, RLS bloqueia acesso cruzado
│   │   └── subscription.test.ts         # Trial bloqueia após 2 laudos
│   └── components/                      # Testes de componentes (quando valer a pena)
│       └── NugentCalculator.test.tsx     # Slider muda → score atualiza na UI
│
├── assets/                              # Recursos estáticos
│   ├── fonts/                           # Fontes customizadas para o app e PDF
│   ├── images/                          # Ícones, ilustrações, onboarding
│   └── adaptive-icon.png               # Ícone do app
│
├── .env.example                         # Template de variáveis de ambiente (sem valores reais)
├── .env                                 # Valores reais (NUNCA commitar — está no .gitignore)
├── .gitignore                           # node_modules, .env, builds, etc.
├── app.json                             # Config do Expo (nome, versão, splash, permissions)
├── eas.json                             # Config do EAS Build (perfis dev/preview/production)
├── tsconfig.json                        # Config do TypeScript
├── babel.config.js                      # Babel config (Expo preset)
├── jest.config.js                       # Config do Jest para testes
├── package.json                         # Dependências e scripts
└── README.md                            # Como rodar, como contribuir, como fazer deploy
```

---

## Guia rápido: "onde eu coloco isso?"

| Estou criando... | Vai em... | Por quê |
|-----------------|-----------|---------|
| Uma tela nova | `app/` | Expo Router usa file-based routing. Arquivo = rota. |
| Um botão, input, card reutilizável | `src/components/ui/` | Genérico, sem lógica de domínio. |
| O formulário de achados microscópicos | `src/components/report/` | Componente específico do domínio laudo. |
| O cálculo do score de Nugent | `src/lib/nugent.ts` | Lógica pura. Sem React, sem estado, sem side effects. Testável com Jest direto. |
| A chamada para salvar laudo no banco | `src/services/reports.ts` | Acesso a dados. Fala com Supabase. |
| O estado do laudo durante preenchimento | `src/stores/reportStore.ts` | Zustand store. Persiste entre steps. |
| Um hook para pedir permissão de câmera | `src/hooks/useCamera.ts` | Custom hook. Encapsula lógica de side effect. |
| O tipo TypeScript de um laudo | `src/types/report.ts` | Tipos do domínio. Importados por tudo. |
| A tabela "ausente/raros/alguns/numerosos" | `src/constants/findings-options.ts` | Valor fixo, usado em UI e lógica. |
| Um teste do cálculo de Nugent | `__tests__/lib/nugent.test.ts` | Espelha a estrutura de `src/lib/`. |
| Um novo campo no banco | `supabase/migrations/007_add_campo.sql` | Migration SQL versionada. |
| A tradução de "Achados microscópicos" em inglês | `src/i18n/locales/en/clinical.json` | Arquivo de tradução por idioma + contexto. |
| Uma decisão arquitetural | `docs/DECISOES.md` | Nova entrada no diário. |

---

## O que NÃO existe nessa estrutura (de propósito)

| Padrão omitido | Por quê |
|----------------|---------|
| `src/controllers/` | Não é backend MVC. A "controller" de cada tela é a própria tela em `app/`. |
| `src/models/` | Os "models" são os types em `src/types/` + lógica em `src/lib/`. Sem classes ORM. |
| `src/utils/` | Pasta "utils" vira lixeira. Tudo aqui tem nome específico: `lib/format.ts`, `lib/validators.ts`. |
| `src/api/` | Os "api calls" são `src/services/`. Nome mais claro sobre a responsabilidade. |
| `src/contexts/` | Usando Zustand em vez de Context API. Stores substituem contexts. |
| `src/redux/` ou `src/sagas/` | Zustand não precisa de nada disso. |
| `src/screens/` | No Expo Router, as telas ficam em `app/`, não em pasta separada. |
| `.storybook/` | Over-engineering para solo dev. Testo componentes no próprio app. |
| `e2e/` | Testes end-to-end ficam para quando tiver mais de um dev. Na v1, testes unitários em `src/lib/` cobrem o que importa. |
| Monorepo (packages, workspaces) | Um app, um package.json. Monorepo é para times com múltiplos pacotes publicados. |

---

## Conteúdo do .env.example

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# RevenueCat
REVENUECAT_API_KEY_IOS=appl_xxxxx
REVENUECAT_API_KEY_ANDROID=goog_xxxxx

# Stripe (apenas para versão web)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Webhook secrets (usados apenas nas Edge Functions, não no client)
# Esses NÃO começam com EXPO_PUBLIC_ — nunca vão para o client
REVENUECAT_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**Regra:** Variáveis com prefixo `EXPO_PUBLIC_` são expostas no client (ok para anon key e publishable key). Variáveis sem o prefixo ficam apenas no servidor (Edge Functions).

---

## Scripts do package.json

```json
{
  "scripts": {
    "dev": "expo start",
    "dev:web": "expo start --web",
    "build:ios": "eas build --platform ios",
    "build:android": "eas build --platform android",
    "build:web": "expo export --platform web",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint . --ext .ts,.tsx",
    "types": "tsc --noEmit",
    "db:migrate": "supabase db push",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types typescript --local > src/types/database.ts",
    "db:seed": "supabase db seed"
  }
}
```
