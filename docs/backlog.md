# Backlog Completo — MicroLaudo (Vibecoding Estruturado)

**Modelo de trabalho:** Você direciona, eu coido, você testa no celular/browser, me dá feedback, eu corrijo.

---

## Como ler este backlog

**Sessão** = uma conversa comigo onde eu implemento uma ou mais features. Cada sessão produz código funcional que você testa.

**Tempo por sessão:** ~30-60 min da sua parte (explicar o que quer + testar o resultado). Do meu lado, eu gero o código na hora.

**O que SÓ VOCÊ pode fazer** (marcado com 👤): criar contas, configurar dashboards, testar no celular físico, submeter nas lojas, decisões de negócio. Essas tarefas têm tempo real estimado.

**O que EU faço** (marcado com 🤖): escrever código, criar migrations, configurar arquivos, gerar templates, escrever testes.

---

## Fase 0 — Fundação

| # | Feature | Quem faz o quê | Sessões | 👤 Tempo seu |
|---|---------|----------------|---------|-------------|
| F00 | **Criar projeto Expo** | 🤖 Eu gero os comandos exatos e configs. 👤 Você roda no terminal. | 1 | 20 min |
| F01 | **Configurar projeto** | 🤖 Eu crio: tsconfig, ESLint, Prettier, aliases, .env.example, .gitignore, estrutura de pastas inteira. | 1 | 10 min (rodar comandos) |
| F02 | **Supabase setup** | 👤 Você cria conta em supabase.com e projeto. 🤖 Eu gero todas as migrations, config.toml, e comandos. 👤 Você roda. | 1 | 30 min |
| F03 | **Navegação base** | 🤖 Eu crio todos os layouts e telas placeholder do Expo Router. Você testa navegação no celular/browser. | 1 | 15 min (testar) |
| F04 | **i18n + Zustand setup** | 🤖 Eu crio tudo: config i18n, stores vazias, arquivos de tradução. | 1 | 5 min (verificar) |

**Fase 0: 5 sessões · ~1.5h do seu tempo · 1 semana**

---

## Fase 1 — Auth e Perfil

| # | Feature | Quem faz o quê | Sessões | 👤 Tempo seu |
|---|---------|----------------|---------|-------------|
| F05 | **Migrations: doctors + audit_log** | 🤖 Eu escrevo todo o SQL (tabelas, RLS, policies, FORCE). 👤 Você roda `db:migrate`. | 1 | 10 min |
| F06 | **Auth service + Login + Cadastro + Esqueci senha** | 🤖 Eu crio tudo junto: services/auth.ts, tela de login, cadastro, recuperação de senha, guarda de rota. | 1 | 20 min (testar fluxo) |
| F07 | **Supabase Auth config** | 👤 Você configura no Supabase Dashboard: habilitar e-mail/senha, ativar confirmação de e-mail, rate limiting. 🤖 Eu te dou o passo-a-passo exato com screenshots. | 1 | 20 min |
| F08 | **Componentes UI base** | 🤖 Eu crio: Button, Input, Checkbox, Select, todos estilizados e consistentes. | 1 | 10 min (olhar visual) |
| F09 | **Tela de Perfil** | 🤖 Eu crio: formulário completo (CRM, RQE, clínica opcional), services/profile.ts, validação. | 1 | 15 min (testar) |

**Fase 1: 5 sessões · ~1.5h do seu tempo · 1 semana**

---

## Fase 2 — Fluxo do Laudo (core)

| # | Feature | Quem faz o quê | Sessões | 👤 Tempo seu |
|---|---------|----------------|---------|-------------|
| F10 | **Migrations: reports + report_images** | 🤖 Eu escrevo todo o SQL. | 1 | 10 min |
| F11 | **Service + Store de laudos + tipos** | 🤖 Eu crio: services/reports.ts, reportStore, types/report.ts. | 1 | 5 min |
| F12 | **Step 1: Dados do Paciente** | 🤖 Eu crio tela completa: formulário, date picker, validação, integração com store. | 1 | 15 min (testar) |
| F13 | **Step 2: Fotos (câmera + galeria + crop + grid)** | 🤖 Eu crio: PhotoPicker, ImageCropper, PhotoGrid, tela completa. | 2 | 30 min (testar câmera no celular) |
| F14 | **Upload de fotos para Storage** | 🤖 Eu crio: services/images.ts, bucket, policies. | 1 | 10 min |
| F15 | **Step 3: Achados Microscópicos** | 🤖 Eu crio: Select qualitativo, FindingsForm (11 achados), descrição livre, tela completa. | 1 | 15 min (validar campos com a médica) |
| F16 | **Step 4: Nugent + Amsel** | 🤖 Eu crio: NugentCalculator, AmselCriteria, lib/nugent.ts, lib/amsel.ts + testes. Tela completa. | 1 | 15 min (testar cálculos) |
| F17 | **Step 5: Conclusão + referência** | 🤖 Eu crio tela com conclusão e referência bibliográfica. | 1 | 10 min |
| F18 | **Lógicas puras + testes** | 🤖 Eu crio: validators, description-generator, format + todos os testes unitários. | 1 | 5 min (rodar npm test) |
| F19 | **StepIndicator + navegação entre steps** | 🤖 Eu crio: progress bar, lógica próximo/voltar, validação por step. | 1 | 10 min |

