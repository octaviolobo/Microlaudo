# CONVENTIONS.md — MicroLaudo

**Contrato de padrões do projeto. Toda sessão de dev (humano ou Claude) lê isso antes de escrever código.**

Última atualização: 18 de abril de 2026

---

## 1. Stack e Versões

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Node.js** | 20 LTS | Runtime para dev e build |
| **TypeScript** | 5.3+ | Toda a codebase. Zero JavaScript puro. |
| **React Native** | 0.76+ | Framework mobile |
| **Expo** | SDK 52 | Toolchain, build, OTA updates |
| **Expo Router** | v4 | Navegação file-based |
| **React** | 18.x | Renderização (mobile + web) |
| **Zustand** | 4.x | Estado global |
| **Supabase JS** | 2.x | Cliente do backend |
| **@react-pdf/renderer** | 3.x | Geração de PDF client-side |
| **react-i18next** | 14.x | Internacionalização |
| **Jest** | 29.x | Testes |
| **ESLint** | 8.x | Linting |
| **Prettier** | 3.x | Formatação |

**Regra de atualização:** Não atualizar major versions no meio de uma feature. Atualizações de major vão em branch separada, testam tudo, e mergem isoladamente.

---

## 2. Nomenclatura

### Arquivos e pastas

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componente React | PascalCase | `NugentCalculator.tsx` |
| Tela (Expo Router) | kebab-case | `forgot-password.tsx` |
| Lógica pura, serviço, hook, store | camelCase | `nugent.ts`, `authStore.ts`, `useCamera.ts` |
| Tipo / interface | camelCase | `report.ts`, `doctor.ts` |
| Constante | kebab-case | `nugent-table.ts`, `findings-options.ts` |
| Teste | mesmo nome + `.test` | `nugent.test.ts`, `NugentCalculator.test.tsx` |
| Migration SQL | número sequencial + snake_case | `001_create_doctors.sql` |
| Arquivo de tradução | camelCase | `common.json`, `clinical.json` |

### Variáveis e funções

```typescript
// Variáveis e funções: camelCase
const patientName = 'Maria';
const nugentScore = calculateNugentScore(morphotypes);
function formatCrmNumber(crm: string): string { ... }

// Constantes globais: SCREAMING_SNAKE_CASE
const MAX_PHOTOS_PER_REPORT = 3;
const TRIAL_REPORT_LIMIT = 2;
const JWT_EXPIRATION_SECONDS = 3600;

// Tipos e interfaces: PascalCase, sem prefixo I
type Report = { ... };
type NugentScore = { ... };
interface PatientData { ... }  // não: IPatientData

// Enums: PascalCase no nome, PascalCase nos valores
enum ReportStatus {
  Draft = 'draft',
  Completed = 'completed',
}

enum FindingLevel {
  Absent = 'ausente',
  Rare = 'raros',
  Some = 'alguns',
  Numerous = 'numerosos',
}

// Componentes React: PascalCase
function NugentCalculator({ ... }: NugentCalculatorProps) { ... }

// Hooks: use + PascalCase
function useReportForm() { ... }

// Zustand stores: use + nome + Store
const useAuthStore = create<AuthState>(() => ({ ... }));
const useReportStore = create<ReportState>(() => ({ ... }));

// Funções de serviço: verbo + substantivo
async function createReport(data: ReportInput): Promise<Report> { ... }
async function listReportsByDoctor(doctorId: string): Promise<Report[]> { ... }
async function uploadImage(file: Blob, reportId: string): Promise<string> { ... }
```

### Banco de dados (PostgreSQL)

```sql
-- Tabelas: snake_case, plural
CREATE TABLE doctors ( ... );
CREATE TABLE reports ( ... );
CREATE TABLE report_images ( ... );

-- Colunas: snake_case
patient_name, collection_date, nugent_score, created_at

-- Policies RLS: descrição legível em inglês
CREATE POLICY "Doctors see own reports" ON reports ...

-- Migrations: sequencial + ação + tabela
001_create_doctors.sql
002_create_reports.sql
007_add_phone_to_doctors.sql
```

### Chaves de tradução (i18n)

```json
// Formato: seção.chave em camelCase
{
  "report": {
    "patientName": "Nome do paciente",
    "collectionDate": "Data da coleta",
    "findings": {
      "lactobacilli": "Lactobacilos",
      "clue_cells": "Clue cells"
    }
  },
  "common": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "next": "Próximo"
  }
}
```

