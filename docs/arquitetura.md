# Documento de Arquitetura — MicroLaudo

**Aplicativo de geração de laudos de microscopia vaginal**
**Versão:** 1.1 | **Data:** 18/04/2026

---

## 1. Visão Geral do Produto

MicroLaudo é um aplicativo multiplataforma (iOS, Android, Web) para médicos ginecologistas gerarem laudos de microscopia de conteúdo vaginal de forma rápida e padronizada. O fluxo principal é: capturar/selecionar fotos da lâmina → preencher achados clínicos via formulário guiado → gerar PDF profissional com layout padronizado.

**Problema que resolve:** Hoje o médico tira a foto pelo celular, transfere ao computador, abre um template Word, cola as fotos manualmente, preenche campos e formata. Esse processo leva ~15 minutos por laudo. O app reduz para ~3 minutos, direto do celular ou computador.

---

## 2. Requisitos Consolidados

### 2.1 Requisitos Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF01 | Cadastro e login (e-mail/senha, Google, Apple) | Alta |
| RF02 | Perfil do médico: nome, CRM, RQE (obrigatórios) + dados da clínica (opcionais: nome empresa, CNPJ, endereço, telefone, logo) | Alta |
| RF03 | Capturar foto pela câmera do dispositivo | Alta |
| RF04 | Selecionar foto da galeria/sistema de arquivos | Alta |
| RF05 | Crop de imagem antes de incluir no laudo | Alta |
| RF06 | Limite de 1 a 3 fotos por laudo | Alta |
| RF07 | Formulário de dados do paciente (nome, data nascimento, data coleta, solicitante) | Alta |
| RF08 | Formulário de achados microscópicos com seletores qualitativos (ausente/raros/alguns/numerosos) para: leucócitos, hemácias, células epiteliais, lactobacilos, cocos, cocobacilos gram+ e gram-, elementos fúngicos (leveduras/hifas), Trichomonas, clue cells, muco | Alta |
| RF09 | Critérios de Amsel: 4 checkboxes (corrimento homogêneo, whiff test+, clue cells >20%, pH >4.5) + campo numérico para pH | Alta |
| RF10 | Cálculo automático do Score de Nugent baseado nos morfotipos (Lactobacillus, Gardnerella/Bacteroides, Mobiluncus) com input qualitativo por campo | Alta |
| RF11 | Descrição dos achados microscópicos (texto livre) | Alta |
| RF12 | Conclusão (texto livre) | Alta |
| RF13 | Referência bibliográfica editável (pré-populada com Nugent 1991) | Média |
| RF14 | Geração de PDF adaptativo: se há dados da clínica, exibe cabeçalho/rodapé institucional; se não, gera sem | Alta |
| RF15 | Assinatura digital simples (imagem da assinatura + CRM/RQE no rodapé) | Média |
| RF16 | Salvar PDF localmente no dispositivo | Alta |
| RF17 | Histórico de laudos com busca (por paciente, data) | Alta |
| RF18 | Visualizar e reimprimir laudos antigos | Alta |
| RF19 | Sistema de assinatura paga (mensal/anual) com trial limitado a 2 laudos | Alta |
| RF20 | Internacionalização (PT-BR como padrão, preparado para outros idiomas) | Média |
| RF21 | Editar laudo finalizado: volta a rascunho, gera novo PDF ao re-finalizar, incrementa número da revisão. Não consome cota do trial novamente. | Alta |
| RF22 | Exclusão de conta com remoção total de dados (exigência LGPD + Apple) | Alta |

### 2.2 Requisitos Não-Funcionais

| ID | Requisito | Meta |
|----|-----------|------|
| RNF01 | Plataformas: iOS 15+, Android 10+, Web (Chrome, Safari, Firefox) | — |
| RNF02 | Tempo de geração do PDF | < 5 segundos |
| RNF03 | Capacidade mínima | 200 laudos/mês por médico, escalável |
| RNF04 | Conformidade com LGPD | Obrigatório |
| RNF05 | Dados em trânsito criptografados (HTTPS/TLS) | Obrigatório |
| RNF06 | Dados em repouso criptografados no banco | Recomendado |
| RNF07 | Proteção anti-burla do trial (vinculado à conta, verificado server-side) | Alta |
| RNF08 | App deve funcionar com conexão à internet | Aceito |

