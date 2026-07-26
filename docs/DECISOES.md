# DECISÕES.md — MicroLaudo

Diário de decisões arquiteturais. Cada entrada registra o contexto, a escolha, o que foi descartado e o risco aceito.

---

## 2026-04-18 — ADR-001: React Native + Expo como framework mobile

**Contexto:** Preciso de um app para iOS, Android e Web, sou desenvolvedor solo sem experiência mobile, e não tenho prazo definido. A prioridade é produtividade e manutenção mínima.

**Escolha:** React Native com Expo (SDK 52+). Uma codebase para iOS e Android, com ~70% de reuso para a versão Web (React/Vite). Expo simplifica build, OTA updates, e abstrai configuração nativa.

**Alternativas descartadas:**
- **Flutter:** Excelente performance e UI, mas Dart é uma linguagem a mais para aprender. Compartilhamento de código com web é possível mas menos maduro. Comunidade menor em PT-BR.
- **Nativo (Swift + Kotlin):** Duas codebases, o dobro de trabalho. Inviável solo.
- **PWA pura:** Não tem acesso decente à câmera em iOS, e App Store / Play Store são canais de distribuição importantes para o modelo de assinatura.

**Risco aceito:** Dependência do Expo. Se precisar de módulo nativo muito específico, pode ser necessário ejetar do Expo (expo prebuild). Mitigo usando apenas bibliotecas com suporte Expo comprovado.

---

## 2026-04-18 — ADR-002: Supabase como backend (BaaS)

**Contexto:** O app precisa de: autenticação (e-mail, Google, Apple), banco relacional (laudos com muitos campos estruturados), storage de imagens (fotos + logos), e segurança por médico (LGPD). Sou solo e não quero manter servidor.

**Escolha:** Supabase. Oferece Auth, PostgreSQL, Storage e Edge Functions como serviço gerenciado. Row Level Security (RLS) resolve isolamento de dados por médico nativamente no banco. Tier gratuito generoso para o volume inicial (~200 laudos/mês).

**Alternativas descartadas:**
- **Firebase:** Firestore (NoSQL) não é ideal para dados altamente estruturados como laudos com 20+ campos tipados. Queries complexas (busca por paciente + data) são limitadas. Vendor lock-in forte com Google.
- **Backend próprio (Node/Django + PostgreSQL):** Máxima flexibilidade, mas preciso provisionar, manter, escalar e proteger um servidor. Overhead desproporcional para um dev solo no início.
- **AWS Amplify:** Curva de aprendizado íngreme, console confuso, e o modelo de pricing é menos previsível.

**Risco aceito:** Dependência de um vendor (Supabase). Se Supabase tiver problemas ou mudar pricing, a migração é viável porque o banco é PostgreSQL padrão — posso exportar e rodar em qualquer lugar. Não é como sair do Firestore.

---

## 2026-04-18 — ADR-003: PDF gerado no client-side com @react-pdf/renderer

**Contexto:** O laudo em PDF é o deliverable principal do app. Precisa conter: cabeçalho com logo, dados do paciente, até 3 fotos, achados, scores, conclusão, assinatura e rodapé institucional. A geração precisa ser rápida (< 5s).

**Escolha:** `@react-pdf/renderer` rodando no dispositivo do médico (client-side). A biblioteca permite construir o layout do PDF usando componentes React, com suporte a imagens, fontes e estilos. Sem round-trip ao servidor.

**Alternativas descartadas:**
- **Puppeteer em Edge Function (server-side):** Gera PDFs a partir de HTML renderizado. Mais flexível para layouts complexos, mas adiciona latência de rede, custo de compute, e complexidade. Reservo como fallback.
- **jsPDF:** API de baixo nível (posicionar texto por coordenada). Produtivo para PDFs simples, mas doloroso para um layout com fotos + tabelas + cabeçalho/rodapé.
- **Serviço externo (DocRaptor, PDFShift):** Custo mensal, dependência de terceiro, e latência. Overkill para esse caso.