**Fase 2: 11 sessões · ~2h do seu tempo · 2-3 semanas**

---

## Fase 3 — PDF

| # | Feature | Quem faz o quê | Sessões | 👤 Tempo seu |
|---|---------|----------------|---------|-------------|
| F20 | **Setup @react-pdf/renderer** | 🤖 Eu instalo, configuro, gero PDF de teste. | 1 | 10 min |
| F21 | **Template do PDF completo** | 🤖 Eu replico o template: cabeçalho condicional, dados, fotos, achados, scores, conclusão, referência, assinatura, rodapé condicional. 3 variações. | 2 | 30 min (comparar com template, pedir ajustes) |
| F22 | **Step 6: Preview + Download + Finalizar** | 🤖 Eu crio: preview, download (mobile+web), upload Storage, audit_log. | 1 | 20 min (testar gerar e baixar) |

**Fase 3: 4 sessões · ~1h do seu tempo · 1 semana**

---

### ✅ MARCO: MVP validável (Semana ~7)
App funcionando: login → criar laudo → fotos → achados → Nugent/Amsel → conclusão → PDF.
Pronto para a médica parceira testar.

---

## Fase 4 — Histórico e Edição

| # | Feature | Quem faz o quê | Sessões | 👤 Tempo seu |
|---|---------|----------------|---------|-------------|
| F23 | **Tela de Histórico + busca** | 🤖 Eu crio: lista, ReportCard, busca, filtros. | 1 | 15 min |
| F24 | **Visualizar + Reimprimir** | 🤖 Eu crio: preview do PDF do histórico, botão reimprimir. | 1 | 10 min |
| F25 | **Editar laudo finalizado** | 🤖 Eu crio: fluxo completo de edição com revisão + audit_log. | 1 | 15 min |
| F26 | **Continuar rascunho** | 🤖 Eu crio: carregar rascunho no store, ir para step correto. | 1 | 10 min |

**Fase 4: 4 sessões · ~50min do seu tempo · 1 semana**

---

## Fase 5 — Perfil Completo

| # | Feature | Quem faz o quê | Sessões | 👤 Tempo seu |
|---|---------|----------------|---------|-------------|
| F27 | **Upload logo + assinatura + referência padrão** | 🤖 Eu crio tudo junto: uploads, buckets, policies, campos no perfil. | 1 | 15 min |

**Fase 5: 1 sessão · ~15min · 1 dia**

---

## Fase 6 — Auth Social

| # | Feature | Quem faz o quê | Sessões | 👤 Tempo seu |
|---|---------|----------------|---------|-------------|
| F28 | **Google Sign-In** | 👤 Cria projeto Google Cloud + configura OAuth (eu te guio). 🤖 Eu implemento no app. | 1 | 45 min |
| F29 | **Apple Sign-In** | 👤 Cria Apple Developer Account + configura (eu te guio). 🤖 Eu implemento. | 1 | 1h |

**Fase 6: 2 sessões · ~2h do seu tempo · 1 semana**

---

## Fase 7 — Monetização

| # | Feature | Quem faz o quê | Sessões | 👤 Tempo seu |
|---|---------|----------------|---------|-------------|
| F30 | **RevenueCat setup** | 👤 Cria contas (RevenueCat, App Store Connect, Google Play Console), configura produtos. 🤖 Eu integro SDK. | 2 | 2h |
| F31 | **Stripe setup (web)** | 👤 Cria conta Stripe, configura produtos. 🤖 Eu integro checkout. | 1 | 30 min |
| F32 | **Tela de Planos + Paywall** | 🤖 Eu crio tudo: tela de planos, paywall, subscriptionStore. | 1 | 15 min |
| F33 | **Edge Functions (trial + webhook)** | 🤖 Eu crio: check-trial, payment-webhook, validação HMAC. | 1 | 10 min |
| F34 | **Testar fluxo de pagamento** | 👤 Você testa todos os cenários em sandbox. | 1 | 1h |

**Fase 7: 6 sessões · ~4h do seu tempo · 2 semanas**

---

## Fase 8 — i18n

| # | Feature | Quem faz o quê | Sessões | 👤 Tempo seu |
|---|---------|----------------|---------|-------------|
| F35 | **Extrair strings + tradução EN + seletor idioma** | 🤖 Eu faço tudo. | 1 | 15 min |

**Fase 8: 1 sessão · ~15min · 1 dia**

---

## Fase 9 — Polimento