---

## 3. Stack Tecnológica

### 3.1 Justificativa da Escolha

Considerando que: (a) você é desenvolvedor solo, (b) precisa de iOS + Android + Web com uma única codebase, (c) não tem experiência mobile prévia, e (d) não tem prazo — a prioridade é **produtividade do desenvolvedor** e **menor superfície de manutenção**.

### 3.2 Stack

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend Mobile** | **React Native + Expo** (SDK 52+) | Codebase única para iOS e Android. Expo simplifica build, deploy e OTA updates. |
| **Frontend Web** | **Expo Web** (React Native Web) | Reaproveita ~70% da codebase mobile. UI adaptada para desktop. |
| **Navegação** | Expo Router v4 (file-based routing) | Padrão do Expo, funciona web e mobile. |
| **Backend / BaaS** | **Supabase** | Auth, PostgreSQL, Storage, Edge Functions. RLS nativo resolve LGPD. |
| **Autenticação** | Supabase Auth | E-mail/senha, Google OAuth, Apple Sign-In. |
| **Pagamentos Mobile** | **RevenueCat** | Abstrai App Store + Play Store subscriptions. Anti-burla nativo. |
| **Pagamentos Web** | **Stripe** | Assinaturas via browser. RevenueCat integra com Stripe. |
| **Geração de PDF** | **@react-pdf/renderer** | Client-side, sem servidor. Layout com componentes React. |
| **Crop de Imagem** | expo-image-manipulator (mobile) + react-easy-crop (web) | Crop nativo no mobile, crop canvas no web. |
| **Câmera** | expo-camera + expo-image-picker | Captura e seleção de imagens. |
| **Storage** | Supabase Storage (buckets privados) | Upload de fotos, logos, assinaturas, PDFs. URLs assinadas. |
| **Estado** | Zustand | Leve, sem boilerplate, funciona em RN e Web. |
| **i18n** | react-i18next | Internacionalização. PT-BR como padrão. |

### 3.3 Diagrama de Contexto

```
┌─────────────────────────────────────────────┐
│              Dispositivo do Médico           │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  │
│  │   iOS   │  │ Android  │  │  Browser   │  │
│  └────┬────┘  └────┬─────┘  └─────┬──────┘  │
│       └─────────┬──┘──────────────┘          │
│          React Native (Expo) / Expo Web      │
│          ┌──────────────────┐                │
│          │  PDF Generation  │ (client-side)  │
│          └──────────────────┘                │
└──────────────────┬──────────────────────────┘
                   │ HTTPS/TLS
         ┌─────────▼──────────┐
         │     Supabase       │
         │  ┌──────────────┐  │
         │  │  Auth         │  │
         │  │  PostgreSQL   │  │
         │  │  Storage      │  │
         │  │  Edge Funcs   │  │
         │  └──────────────┘  │
         └────────┬───────────┘
                  │
    ┌─────────────┼──────────────┐
    │             │              │
┌───▼───┐  ┌─────▼─────┐  ┌────▼────┐
│RevenueCat│ │  Stripe   │ │ Apple/  │
│         │ │           │ │ Google  │
│(mobile) │ │  (web)    │ │ OAuth   │
└─────────┘ └───────────┘ └─────────┘
```

---

## 4. Modelo de Dados

### 4.1 Tabelas Principais (PostgreSQL / Supabase)