---

## 3. TypeScript — Regras de Tipagem

### Sempre

```typescript
// Tipar props de componentes explicitamente
type AmselCriteriaProps = {
  values: AmselCriteria;
  onChange: (updated: AmselCriteria) => void;
};

// Tipar retorno de funções públicas (exportadas)
export function calculateNugentScore(morphotypes: Morphotypes): NugentResult { ... }

// Tipar estado das stores
type ReportState = {
  currentReport: Partial<Report> | null;
  isDirty: boolean;
  setPatientData: (data: PatientData) => void;
  reset: () => void;
};

// Usar tipos do Supabase gerados automaticamente
import { Database } from '@/types/database';
type ReportRow = Database['public']['Tables']['reports']['Row'];
type ReportInsert = Database['public']['Tables']['reports']['Insert'];
```

### Nunca

```typescript
// ❌ NUNCA usar `any`
function processData(data: any) { ... }

// ✅ Usar `unknown` e fazer narrowing
function processData(data: unknown) {
  if (isReport(data)) { ... }
}

// ❌ NUNCA usar `as` para forçar tipo (exceto em type guards)
const report = response as Report;

// ✅ Validar o dado de verdade
const report = parseReport(response); // lança erro se inválido

// ❌ NUNCA usar `// @ts-ignore` ou `// @ts-expect-error` sem comentário
// @ts-ignore
brokenFunction();

// ✅ Se inevitável, explicar por quê e abrir issue
// @ts-expect-error - expo-camera types broken in SDK 52, fix pending expo/expo#12345
Camera.requestPermissions();

// ❌ NUNCA exportar tipo `any` de um módulo
export type Config = any;
```

### `type` vs `interface`

```typescript
// Use `type` para tudo por padrão
type Report = { ... };
type NugentScore = { ... };
type FindingLevel = 'ausente' | 'raros' | 'alguns' | 'numerosos';

// Use `interface` APENAS se precisa de declaration merging (raro)
// Na prática: sempre type.
```

---

## 4. Imports — Ordem e Aliases

### Aliases configurados (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@app/*": ["./app/*"],
      "@assets/*": ["./assets/*"]
    }
  }
}
```

### Ordem dos imports (ESLint enforça)

Sempre nesta sequência, com linha em branco entre os grupos:

```typescript
// 1. React e React Native (sempre primeiro)
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';

// 2. Bibliotecas externas (npm packages)
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

// 3. Código interno — serviços, stores, hooks, lib
import { useReportStore } from '@/stores/reportStore';
import { calculateNugentScore } from '@/lib/nugent';
import { createReport } from '@/services/reports';

// 4. Componentes internos
import { Button } from '@/components/ui/Button';
import { NugentCalculator } from '@/components/report/NugentCalculator';

// 5. Tipos (com `type` keyword)
import type { Report, NugentResult } from '@/types/report';

// 6. Constantes e assets
import { NUGENT_TABLE } from '@/constants/nugent-table';
```

### Regras

```typescript
// ✅ Import nomeado (sempre preferir)
import { calculateNugentScore } from '@/lib/nugent';

// ❌ Import default (evitar — exceto componentes React e stores Zustand)
import nugent from '@/lib/nugent';

// ✅ Import de tipo com keyword `type`
import type { Report } from '@/types/report';

// ❌ Import relativo saindo mais de 1 nível
import { Button } from '../../../components/ui/Button';

// ✅ Usar alias @/
import { Button } from '@/components/ui/Button';
```

---

## 5. Componentes React — Padrões

### Estrutura de um componente

```typescript
// 1. Imports (na ordem definida acima)
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { FindingLevel } from '@/types/report';

// 2. Tipo das props (no mesmo arquivo, acima do componente)
type FindingsFormProps = {
  initialValues?: Partial<Findings>;
  onSubmit: (findings: Findings) => void;
};

// 3. Componente como function declaration (não arrow function)
export function FindingsForm({ initialValues, onSubmit }: FindingsFormProps) {
  const { t } = useTranslation('report');
  const [findings, setFindings] = useState<Findings>(/* ... */);

  // 4. Handlers com prefixo handle
  function handleLevelChange(field: string, level: FindingLevel) {
    setFindings(prev => ({ ...prev, [field]: level }));
  }

  function handleSubmit() {
    onSubmit(findings);
  }

  // 5. Return
  return (
    <View>
      {/* JSX */}
    </View>
  );
}

// 6. NÃO usar export default. Sempre export nomeado.
```