**Risco aceito:** `@react-pdf/renderer` pode ter limitações com layouts muito complexos ou imagens grandes. Se o PDF ficar lento ou o layout não ficar fiel ao template, migro para Puppeteer em Supabase Edge Function. Testo com o template real antes de commitar.

---

## 2026-04-18 — ADR-004: RevenueCat + Stripe para pagamentos

**Contexto:** O app terá assinatura mensal e anual, com trial de 2 laudos. Preciso cobrar na App Store, Play Store e Web. Apple e Google exigem uso do sistema de pagamento in-app para apps distribuídos nas lojas.

**Escolha:** RevenueCat para gerenciar subscriptions no iOS e Android (abstrai App Store Connect e Google Play Billing). Stripe para assinaturas via Web. RevenueCat integra com Stripe, então tenho um dashboard unificado.

**Alternativas descartadas:**
- **Implementar Apple/Google billing direto:** APIs complexas, receipt validation manual, edge cases de renovação/cancelamento. RevenueCat resolve tudo isso e é gratuito até $2.5k MRR.
- **Só Stripe para tudo:** Apple não permite. Se o app é distribuído na App Store, assinaturas de conteúdo digital DEVEM usar In-App Purchase. Stripe só funciona para web.
- **Sem monetização inicialmente:** Tentador, mas o trial com limite precisa da infraestrutura de subscription desde o dia 1 para bloquear corretamente.

**Risco aceito:** Apple e Google ficam com 30% (15% no primeiro ano com Small Business Program). Já considero isso no pricing. Se o volume crescer, os 30% doem — mas não há alternativa para apps nas lojas.

---

## 2026-04-18 — ADR-005: Sem IA na v1

**Contexto:** Existe a possibilidade de usar visão computacional para sugerir classificação automática da flora vaginal a partir das fotos da lâmina. Seria um diferencial, mas o médico parceiro levantou que verificar sugestões de IA pode tomar mais tempo do que preencher os campos diretamente.

**Escolha:** Não incluir IA na v1. O valor principal do app é agilidade via formulário guiado (seletores, cálculo automático de Nugent), não classificação automática. Validar o produto primeiro com usuários reais.

**Alternativas descartadas:**
- **IA como feature principal:** Exigiria: dataset de treinamento validado por especialistas, modelo de classificação (CNN), infraestrutura de inference (GPU), e validação clínica. Meses de trabalho antes de ter um MVP.
- **IA como sugestão opcional:** Menos arriscado, mas ainda assim adiciona complexidade (UI de "aceitar/rejeitar sugestão", edge cases de erro, expectativa de precisão). Melhor deixar para v2 se houver demanda.

**Risco aceito:** Se um concorrente lançar algo com IA antes, pode parecer mais inovador. Mitigo com velocidade de execução: um app simples que funciona bem hoje vale mais do que um app com IA que demora 6 meses para lançar.

---

## 2026-04-18 — ADR-006: Clínica como dados opcionais

**Contexto:** Inicialmente modelei a Clínica como obrigatória (todo examinador tem uma). Mas nem todo médico atua vinculado a uma clínica — alguns atendem de forma autônoma ou em múltiplos locais.

**Escolha:** Todos os dados da clínica (nome, CNPJ, endereço, logo) são opcionais. O médico pode preencher tudo, parte, ou nada. O PDF se adapta: se tem logo, mostra o cabeçalho; se não tem, o laudo sai sem cabeçalho institucional.

**Alternativas descartadas:**
- **Clínica obrigatória:** Forçaria médicos autônomos a inventar dados institucionais ou abandonar o onboarding. Fricção desnecessária.
- **Múltiplas clínicas por médico:** Possível cenário real (médico atende em 2 clínicas), mas adiciona complexidade (seletor "qual clínica?" a cada laudo). Não vale na v1. Se surgir demanda, adiciono depois.

**Risco aceito:** Um laudo sem dados institucionais pode parecer "incompleto" para alguns pacientes. Mas isso é decisão do médico, não do app.

---

## 2026-04-18 — ADR-007: Laudo finalizado é editável (com número de revisão)