| # | Feature | Quem faz o quê | Sessões | 👤 Tempo seu |
|---|---------|----------------|---------|-------------|
| F36 | **Testes unitários completos** | 🤖 Eu escrevo todos. | 1 | 5 min |
| F37 | **Teste RLS cruzado** | 🤖 Eu escrevo testes de isolamento. | 1 | 5 min |
| F38 | **Loading states + erros + empty states** | 🤖 Eu adiciono em todas as telas. | 1 | 15 min |
| F39 | **Responsividade web** | 🤖 Eu ajusto layouts. | 1 | 15 min |
| F40 | **Ícone + Splash + Onboarding** | 🤖 Eu crio tudo. 👤 Você me manda logo se tiver, senão eu gero placeholder. | 1 | 15 min |

**Fase 9: 5 sessões · ~1h do seu tempo · 1 semana**

---

## Fase 10 — Legal e Lançamento

| # | Feature | Quem faz o quê | Sessões | 👤 Tempo seu |
|---|---------|----------------|---------|-------------|
| F41 | **Política de Privacidade + Termos** | 🤖 Eu gero drafts completos. 👤 Você revisa. | 1 | 30 min |
| F42 | **Exclusão de conta** | 🤖 Eu implemento cascade delete completo. | 1 | 15 min |
| F43 | **Contas de desenvolvedor** | 👤 Você cria Apple Dev ($99/ano) + Google Play ($25). | 0 | 1-2h + espera 1-7 dias |
| F44 | **Build iOS + TestFlight** | 🤖 Eu configuro EAS Build. 👤 Você roda + configura certificados (eu te guio). | 1 | 1h |
| F45 | **Build Android + Deploy web** | 🤖 Eu configuro tudo. 👤 Você roda builds + conecta repo ao Vercel. | 1 | 30 min |
| F46 | **Beta com médica parceira** | 👤 Ela testa. 👤 Você coleta feedback. 🤖 Eu corrijo. | 3 | 2-3h (ao longo de 1-2 semanas) |
| F47 | **Migrar para produção** | 🤖 Eu gero checklist. 👤 Você executa + verifica segurança. | 1 | 30 min |
| F48 | **Submit App Store** | 🤖 Eu gero textos de listing. 👤 Você faz screenshots + submete. | 1 | 1-2h + espera review |
| F49 | **Submit Play Store** | 🤖 Eu gero textos. 👤 Você submete. | 1 | 30 min |

**Fase 10: 10 sessões · ~8h do seu tempo · 3-4 semanas (inclui esperas)**

---

## Resumo Geral

| Fase | Sessões comigo | 👤 Seu tempo | Semanas |
|------|---------------|-------------|---------|
| 0 — Fundação | 5 | 1.5h | 1 |
| 1 — Auth e Perfil | 5 | 1.5h | 1 |
| 2 — Fluxo do Laudo | 11 | 2h | 2-3 |
| 3 — PDF | 4 | 1h | 1 |
| 4 — Histórico e Edição | 4 | 50min | 1 |
| 5 — Perfil Completo | 1 | 15min | 1 dia |
| 6 — Auth Social | 2 | 2h | 1 |
| 7 — Monetização | 6 | 4h | 2 |
| 8 — i18n | 1 | 15min | 1 dia |
| 9 — Polimento | 5 | 1h | 1 |
| 10 — Legal e Lançamento | 10 | 8h | 3-4 |
| | | | |
| **TOTAL** | **54 sessões** | **~23h suas** | **~14-16 semanas** |

---

## Cenários de timeline

| Ritmo | Sessões/semana | Tempo total |
|-------|---------------|-------------|
| Intenso | 5-6 | ~10 semanas (~2.5 meses) |
| Regular | 3-4 | ~14-16 semanas (~4 meses) |
| Tranquilo | 1-2 | ~30 semanas (~7 meses) |

### MVP para validar com a médica (Fases 0-3):

| | Sessões | Seu tempo | Semanas |
|---|---------|----------|---------|
| **MVP** | 25 | ~6h | 6-7 |

---

## Ordem sessão a sessão

```
SEMANA 1:  F00 → F01 → F02 → F03 → F04
SEMANA 2:  F05 → F06 → F07 → F08
SEMANA 3:  F09 → F10 → F11 → F12
SEMANA 4:  F13 → F14 → F15
SEMANA 5:  F16 → F17 → F18 → F19
SEMANA 6:  F20 → F21
SEMANA 7:  F21 (cont.) → F22
           ──── MVP VALIDÁVEL ────
SEMANA 8:  F23 → F24 → F25 → F26
SEMANA 9:  F27 → F28
SEMANA 10: F29 → F30
SEMANA 11: F31 → F32 → F33 → F34
SEMANA 12: F35 → F36 → F37 → F38
SEMANA 13: F39 → F40 → F41 → F42
SEMANA 14: F43 → F44 → F45 → F46
SEMANA 15: F47 (beta com médica)
SEMANA 16: F47 (correções) → F48 → F49
```

---

*Cada sessão pode render 1 a 3 features. Sessões da Fase 2 são mais longas (mais código). Sessões da Fase 10 são mais curtas mas têm espera externa (reviews das lojas).*