### O que cada pasta de componentes contém

```
src/components/ui/       → Zero lógica de domínio. Pode ser usado em qualquer app.
                           Recebe dados via props, não acessa stores nem services.

src/components/report/   → Conhece o domínio "laudo". Pode importar types de report,
                           mas NÃO acessa Supabase diretamente. Recebe dados via props.
```

---

## 6. Error Handling

### Padrão único: try/catch + tipos de erro

```typescript
// Em services/ — onde erros acontecem
export async function createReport(data: ReportInput): Promise<Report> {
  const { data: report, error } = await supabase
    .from('reports')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new AppError('REPORT_CREATE_FAILED', error.message, error);
  }

  return report;
}

// Tipo de erro customizado (src/lib/errors.ts)
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Códigos de erro padronizados
export const ErrorCodes = {
  // Auth
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',

  // Report
  REPORT_CREATE_FAILED: 'REPORT_CREATE_FAILED',
  REPORT_NOT_FOUND: 'REPORT_NOT_FOUND',
  REPORT_VALIDATION_FAILED: 'REPORT_VALIDATION_FAILED',

  // Trial
  TRIAL_LIMIT_REACHED: 'TRIAL_LIMIT_REACHED',

  // Storage
  IMAGE_UPLOAD_FAILED: 'IMAGE_UPLOAD_FAILED',
  PDF_GENERATION_FAILED: 'PDF_GENERATION_FAILED',
} as const;
```

### Nas telas — catch + feedback ao usuário

```typescript
// Em telas (app/) — quem exibe o erro
async function handleFinalize() {
  try {
    setLoading(true);
    await finalizeReport(reportId);
    router.push('/history');
  } catch (err) {
    if (err instanceof AppError && err.code === 'TRIAL_LIMIT_REACHED') {
      showPaywall();
    } else {
      showToast(t('common.genericError'));
    }
  } finally {
    setLoading(false);
  }
}
```

### Regras

```
✅ Services lançam AppError com código
✅ Telas fazem try/catch e mostram feedback ao usuário
✅ Lógica pura (lib/) retorna Result ou lança — nunca silencia erros
✅ finally para loading states

❌ Nunca catch vazio: catch (err) { }
❌ Nunca console.error sem contexto: console.error(err)
❌ Nunca expor mensagens técnicas ao usuário ("PGRST301: JWT expired")
```

---

## 7. Estado (Zustand)

### Estrutura de uma store

```typescript
// src/stores/reportStore.ts
import { create } from 'zustand';
import type { PatientData, Findings, Report } from '@/types/report';

type ReportState = {
  // Estado
  currentReport: Partial<Report> | null;
  isDirty: boolean;

  // Ações (sempre verbos)
  setPatientData: (data: PatientData) => void;
  setFindings: (findings: Findings) => void;
  reset: () => void;
};

export const useReportStore = create<ReportState>((set) => ({
  currentReport: null,
  isDirty: false,

  setPatientData: (data) =>
    set((state) => ({
      currentReport: { ...state.currentReport, ...data },
      isDirty: true,
    })),

  setFindings: (findings) =>
    set((state) => ({
      currentReport: { ...state.currentReport, ...findings },
      isDirty: true,
    })),

  reset: () => set({ currentReport: null, isDirty: false }),
}));
```

### Regras

```
✅ Uma store por domínio: auth, report, subscription
✅ Estado e ações no mesmo create()
✅ Componentes acessam stores com seletores: useReportStore(s => s.isDirty)
✅ Nomes de ações são verbos: setPatientData, reset, clearDraft

❌ Nunca acessar a store inteira: const store = useReportStore()
❌ Nunca chamar services dentro da store (stores são síncronas, services são async)
❌ Nunca mais que 3 stores. Se precisar de mais, algo está errado.
```

---

## 8. Lógica de Negócio (`src/lib/`)

### Regras fundamentais