**Contexto:** Inicialmente defini que laudos finalizados seriam imutáveis para preservar integridade. Mas erro humano acontece — um typo no nome do paciente, um score selecionado errado, foto trocada. Forçar o médico a criar um laudo novo do zero por causa de um erro de digitação seria péssima UX.

**Escolha:** Laudos finalizados podem ser editados. Ao editar, o laudo volta ao estado "rascunho", o PDF anterior é descartado, e ao re-finalizar gera um novo PDF. Um número de revisão é incrementado (1, 2, 3...) para manter rastreabilidade. Editar não consome cota do trial novamente.

**Alternativas descartadas:**
- **Imutável total:** Seguro do ponto de vista documental, mas inviável na prática clínica. Médico teria que criar novo laudo para cada erro — e ficaria com laudos "lixo" no histórico.
- **Versionamento completo (manter todas as versões):** Cada edição geraria uma nova versão e a anterior ficaria arquivada. Robusto para auditoria, mas overengineering para a v1. O número de revisão já dá rastreabilidade mínima. Se regulação exigir versionamento completo no futuro, a estrutura suporta evolução.
- **Edição livre sem rastreamento:** Simples, mas perigoso. Se um laudo é editado 5 vezes sem nenhum registro, perde-se a noção de que houve alterações. O número de revisão é o meio-termo.

**Risco aceito:** Um médico pode editar um laudo já impresso e entregue ao paciente, gerando versão diferente da que o paciente tem. Isso é risco ético, mas é responsabilidade do profissional, não do app. O número de revisão serve como indicador de que houve alteração.

---

## 2026-04-18 — ADR-008: Trial vinculado à conta, não ao dispositivo

**Contexto:** O trial é de 2 laudos. Precisa ser anti-burla: o médico não pode desinstalar o app, criar nova conta local, ou limpar dados para ganhar laudos grátis infinitamente.

**Escolha:** O contador de laudos do trial fica no servidor (Supabase), vinculado à conta do examinador (e-mail ou OAuth). Nenhuma ação no dispositivo (desinstalar, limpar cache, trocar de celular) reseta o contador.

**Alternativas descartadas:**
- **Trial por device ID:** Fácil de burlar (factory reset, outro celular). E device ID é instável no iOS (muda com reinstalação).
- **Trial por tempo (ex: 7 dias grátis):** O médico pode fazer 0 laudos nos 7 dias e perder o trial sem experimentar. Trial por uso (2 laudos) garante que ele experimentou o fluxo completo pelo menos 2 vezes.
- **Sem trial (paywall imediato):** Barreia demais a conversão. O médico precisa ver valor antes de pagar.

**Risco aceito:** O médico pode criar uma segunda conta com outro e-mail para ganhar mais 2 laudos grátis. Isso é aceitável — na prática, 4 laudos grátis (2 contas) ainda não substituem uma assinatura para uso real. E o esforço de manter 2 contas é dissuasivo o suficiente.

---

## 2026-04-18 — ADR-009: Paciente não é entidade independente

**Contexto:** O laudo contém dados do paciente (nome, data de nascimento, data da coleta, solicitante). Poderia existir um "cadastro de pacientes" onde o médico registra uma vez e reutiliza em laudos futuros.

**Escolha:** Paciente é apenas dados dentro de cada laudo. Não existe tabela separada de pacientes, nem busca por paciente para vincular a um laudo. O médico digita os dados a cada laudo.

**Alternativas descartadas:**
- **Cadastro de pacientes:** Adiciona uma entidade inteira, tela de CRUD, busca, vínculo com laudos. Útil para clínicas de alto volume, mas overscope para a v1. A médica parceira faz ~5 laudos/dia — digitar o nome é mais rápido do que buscar em um cadastro.
- **Autocomplete por histórico:** Meio-termo — sem cadastro formal, mas o app sugere nomes de pacientes de laudos anteriores. Boa ideia para v2, mas na v1 é feature creep.

**Risco aceito:** Se o médico faz muitos laudos do mesmo paciente (retorno), vai redigitar os dados. Pequeno incômodo, mas não é bloqueante. Se virar dor recorrente nos feedbacks, adiciono autocomplete.