```sql
-- ═══════════════════════════════════════════
-- PERFIL DO MÉDICO
-- ═══════════════════════════════════════════
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dados obrigatórios
  full_name TEXT NOT NULL,
  crm TEXT NOT NULL,
  rqe TEXT,
  signature_url TEXT,               -- Imagem da assinatura (Storage)
  preferred_language TEXT DEFAULT 'pt-BR',

  -- Dados da clínica (TODOS opcionais)
  clinic_name TEXT,
  clinic_cnpj TEXT,
  clinic_address TEXT,
  clinic_phone TEXT,
  logo_url TEXT,                     -- Logo da clínica (Storage)

  -- Referência bibliográfica padrão
  default_reference TEXT DEFAULT 'Nugent, R. P., Krohn, M. A., & Hillier, S. L. (1991). Reliability of diagnosing bacterial vaginosis is improved by a standardized method of Gram stain interpretation. Journal of Clinical Microbiology, 29(2), 297-301.',

  -- Trial e assinatura
  trial_reports_used INTEGER DEFAULT 0,
  subscription_status TEXT DEFAULT 'trial',  -- trial | active | expired

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- LAUDOS
-- ═══════════════════════════════════════════
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,

  -- Dados do paciente
  patient_name TEXT NOT NULL,
  patient_birth_date DATE,
  collection_date DATE NOT NULL,
  requesting_doctor TEXT,
  material TEXT DEFAULT 'Secreção vaginal',
  method TEXT DEFAULT 'Microscopia óptica (a fresco e coloração de Gram)',

  -- Achados microscópicos (valores qualitativos)
  lactobacilli TEXT CHECK (lactobacilli IN ('ausente','raros','alguns','numerosos')),
  cocci TEXT CHECK (cocci IN ('ausente','raros','alguns','numerosos')),
  coccobacilli_gram_pos TEXT CHECK (coccobacilli_gram_pos IN ('ausente','raros','alguns','numerosos')),
  coccobacilli_gram_neg TEXT CHECK (coccobacilli_gram_neg IN ('ausente','raros','alguns','numerosos')),
  leukocytes TEXT CHECK (leukocytes IN ('ausente','raros','alguns','numerosos')),
  red_blood_cells TEXT CHECK (red_blood_cells IN ('ausente','raros','alguns','numerosos')),
  epithelial_cells TEXT CHECK (epithelial_cells IN ('ausente','raros','alguns','numerosos')),
  fungal_elements TEXT CHECK (fungal_elements IN ('ausente','raros','alguns','numerosos')),
  trichomonas TEXT CHECK (trichomonas IN ('ausente','raros','alguns','numerosos')),
  clue_cells TEXT CHECK (clue_cells IN ('ausente','raros','alguns','numerosos')),
  mucus TEXT CHECK (mucus IN ('ausente','raros','alguns','numerosos')),

  -- Nugent (morfotipos para cálculo automático)
  nugent_lactobacillus INTEGER CHECK (nugent_lactobacillus BETWEEN 0 AND 4),
  nugent_gardnerella INTEGER CHECK (nugent_gardnerella BETWEEN 0 AND 4),
  nugent_mobiluncus INTEGER CHECK (nugent_mobiluncus BETWEEN 0 AND 2),
  nugent_score INTEGER GENERATED ALWAYS AS (
    COALESCE(nugent_lactobacillus, 0) +
    COALESCE(nugent_gardnerella, 0) +
    COALESCE(nugent_mobiluncus, 0)
  ) STORED,

  -- Amsel
  amsel_homogeneous_discharge BOOLEAN DEFAULT FALSE,
  amsel_whiff_test BOOLEAN DEFAULT FALSE,
  amsel_clue_cells_20 BOOLEAN DEFAULT FALSE,
  amsel_ph_above_45 BOOLEAN DEFAULT FALSE,
  amsel_ph_value NUMERIC(3,1),

  -- Textos livres
  microscopic_description TEXT,
  conclusion TEXT,
  bibliographic_reference TEXT,

  -- Metadados
  pdf_url TEXT,                      -- URL do PDF no Storage
  status TEXT DEFAULT 'draft',       -- draft | completed
  revision_number INTEGER DEFAULT 1, -- Incrementa a cada re-edição
  evaluation_date DATE,              -- Data da avaliação (preenchida ao finalizar)

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- FOTOS DO LAUDO (1 a 3)
-- ═══════════════════════════════════════════
CREATE TABLE report_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,           -- URL no Supabase Storage
  sort_order INTEGER NOT NULL,       -- 1, 2 ou 3
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT max_3_images CHECK (sort_order BETWEEN 1 AND 3)
);

-- ═══════════════════════════════════════════
-- LOG DE AUDITORIA (append-only)
-- ═══════════════════════════════════════════
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,          -- 'report.finalized', 'report.edited', 'account.deleted'
  actor_id UUID NOT NULL,            -- doctor.user_id
  resource_id UUID,                  -- report_id (quando aplicável)
  metadata JSONB,                    -- { revision: 2, method: "google" }
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE doctors FORCE ROW LEVEL SECURITY;
ALTER TABLE reports FORCE ROW LEVEL SECURITY;
ALTER TABLE report_images FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY "Doctors see own data" ON doctors
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Doctors see own reports" ON reports
  FOR ALL USING (doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  ));

CREATE POLICY "Doctors see own report images" ON report_images
  FOR ALL USING (report_id IN (
    SELECT r.id FROM reports r
    JOIN doctors d ON r.doctor_id = d.id
    WHERE d.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert audit logs" ON audit_log
  FOR INSERT WITH CHECK (actor_id = auth.uid());
```