```typescript
// src/lib/ é lógica PURA:
// ✅ Recebe dados, retorna dados
// ✅ Sem imports de React, React Native, Supabase, Zustand
// ✅ Sem side effects (fetch, storage, console.log)
// ✅ 100% testável com Jest puro — sem mocks

// Exemplo: src/lib/nugent.ts
import { NUGENT_TABLE } from '@/constants/nugent-table';
import type { Morphotypes, NugentResult } from '@/types/report';

export function calculateNugentScore(morphotypes: Morphotypes): NugentResult {
  const lactobacillusPoints = NUGENT_TABLE.lactobacillus[morphotypes.lactobacillus];
  const gardnerellaPoints = NUGENT_TABLE.gardnerella[morphotypes.gardnerella];
  const mobiluncusPoints = NUGENT_TABLE.mobiluncus[morphotypes.mobiluncus];

  const score = lactobacillusPoints + gardnerellaPoints + mobiluncusPoints;

  return {
    score,
    classification: classifyNugent(score),
    breakdown: { lactobacillusPoints, gardnerellaPoints, mobiluncusPoints },
  };
}

function classifyNugent(score: number): NugentClassification {
  if (score <= 3) return 'normal';
  if (score <= 6) return 'intermediate';
  return 'bacterial_vaginosis';
}
```

---

## 9. Testes

### Estrutura

```
__tests__/
├── lib/                    # Testes unitários — PRIORIDADE MÁXIMA
│   ├── nugent.test.ts      # Lógica pura, sem mocks
│   ├── amsel.test.ts
│   ├── validators.test.ts
│   └── description-generator.test.ts
├── services/               # Testes de integração — quando valer a pena
│   ├── reports.test.ts     # Precisa de Supabase local rodando
│   └── subscription.test.ts
└── components/             # Testes de componente — somente se bug justificar
    └── NugentCalculator.test.tsx
```

### Naming dos testes

```typescript
// Formato: describe(módulo) > it(cenário em português)
describe('calculateNugentScore', () => {
  it('retorna 0 quando todos os morfotipos são 0+', () => {
    // ...
  });

  it('retorna 10 para o score máximo possível', () => {
    // ...
  });

  it('classifica 0-3 como flora normal', () => {
    // ...
  });

  it('classifica 7-10 como vaginose bacteriana', () => {
    // ...
  });
});

describe('validateReport', () => {
  it('rejeita laudo sem nome do paciente', () => {
    // ...
  });

  it('rejeita laudo sem foto', () => {
    // ...
  });

  it('aceita laudo com todos os campos obrigatórios preenchidos', () => {
    // ...
  });
});
```

### O que testar e o que não testar

```
TESTAR (alto valor / baixo custo):
✅ src/lib/* — toda lógica pura. 100% de cobertura aqui.
✅ Validações de laudo — testar todos os cenários de rejeição.
✅ Cálculo de Nugent — todas as combinações de morfotipos.
✅ Contagem de Amsel — boundary cases.
✅ RLS cruzado — médico A não vê dados do médico B (teste de integração).

NÃO TESTAR (baixo valor / alto custo):
❌ Componentes de UI simples (Button, Input) — teste visual manual.
❌ Navegação entre telas — teste manual no app.
❌ Estilização — teste visual manual.
❌ Chamadas ao Supabase sem lógica (CRUD puro) — o SDK já é testado.
```

### Mocks

```typescript
// Mockar: Supabase client, AsyncStorage, expo-camera, expo-image-picker
// NÃO mockar: lógica de negócio em src/lib/ — testar de verdade

// Exemplo de mock do Supabase para testes de serviço
jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));
```

---

## 10. O que é PROIBIDO

Estes são erros que eu (ou o Claude) não podem cometer. Se acontecer, corrigir antes de commitar.

```
🚫 any                        → Usar unknown + type narrowing
🚫 as Type                    → Validar o dado de verdade (exceto em type guards)
🚫 // @ts-ignore sem motivo   → Explicar por quê + abrir issue
🚫 console.log em produção    → Remover antes de commitar. Usar logger se necessário.
🚫 export default              → Sempre export nomeado (facilita refactoring)
🚫 Secrets no código           → Tudo em .env. Prefixo EXPO_PUBLIC_ apenas para valores públicos.
🚫 Imports relativos longos   → Usar alias @/
🚫 Lógica de negócio em tela  → Telas orquestram. Lógica vai em lib/, services/, stores/.
🚫 Supabase direto no componente → Passar por services/
🚫 CSS inline complexo         → Extrair para StyleSheet ou styled components
🚫 Commit sem rodar types      → npm run types antes de todo commit
🚫 String hardcoded na UI      → Usar i18n: t('chave')
🚫 Bucket público              → Todos os buckets de Storage são PRIVATE
🚫 catch vazio                 → Sempre tratar ou relançar
🚫 dangerouslySetInnerHTML     → Nunca. Renderizar texto como texto.
```