---

## 2026-04-18 — ADR-010: Assinatura digital simples (imagem) vs. ICP-Brasil

**Contexto:** O laudo precisa ter assinatura do examinador. Existe a opção de assinatura digital juridicamente válida via certificado ICP-Brasil (como se usa no PJe, NFe), ou uma solução mais simples com imagem da assinatura + CRM/RQE.

**Escolha:** Assinatura simples — o médico faz upload de uma imagem da sua assinatura manuscrita, que é inserida no rodapé do PDF junto com nome, CRM e RQE.

**Alternativas descartadas:**
- **Certificado digital ICP-Brasil:** Juridicamente válido, mas exige: token USB ou certificado A1, integração com bibliotecas de assinatura (iText, PortableSigner), e fluxo complexo no mobile. Custo alto (certificado custa R$ 100-300/ano para o médico) e UX ruim. Poucos médicos têm certificado digital.
- **Assinatura no touch screen:** O médico "assina" com o dedo na tela do celular. Intuitivo, mas a qualidade da assinatura em tela touch é ruim e pouco profissional no PDF.

**Risco aceito:** A imagem de assinatura não tem validade jurídica equivalente a ICP-Brasil. Na prática, a maioria dos laudos de microscopia são impressos e assinados manualmente com carimbo — o PDF digital é complementar. Se demanda por ICP-Brasil surgir, posso adicionar como feature premium.

---

## 2026-04-18 — ADR-011: Zustand como gerenciamento de estado

**Contexto:** O fluxo de criação do laudo tem 6 steps. O estado do laudo em progresso (dados do paciente, fotos, achados, scores) precisa ser mantido entre as telas. Preciso de uma solução de estado que funcione tanto no React Native quanto no React Web.

**Escolha:** Zustand. Leve (~1KB), API mínima (sem boilerplate), funciona em RN e Web sem adaptação. Permite persistir estado com middleware (para não perder rascunho se o app fechar).

**Alternativas descartadas:**
- **Redux Toolkit:** Poderoso, mas verboso para um app desse porte. Boilerplate de slices, reducers e actions é desproporcional.
- **Context API (React nativo):** Funciona para estado simples, mas causa re-renders desnecessários em árvores de componentes grandes (como o formulário de 6 steps).
- **Jotai / Recoil:** Bons, mas Zustand tem ecossistema mais maduro e middleware de persistência pronto.

**Risco aceito:** Zustand é mantido primariamente por uma pessoa (Daishi Kato). Se ele abandonar, a migração seria necessária. Risco baixo — o projeto é muito popular e tem comunidade ativa.

---

## 2026-04-18 — ADR-012: i18n desde o dia 1 com react-i18next

**Contexto:** O app lança em PT-BR, mas o criador quer suportar outros idiomas no futuro. Adicionar i18n depois é doloroso — strings hardcoded se espalham por todo o código.

**Escolha:** Usar `react-i18next` desde o primeiro commit. Todas as strings de UI vão em arquivos JSON de tradução (`/locales/pt-BR/`). Na v1, só PT-BR existe, mas a estrutura está pronta.

**Alternativas descartadas:**
- **Fazer i18n depois:** Mais rápido no curto prazo, mas criar débito técnico significativo. Extrair strings hardcoded de 50+ telas é trabalhoso e propenso a bugs.
- **Solução custom (objeto de strings):** Funciona, mas react-i18next oferece pluralização, interpolação, fallback de idioma e lazy loading de traduções — coisas que eventualmente seriam necessárias.

**Risco aceito:** i18n desde o dia 1 adiciona ~10% de overhead no desenvolvimento (toda string passa pelo `t('chave')`). Aceito o custo porque a alternativa (refatorar depois) é pior.

---

*Última atualização: 18 de abril de 2026*
*Próxima decisão pendente: definir se o cálculo de Nugent no input do médico será via slider ou seletor segmentado (decisão de UX, não de arquitetura — resolver no protótipo).*