### 4.2 Score de Nugent — Lógica de Cálculo

O médico informa, para cada morfotipo, a quantidade observada por campo de imersão (1000x). O app converte para o score usando a tabela padrão:

| Morfotipo | 0 | 1+ | 2+ | 3+ | 4+ |
|-----------|---|----|----|----|----|
| **Lactobacillus** (score invertido) | 4 | 3 | 2 | 1 | 0 |
| **Gardnerella / Bacteroides** | 0 | 1 | 2 | 3 | 4 |
| **Mobiluncus** (curved rods) | 0 | 1 | 2 | — | — |

**Interpretação automática no app:**
- 0–3: Flora normal (Tipo I)
- 4–6: Flora intermediária (Tipo II)
- 7–10: Vaginose bacteriana (Tipo III)

Input via **slider ou seletor segmentado** (0, 1+, 2+, 3+, 4+) para cada morfotipo.

---

## 5. Fluxo de Telas (User Journey)

```
┌──────────────┐
│   Splash /   │
│   Onboarding │
└──────┬───────┘
       ▼
┌──────────────┐     ┌──────────────────┐
│    Login     │────▶│  Cadastro        │
│  (email/     │     │  Perfil Médico   │
│  Google/     │     │  (CRM, RQE)      │
│  Apple)      │     │  Clínica (opci.) │
└──────┬───────┘     └──────────────────┘
       ▼
┌──────────────────────────────────────┐
│           HOME (Dashboard)           │
│  ┌────────────┐  ┌────────────────┐  │
│  │ + Novo     │  │  Histórico     │  │
│  │   Laudo    │  │  de Laudos     │  │
│  └─────┬──────┘  └───────┬────────┘  │
│        │                 │           │
│  ┌─────▼──────┐  ┌───────▼────────┐  │
│  │  Perfil /  │  │  Assinatura /  │  │
│  │  Config    │  │  Planos        │  │
│  └────────────┘  └────────────────┘  │
└──────────┬───────────────────────────┘
           ▼
┌──────────────────────────────────────┐
│   FLUXO DE CRIAÇÃO / EDIÇÃO LAUDO    │
│                                      │
│  Step 1: Dados do Paciente           │
│  Step 2: Fotos (1 a 3)               │
│  Step 3: Achados Microscópicos       │
│  Step 4: Nugent & Amsel              │
│  Step 5: Conclusão + Referência      │
│  Step 6: Preview & Download          │
└──────────────────────────────────────┘

Edição: Histórico → selecionar laudo → "Editar"
→ volta a rascunho → 6 steps (pré-preenchido)
→ re-finalizar → revision_number incrementa
```

---

## 6. Layout do PDF

O PDF se adapta conforme o que o médico preencheu no perfil:

```
┌──────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  [LOGO]     │  ← Só se tem logo
├──────────────────────────────────────────┤
│  LAUDO MICROSCOPIA CONTEÚDO VAGINAL      │
├──────────────────────────────────────────┤
│  Paciente / Data / Solicitante / etc.    │
├──────────────────────────────────────────┤
│  Achados microscópicos:                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Foto 1  │ │  Foto 2  │ │  Foto 3  │ │
│  └──────────┘ └──────────┘ └──────────┘ │
├──────────────────────────────────────────┤
│  Descrição + Nugent + Amsel              │
├──────────────────────────────────────────┤
│  Conclusão                               │
├──────────────────────────────────────────┤
│  Referência bibliográfica                │
├──────────────────────────────────────────┤
│  [Assinatura] Nome · CRM · RQE · Data   │
├──────────────────────────────────────────┤
│  CLÍNICA · CNPJ · Endereço              │  ← Só se tem dados da clínica
└──────────────────────────────────────────┘
```

