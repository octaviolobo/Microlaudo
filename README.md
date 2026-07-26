<div align="center">

# 🔬 MicroLaudo

**Geração assistida de laudos de microscopia vaginal para ginecologistas**

Da lâmina ao PDF assinado em minutos — não em 15 minutos de Word.

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2052-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3%20strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20Storage-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Platform](https://img.shields.io/badge/plataformas-iOS%20%7C%20Android%20%7C%20Web-informational)](#-plataformas)
[![License](https://img.shields.io/badge/uso-privado-lightgrey)](#-licença)

[Sobre](#-sobre-o-projeto) •
[Como funciona](#-como-funciona) •
[Stack](#-stack-tecnológica) •
[Arquitetura](#-arquitetura) •
[Instalação](#-instalação-e-uso) •
[Segurança](#-segurança-e-privacidade) •
[Status](#-status-do-projeto)

</div>

---

## 📖 Sobre o projeto

**MicroLaudo** é um aplicativo multiplataforma (iOS, Android e Web) que resolve um problema muito concreto do consultório de ginecologia: transformar o exame de microscopia de conteúdo vaginal em um **laudo em PDF profissional e padronizado** — sem passar por celular → computador → Word → colar fotos → formatar à mão.

| | Antes | Com o MicroLaudo |
|---|---|---|
| ⏱️ Tempo por laudo | ~15 minutos | **~3 minutos** |
| 📱 Fluxo | Foto no celular → transferir → template Word → formatar | Direto do celular ou navegador, do início ao fim |
| 🧮 Cálculo de scores | Manual, sujeito a erro | **Score de Nugent e Critérios de Amsel calculados automaticamente** |
| 🗂️ Histórico | Pastas soltas / e-mail | Busca por paciente/data, laudos versionados |

O produto foi desenhado com **linguagem ubíqua do domínio médico** (ver [`docs/modelo-dominio.md`](docs/modelo-dominio.md)), decisões arquiteturais documentadas ([`docs/DECISOES.md`](docs/DECISOES.md)) e uma auditoria de segurança própria ([`docs/analise-seguranca.md`](docs/analise-seguranca.md)) — não é só um CRUD com upload de imagem.

---

## 🩺 Como funciona

O core do produto é um **wizard de 6 passos** que gera um laudo completo:

```
1. Dados do paciente   →  2. Fotos da lâmina   →  3. Achados microscópicos
        (1 a 3 fotos, upload para Storage)         (11 campos qualitativos)

4. Scores               →  5. Conclusão          →  6. Preview + PDF
   Nugent + Amsel            texto livre +             download, assinatura
   calculados ao vivo        referência bibliográfica  digital e finalização
```

- **Score de Nugent** — calculado automaticamente a partir de 3 morfotipos (*Lactobacillus*, *Gardnerella/Bacteroides*, *Mobiluncus*) observados na coloração de Gram, classificando a flora em normal / intermediária / vaginose bacteriana.
- **Critérios de Amsel** — 4 sinais clínicos (corrimento homogêneo, *whiff test*, clue cells > 20%, pH > 4,5); ≥ 3 positivos fecha o diagnóstico.
- **PDF adaptativo** — se o médico preencheu dados de clínica (nome, CNPJ, endereço, logo), o laudo sai com cabeçalho/rodapé institucional; se não, sai limpo, apenas com os dados do médico.
- **Edição pós-finalização** — laudo finalizado pode voltar a rascunho, gerar um novo PDF e incrementar o número da revisão, sem consumir cota de trial novamente.

---

## 🧱 Stack tecnológica

| Camada | Tecnologia | Por quê |
|---|---|---|
| App (iOS / Android / Web) | **Expo SDK 52** + **React Native 0.76** + **React Native Web** | Uma única codebase para as três plataformas |
| Navegação | **Expo Router v4** (file-based) | Roteamento tipado (`typedRoutes`), funciona igual em mobile e web |
| Estado global | **Zustand 4** | Stores enxutas (`authStore`, `reportStore`, `doctorStore`, `subscriptionStore`) sem boilerplate de Redux |
| Backend / BaaS | **Supabase** (Postgres + Auth + Storage) | RLS resolve isolamento multi-tenant e LGPD nativamente, sem servidor próprio |
| Geração de PDF | **jsPDF** (client-side, desenho imperativo) | Ver [decisão documentada](#-decisões-técnicas-de-destaque) — trocado de `@react-pdf/renderer` após quebra de bundling no Metro |
| Internacionalização | **react-i18next** | PT-BR como padrão, `common` / `report` / `clinical` como namespaces, pronto para novos idiomas |
| Tipagem | **TypeScript 5.3 (strict)** | Zero `any` implícito; tipos do banco gerados via `supabase gen types` |
| Linting / formatação | ESLint + Prettier + `eslint-config-expo` | |
| Testes | Jest + `jest-expo` | |

---

## 🏗️ Arquitetura

```
Cliente (Expo — iOS / Android / Web)
        │
        │  supabase-js (tipado com Database do schema)
        ▼
┌───────────────────────────────────────────────┐
│                    Supabase                    │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐ │
│  │   Auth    │  │  Postgres  │  │  Storage   │ │
│  │ email/pwd │  │ RLS FORCE  │  │ 3 buckets  │ │
│  │           │  │ 4 tabelas  │  │  privados  │ │
│  └───────────┘  └────────────┘  └────────────┘ │
└───────────────────────────────────────────────┘
```

**Modelo de dados** (ver diagrama completo em [`arquitetura-microlaudo.mermaid`](arquitetura-microlaudo.mermaid) e domínio em [`docs/modelo-dominio.md`](docs/modelo-dominio.md)):

- `doctors` — perfil do médico (nome, CRM, RQE, dados opcionais de clínica), criado automaticamente no signup via trigger.
- `reports` — o laudo em si; `nugent_score` é uma **coluna gerada** pelo próprio Postgres a partir dos morfotipos.
- `report_images` — fotos da lâmina, com constraint de máx. 3 por laudo.
- `audit_log` — trilha de auditoria *append-only*.
- **3 buckets privados** no Storage (`report-images`, `report-pdfs`, `doctor-assets`), acessados exclusivamente via URLs assinadas.

Camadas no código (`src/`):

```
src/
├── lib/          # Lógica pura, sem I/O — nugent.ts, amsel.ts, reportPdf.ts (100% testável)
├── services/      # Efeitos colaterais — chamadas ao Supabase (auth, reports, images, pdf, profile)
├── stores/        # Estado global (Zustand)
├── components/    # UI reutilizável (ui/ = design system, report/ = específicos do wizard)
├── hooks/         # Hooks (useAuth, etc.)
├── constants/     # theme.ts (design tokens), tabelas clínicas (Nugent, achados, planos)
├── i18n/          # Traduções PT-BR / EN
└── types/         # Tipos de domínio + database.ts gerado do schema Supabase
```

A separação **`lib/` (puro) vs. `services/` (I/O)** foi uma decisão deliberada: o cálculo do Score de Nugent e a montagem do PDF não dependem de rede nem de Supabase — podem ser testados isoladamente.

---

## 🔐 Segurança e privacidade

O projeto passou por uma auditoria de segurança própria orientada a OWASP (checklist completo em [`docs/analise-seguranca.md`](docs/analise-seguranca.md)). Alguns pontos:

- **Row Level Security com `FORCE`** em todas as 4 tabelas — cada médico só enxerga seus próprios laudos, mesmo com `service_role` mal configurada.
- **Buckets de Storage 100% privados** — fotos de lâmina, assinaturas, logos e PDFs só são acessíveis via *signed URLs* de curta duração, nunca por URL pública.
- **Erros nunca vazam detalhes internos** — camada `AppError` mapeia toda falha para chaves de i18n; a causa técnica original nunca chega à UI.
- **Segredos fora do controle de versão** — `.env` e `.mcp.json` no `.gitignore`; um vazamento de token de API já foi identificado e corrigido durante o desenvolvimento (ver histórico em [`docs/PROGRESSO.md`](docs/PROGRESSO.md), Sessão 3).
- **LGPD por design** — exclusão de conta com remoção total de dados prevista no escopo (RF22), dados sensíveis de paciente nunca saem do Postgres com RLS.

---

## 🧠 Decisões técnicas de destaque

Todo o histórico de decisões e o *porquê* de cada uma está em [`docs/DECISOES.md`](docs/DECISOES.md) e no diário de sessões [`docs/PROGRESSO.md`](docs/PROGRESSO.md). Dois exemplos que mostram o processo de engenharia por trás do projeto:

- **Geração de PDF trocada de biblioteca em pleno desenvolvimento**: a primeira escolha (`@react-pdf/renderer`) quebrava o bundle inteiro do app na web por causa de *subpath exports* incompatíveis com o resolver do Metro. Em vez de forçar um workaround frágil, o projeto migrou para `jsPDF` com importação direta do build browser — decisão registrada para não ser repetida.
- **Coluna dinâmica no PDF**: um bug de sobreposição de texto em rótulos longos (ex.: "Elementos fúngicos (leveduras/hifas)") foi corrigido medindo a largura real do texto em tempo de renderização (`doc.getTextWidth()`) em vez de usar uma coluna de posição fixa — solução que se adapta a qualquer idioma ou tamanho de rótulo.

---

## 🚀 Instalação e uso

### Pré-requisitos

- Node.js 20 LTS
- Conta [Supabase](https://supabase.com) (ou [Supabase CLI](https://supabase.com/docs/guides/cli) para rodar local)
- Expo Go (mobile) ou navegador (web)

### Passo a passo

```bash
# 1. Clonar e instalar dependências
git clone https://github.com/octaviolobo/Microscopia.git microlaudo
cd microlaudo
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# preencher EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY

# 3. Rodar as migrations no seu projeto Supabase
npm run db:migrate

# 4. Subir o app
npm run dev        # abre o menu do Expo (escolher iOS / Android / Web)
npm run dev:web     # atalho direto para a web
```

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` / `npm run dev:web` | Sobe o servidor de desenvolvimento Expo |
| `npm run build:ios` / `npm run build:android` | Build de produção via EAS |
| `npm run build:web` | Export estático da versão web |
| `npm run lint` | ESLint em todo o projeto |
| `npm run types` | Checagem de tipos (`tsc --noEmit`) |
| `npm run verify` | `lint` + `types` juntos (gate de qualidade) |
| `npm run test` / `npm run test:watch` | Testes com Jest |
| `npm run db:migrate` / `db:reset` / `db:seed` | Migrations no Supabase |
| `npm run db:types` | Gera `src/types/database.ts` a partir do schema |
| `npm run audit` | `npm audit` restrito a dependências de produção |

---

## 📱 Plataformas

| Plataforma | Status |
|---|---|
| 🌐 Web | Fluxo completo testado end-to-end (login → 6 steps do laudo → PDF → histórico) |
| 🤖 Android | Suportado pelo Expo; build via EAS configurado (`eas.json`) |
| 🍎 iOS | Suportado pelo Expo; build via EAS configurado (`eas.json`) |

---

## 📊 Status do projeto

O desenvolvimento é sessão a sessão, com progresso registrado de forma transparente em [`docs/PROGRESSO.md`](docs/PROGRESSO.md) — incluindo bugs encontrados, decisões revertidas e pendências reais, não só o que "deu certo".

**Concluído:**
- ✅ Autenticação (Supabase Auth) com guards de rota
- ✅ Schema completo no Postgres com RLS `FORCE` + 3 buckets de Storage privados
- ✅ Design system próprio (WCAG AAA) com tokens em `src/constants/theme.ts`
- ✅ Wizard completo de criação de laudo (6 steps) com persistência real
- ✅ Cálculo de Score de Nugent e Critérios de Amsel
- ✅ Geração de PDF real com upload para Storage e download assinado
- ✅ Perfil do médico (dados pessoais, clínica, idioma)

**Em aberto (transparência total, sem esconder dívida técnica):**
- ⏳ Testes automatizados para `lib/nugent.ts` e `lib/amsel.ts` (lógica pronta e pura, cobertura ainda não escrita)
- ⏳ Tela de histórico de laudos (`app/(tabs)/history.tsx`) ainda é placeholder
- ⏳ Upload de logo e assinatura digital no perfil do médico
- ⏳ Câmera nativa na captura de fotos (hoje só galeria/seleção de arquivo)
- ⏳ Ajuste de alinhamento de coluna em duas seções do PDF (mesma classe de bug já corrigida na seção de achados)
- ⏳ Pipeline de lint com incompatibilidade de resolver (`eslint-plugin-import` × TypeScript) a investigar

---

## 📂 Estrutura completa do repositório

```
microlaudo/
├── app/            # Telas (Expo Router) — (auth)/, (tabs)/, report/
├── src/            # Código-fonte (lib, services, stores, components, hooks, i18n, types)
├── supabase/       # Migrations SQL versionadas + config do Supabase CLI
├── design-system/  # Design system documentado (tokens, telas de referência)
├── docs/           # Arquitetura, modelo de domínio, decisões, backlog, auditoria de segurança
├── __tests__/      # Testes Jest
└── scripts/        # Automações de terminal (setup, seed, deploy)
```

Documentação de apoio para quem quiser entender o projeto a fundo:

- [`docs/arquitetura.md`](docs/arquitetura.md) — visão geral de produto, requisitos funcionais e não-funcionais
- [`docs/modelo-dominio.md`](docs/modelo-dominio.md) — glossário e entidades do domínio médico
- [`docs/DECISOES.md`](docs/DECISOES.md) — ADRs (Architecture Decision Records)
- [`docs/analise-seguranca.md`](docs/analise-seguranca.md) — checklist OWASP e superfícies de ataque
- [`docs/estrutura-pastas.md`](docs/estrutura-pastas.md) — justificativa de cada pasta do projeto
- [`CONVENTIONS.md`](CONVENTIONS.md) — convenções de nomenclatura, tipagem e banco de dados

---

## 📄 Licença

Projeto privado (`"private": true`). Todos os direitos reservados ao autor — código disponibilizado neste repositório apenas para fins de avaliação e portfólio.

---

<div align="center">

Feito por **Octavio Lobo**

</div>