---

## 11. Estilo de Código (Prettier + ESLint)

### Prettier (`.prettierrc`)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

### ESLint (regras relevantes)

```json
{
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "import/order": ["error", {
      "groups": [
        "builtin",
        "external",
        "internal",
        "parent",
        "sibling",
        "type"
      ],
      "newlines-between": "always"
    }],
    "react/function-component-definition": ["error", {
      "namedComponents": "function-declaration"
    }],
    "no-restricted-imports": ["error", {
      "patterns": ["../../*"]
    }]
  }
}
```

---

## 12. Git

### Branches

```
main              → Produção. Sempre deployável.
develop           → Integração. Features mergem aqui.
feat/nome-curto   → Feature nova. Ex: feat/nugent-calculator
fix/nome-curto    → Bug fix. Ex: fix/pdf-logo-alignment
```

### Commits (Conventional Commits em português)

```
feat: adiciona cálculo automático do score de Nugent
fix: corrige alinhamento do logo no PDF
refactor: extrai validação de laudo para lib/validators
chore: atualiza dependências do Expo SDK 52
docs: documenta decisão sobre edição de laudo finalizado
test: adiciona testes para todas as combinações de morfotipos
```

### Antes de commitar

```bash
npm run types      # TypeScript sem erros
npm run lint       # ESLint sem erros
npm run test       # Testes passando
```

---

## 13. Como Rodar

### Primeiro setup

```bash
# 1. Clonar e instalar
git clone <repo> && cd microlaudo
npm install

# 2. Configurar ambiente
cp .env.example .env
# Editar .env com suas chaves do Supabase, RevenueCat, Stripe

# 3. Supabase local (precisa do Docker)
npx supabase start
npm run db:migrate
npm run db:seed

# 4. Gerar tipos do banco
npm run db:types
```

### Desenvolvimento diário

```bash
npm run dev          # Expo — abre no celular via QR code
npm run dev:web      # Versão web no browser

npm run test         # Roda todos os testes
npm run test:watch   # Testes em modo watch (roda só o que mudou)

npm run types        # Verifica tipos sem compilar
npm run lint         # Verifica estilo de código
```

### Build para produção

```bash
npm run build:ios       # Build iOS via EAS
npm run build:android   # Build Android via EAS
npm run build:web       # Export web estático

npm run db:migrate      # Aplica migrations no Supabase de produção
```

### Banco de dados

```bash
npm run db:migrate   # Aplica migrations pendentes
npm run db:reset     # Dropa e recria tudo (⚠️ só local!)
npm run db:seed      # Popula com dados fake
npm run db:types     # Regenera src/types/database.ts
```

---

## 14. Instruções para o Claude

Quando o Claude estiver escrevendo código para este projeto:

```
1. LER este arquivo CONVENTIONS.md antes de escrever qualquer código.
2. LER docs/modelo-dominio.md para entender as regras de negócio.
3. LER docs/DECISOES.md para entender as decisões já tomadas.

Ao gerar código:
- Seguir a ordem de imports da seção 4.
- Usar aliases @/ em vez de imports relativos.
- Tipar tudo. Zero `any`.
- Export nomeado, nunca default.
- Lógica de negócio em src/lib/, nunca em componentes.
- Erros via AppError com código padronizado.
- Strings de UI via i18n: t('chave').
- Testes em português nos describes/its.
- Componentes como function declaration, não arrow function.

Ao gerar migrations SQL:
- Número sequencial: 007_add_campo.sql
- Tabelas em snake_case plural.
- Sempre incluir RLS + policies.

Ao sugerir dependências:
- Verificar compatibilidade com Expo SDK 52.
- Preferir libs com suporte web (React Native Web).
- Sem dependências que exijam eject do Expo.
```

---

*Se algo neste arquivo estiver errado ou desatualizado, ATUALIZE-O. Convenção desatualizada é pior que nenhuma convenção.*