---

## 7. Estratégia de Segurança e LGPD

- **RLS com FORCE** em toda tabela. Policies usam `auth.uid()`.
- **HTTPS/TLS** em todo tráfego.
- **Buckets PRIVATE** com URLs assinadas (expiração ≤ 10 min).
- **Audit log** registra eventos (IDs), nunca conteúdo clínico.
- **Exclusão de conta** remove tudo: perfil, laudos, fotos, PDFs.
- **Trial server-side** via Edge Function `check-trial`.
- **Webhooks** validados por HMAC (RevenueCat) e stripe-signature (Stripe).

Análise completa: `docs/analise-seguranca.md`

---

## 8. Modelo de Monetização

| Plano | Preço Sugerido | Laudos |
|-------|---------------|--------|
| **Trial** | Grátis | 2 laudos finalizados (lifetime) |
| **Mensal** | R$ 49–79/mês | Ilimitados |
| **Anual** | R$ 399–699/ano (~30% desc.) | Ilimitados |

---

## 9. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| PDF complexo demais para client-side | Alto | Fallback: Edge Function com Puppeteer |
| RLS mal configurado em tabela nova | Crítico | Checklist pré-deploy + teste cruzado |
| Bucket Storage público por acidente | Crítico | Todos PRIVATE + teste GET sem token = 403 |
| Apple/Google cortam 30% da subscription | Alto | Considerar no pricing. Web com preço menor. |
| Scope creep com IA | Médio | Não incluir na v1. Reavaliar após validação. |
| Dev solo = bus factor 1 | Alto | Documentar tudo. Serviços gerenciados. |

---

## 10. Plano de Implementação

| Fase | Escopo | Estimativa |
|------|--------|-----------|
| **1 — MVP** | Auth, perfil, fluxo do laudo, PDF, download | 6–8 semanas |
| **2 — Completo** | Google/Apple login, logo, histórico, edição, crop, i18n | 4–6 semanas |
| **3 — Monetização** | RevenueCat, Stripe, trial, policies, beta, submit lojas | 4 semanas |
| **4 — Pós-lançamento** | Analytics, feedback, avaliar IA, novos idiomas, MFA | Contínuo |

---

## 11. ADRs (resumo)

| ADR | Decisão | Motivo |
|-----|---------|--------|
| 001 | React Native + Expo | Reuso web, comunidade, Expo simplifica |
| 002 | Supabase | PostgreSQL, RLS nativo, sem vendor lock-in |
| 003 | PDF client-side | Sem round-trip, menor custo |
| 004 | Sem IA na v1 | Valor é formulário guiado, não classificação |
| 005 | RevenueCat + Stripe | Abstrai billing das lojas |
| 006 | Clínica opcional | Médicos autônomos não devem ser barrados |
| 007 | Laudo editável | Erro humano acontece |
| 008 | Trial vinculado à conta | Device ID é burlável |
| 009 | Paciente não é entidade | Dados vivem dentro do laudo |
| 010 | Assinatura simples | ICP-Brasil é caro e complexo |
| 011 | Zustand | Leve, sem boilerplate |
| 012 | i18n desde o dia 1 | Extrair strings depois é doloroso |

Detalhes completos: `docs/DECISOES.md`

---

## 12. Documentos Relacionados

| Documento | Localização |
|-----------|------------|
| Modelo de Domínio | `docs/modelo-dominio.md` |
| Decisões Arquiteturais | `docs/DECISOES.md` |
| Análise de Segurança | `docs/analise-seguranca.md` |
| Estrutura de Pastas | `docs/estrutura-pastas.md` |
| Convenções de Código | `CONVENTIONS.md` (raiz) |
| Diagrama de Arquitetura | `docs/arquitetura.mermaid` |

---

*Versão 1.1 — Incorpora: clínica opcional (ADR-006), laudo editável com revisão (ADR-007), tabela audit_log, FORCE RLS, RF21/RF22.*
