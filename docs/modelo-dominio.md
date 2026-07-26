# Modelo de Domínio — MicroLaudo

**Linguagem ubíqua do negócio · Sem código · Versão 1.0**

---

## 1. Glossário do Domínio (Linguagem Ubíqua)

Estes são os termos que toda a equipe (produto, dev, médicos) deve usar da mesma forma:

| Termo | Significado |
|-------|-------------|
| **Examinador** | O médico ginecologista que opera o app, examina a lâmina e assina o laudo |
| **Laudo** | O documento final (PDF) com achados microscópicos, fotos, scores e conclusão |
| **Paciente** | A pessoa cujo material foi coletado. Não é usuário do app — aparece apenas como dados dentro do laudo |
| **Lâmina** | A amostra de secreção vaginal preparada para microscopia. No app, representada pelas fotos |
| **Achados** | Tudo que o examinador observa na lâmina: tipos de flora, células, elementos fúngicos etc. |
| **Score de Nugent** | Pontuação de 0 a 10 que classifica a flora vaginal. Calculado a partir de 3 morfotipos observados |
| **Morfotipo** | Tipo de micro-organismo observado na coloração de Gram (Lactobacillus, Gardnerella, Mobiluncus) |
| **Critérios de Amsel** | Conjunto de 4 sinais clínicos usados para diagnosticar vaginose bacteriana |
| **Conclusão** | Interpretação clínica final do examinador sobre os achados |
| **Clínica** | Dados institucionais **opcionais** do examinador: nome da empresa, CNPJ, endereço, logo. Se não preenchidos, o laudo é gerado sem cabeçalho/rodapé institucional |
| **Assinatura (do laudo)** | Imagem da assinatura manuscrita + CRM + RQE que aparecem no rodapé do PDF |
| **Plano** | A modalidade de acesso ao app: Trial, Mensal ou Anual |
| **Trial** | Período de experimentação gratuita. Limitado a 2 laudos no total, nunca reseta |

---

## 2. Entidades do Domínio

### 2.1 Examinador

O protagonista do sistema. É quem usa o app, cria laudos e assina.

**Identidade:** Cada examinador é único pelo seu e-mail ou conta social (Google/Apple).

**Atributos próprios:**
- Nome completo
- CRM (registro no conselho regional de medicina)
- RQE (registro de qualificação de especialista em ginecologia)
- Imagem da assinatura manuscrita
- Idioma preferido

**O que o examinador "possui":**
- Zero ou uma Clínica (opcional — o examinador pode usar o app sem dados institucionais)
- Zero ou mais Laudos
- Exatamente um Plano ativo

---

### 2.2 Clínica (opcional)

Dados institucionais que aparecem no cabeçalho e rodapé do laudo. **Totalmente opcional** — o examinador pode gerar laudos sem preencher nenhum dado da clínica.

**Atributos (todos opcionais):**
- Nome da empresa
- CNPJ
- Endereço completo
- Telefone
- Logotipo (imagem)

**Regras:**
- A clínica é cadastrada uma vez no perfil e aplicada automaticamente aos laudos futuros.
- Se nenhum dado de clínica for preenchido, o laudo é gerado sem cabeçalho institucional (sem logo) e sem rodapé institucional (sem CNPJ/endereço). Os demais campos (paciente, fotos, achados, assinatura do médico) aparecem normalmente.
- O examinador pode preencher parcialmente (ex: só o logo, sem CNPJ). O PDF exibe apenas o que foi preenchido.
- Alterar a clínica não afeta laudos já finalizados.

---

### 2.3 Laudo

A entidade central do domínio. Um laudo é o registro completo de uma análise de microscopia vaginal de um paciente.

**Ciclo de vida:**

```
                    editar
               ┌──────────────┐
               ▼              │
 Rascunho ──────▶ Finalizado ─┘
 (preenchendo)     (PDF gerado)
```

Um laudo nasce como **rascunho** quando o examinador inicia o preenchimento. Torna-se **finalizado** quando o PDF é gerado. Um laudo finalizado pode ser **editado** — nesse caso, ele volta ao estado de rascunho, o PDF anterior é substituído, e um novo PDF é gerado ao re-finalizar. O laudo registra quantas vezes foi revisado (número da revisão).

**Um laudo contém:**
- Dados do paciente (seção 2.4)
- De 1 a 3 fotos da lâmina (seção 2.5)
- Achados microscópicos (seção 2.6)
- Score de Nugent com seus morfotipos (seção 2.7)
- Critérios de Amsel (seção 2.8)
- Descrição dos achados (texto livre)
- Conclusão (texto livre)
- Referência bibliográfica (editável, com valor padrão)
- Data da avaliação
- Número da revisão (começa em 1, incrementa a cada re-edição)

**Metadados fixos (não editáveis pelo examinador):**
- Material: "Secreção vaginal"
- Método: "Microscopia óptica (a fresco e coloração de Gram)"

---

### 2.4 Dados do Paciente (dentro do Laudo)

O paciente não é uma entidade independente no sistema — são dados dentro de cada laudo. Não há cadastro de pacientes separado.

**Atributos:**
- Nome completo
- Data de nascimento
- Data da coleta do material
- Nome do médico solicitante (quem pediu o exame — pode ser diferente do examinador)

---

### 2.5 Foto da Lâmina (dentro do Laudo)

Registro fotográfico do que foi observado na microscopia.

**Regras:**
- Mínimo 1, máximo 3 fotos por laudo
- Cada foto tem uma ordem de exibição (1ª, 2ª, 3ª)
- O examinador pode recortar (crop) a foto antes de incluir
- A foto pode vir da câmera (acoplada ao microscópio) ou da galeria do dispositivo
- Uma vez que o laudo é finalizado, as fotos não podem ser alteradas

---

### 2.6 Achados Microscópicos (dentro do Laudo)

O que o examinador observa na lâmina, registrado de forma estruturada. Cada achado é classificado em uma escala qualitativa de 4 níveis:

**Escala:** Ausente → Raros → Alguns → Numerosos

**Achados registrados:**

| Achado | O que é |
|--------|---------|
| Lactobacilos | Flora protetora normal (bastonetes gram-positivos grandes) |
| Cocos | Bactérias esféricas |
| Cocobacilos gram-positivos | Bactérias entre coco e bacilo, gram+ |
| Cocobacilos gram-negativos | Bactérias entre coco e bacilo, gram- |
| Leucócitos (polimorfonucleares) | Células de defesa — indicam inflamação |
| Hemácias | Glóbulos vermelhos — indicam sangramento |
| Células epiteliais | Células do revestimento vaginal |
| Elementos fúngicos (leveduras/hifas) | Indicam candidíase |
| Trichomonas | Protozoário — indica tricomoníase |
| Clue cells | Células epiteliais cobertas de bactérias — sinal de vaginose |
| Muco | Secreção mucosa |

**Regra:** Todos os achados são opcionais individualmente, mas o examinador deve preencher pelo menos os achados principais antes de finalizar (lactobacilos, leucócitos, elementos fúngicos, clue cells).

---

### 2.7 Score de Nugent (dentro do Laudo)

Sistema padronizado de pontuação que classifica a flora vaginal com base na observação de 3 morfotipos na coloração de Gram.

**Como funciona:**

O examinador observa cada morfotipo no campo de imersão (1000x) e informa a **quantidade por campo**:

| Morfotipo | Faixa de pontuação | O que observar |
|-----------|-------------------|----------------|
| **Lactobacillus** (bastonetes gram+ grandes) | 0 a 4 pontos (escala invertida: muitos = 0, nenhum = 4) | Quanto mais, mais saudável |
| **Gardnerella / Bacteroides** (bastonetes gram-variável pequenos) | 0 a 4 pontos (escala direta: nenhum = 0, muitos = 4) | Associados a vaginose |
| **Mobiluncus** (bastonetes curvos gram- ou gram-variável) | 0 a 2 pontos (escala direta) | Associados a vaginose |

**Pontuação por morfotipo e quantidade observada:**

**Lactobacillus (inversamente proporcional):**
- Nenhum por campo → 4 pontos
- Menos de 1 por campo → 3 pontos
- 1 a 4 por campo → 2 pontos
- 5 a 30 por campo → 1 ponto
- Mais de 30 por campo → 0 pontos

**Gardnerella / Bacteroides (diretamente proporcional):**
- Nenhum → 0 pontos
- Menos de 1 → 1 ponto
- 1 a 4 → 2 pontos
- 5 a 30 → 3 pontos
- Mais de 30 → 4 pontos

**Mobiluncus (diretamente proporcional):**
- Nenhum → 0 pontos
- Menos de 5 → 1 ponto
- 5 ou mais → 2 pontos

**Cálculo:** Score final = pontos Lactobacillus + pontos Gardnerella + pontos Mobiluncus

**Interpretação automática do app:**

| Score | Classificação | Significado |
|-------|--------------|-------------|
| 0 a 3 | Flora tipo I (normal) | Predominância de lactobacilos |
| 4 a 6 | Flora tipo II (intermediária) | Flora mista, situação de transição |
| 7 a 10 | Flora tipo III (vaginose bacteriana) | Desequilíbrio, compatível com vaginose |

**Regras:**
- O examinador informa apenas as quantidades dos 3 morfotipos
- O app calcula o score e a classificação automaticamente
- O score aparece no laudo como "Escore de Nugent: X/10"

---

### 2.8 Critérios de Amsel (dentro do Laudo)

Conjunto de 4 sinais clínicos para diagnóstico de vaginose bacteriana. Diferente do Nugent (que é laboratorial), o Amsel inclui observações clínicas.

**Os 4 critérios:**

| # | Critério | Tipo de input |
|---|----------|--------------|
| 1 | Corrimento vaginal homogêneo, fino, acinzentado | Presente ou ausente (checkbox) |
| 2 | Whiff test positivo (odor de peixe ao adicionar KOH 10%) | Presente ou ausente (checkbox) |
| 3 | Clue cells em mais de 20% das células epiteliais | Presente ou ausente (checkbox) |
| 4 | pH vaginal acima de 4,5 | Presente ou ausente (checkbox) + valor numérico do pH |

**Regra de diagnóstico:** 3 ou mais critérios presentes = sugestivo de vaginose bacteriana. O app exibe essa contagem mas **não impõe diagnóstico** — a conclusão é sempre do examinador.

---

### 2.9 Plano (associado ao Examinador)

Controla o acesso e os limites de uso do app.

**Modalidades:**

| Plano | Duração | Limite de laudos | Renovação |
|-------|---------|-----------------|-----------|
| **Trial** | Sem expiração de tempo | 2 laudos no total (lifetime) | Não renova. Ao atingir 2, exige upgrade |
| **Mensal** | 30 dias, renova automaticamente | Ilimitado | Automática via loja |
| **Anual** | 365 dias, renova automaticamente | Ilimitado | Automática via loja |

**Regras de negócio críticas:**

- O trial é por **conta**, não por dispositivo. Desinstalar o app, trocar de celular ou limpar dados não reseta o contador.
- O contador de laudos do trial conta apenas laudos **finalizados** (rascunhos não contam).
- Ao atingir o limite do trial, o examinador pode visualizar laudos já criados, mas não pode finalizar novos.
- Se o plano pago expirar (cancelamento, falha de pagamento), o examinador volta ao estado de "expirado": pode ver laudos antigos, mas não criar novos.
- Nunca se perde acesso aos laudos já gerados, independentemente do estado do plano.

---

## 3. Mapa de Relacionamentos

```
                        ┌─────────────────┐
                        │   EXAMINADOR    │
                        │                 │
                        │ • Nome          │
                        │ • CRM / RQE    │
                        │ • Assinatura    │
                        │ • Idioma        │
                        └───┬─────┬───┬───┘
                            │     │   │
              possui zero    │     │   │   possui um
              ou uma         │     │
            ┌───────────────┘     │   └──────────────────┐
            ▼                     │                      ▼
   ┌─────────────────┐           │              ┌──────────────┐
   │    CLÍNICA       │           │              │    PLANO     │
   │   (opcional)     │           │              │              │
   │ • Nome empresa   │           │              │ • Modalidade │
   │ • CNPJ           │           │              │   (trial/    │
   │ • Endereço       │           │              │    mensal/   │
   │ • Logo           │           │              │    anual)    │
   │                  │           │              │ • Laudos     │
   │ Se preenchida,   │           │              │   usados     │
   │ aparece no       │           │              │   (trial)    │
   │ cabeçalho/rodapé │           │              └──────────────┘
   │ do laudo         │           │
   └──────────────────┘           │ cria zero ou mais
                                  │
                                  ▼
                        ┌─────────────────────────────────────┐
                        │              LAUDO                   │
                        │                                     │
                        │  ┌───────────────────────────────┐  │
                        │  │  DADOS DO PACIENTE            │  │
                        │  │  • Nome, nascimento           │  │
                        │  │  • Data coleta, solicitante   │  │
                        │  └───────────────────────────────┘  │
                        │                                     │
                        │  ┌───────────────────────────────┐  │
                        │  │  FOTOS DA LÂMINA (1 a 3)      │  │
                        │  │  • Imagem (câmera ou galeria) │  │
                        │  │  • Ordem de exibição          │  │
                        │  └───────────────────────────────┘  │
                        │                                     │
                        │  ┌───────────────────────────────┐  │
                        │  │  ACHADOS MICROSCÓPICOS        │  │
                        │  │  • 11 itens observados        │  │
                        │  │  • Escala: ausente → raros    │  │
                        │  │    → alguns → numerosos       │  │
                        │  │  • Descrição livre            │  │
                        │  └───────────────────────────────┘  │
                        │                                     │
                        │  ┌───────────────────────────────┐  │
                        │  │  SCORE DE NUGENT              │  │
                        │  │  • 3 morfotipos informados    │  │
                        │  │  • Score calculado (0-10)     │  │
                        │  │  • Classificação automática   │  │
                        │  │    (tipo I / II / III)        │  │
                        │  └───────────────────────────────┘  │
                        │                                     │
                        │  ┌───────────────────────────────┐  │
                        │  │  CRITÉRIOS DE AMSEL           │  │
                        │  │  • 4 critérios (sim/não)      │  │
                        │  │  • Valor do pH (numérico)     │  │
                        │  │  • Contagem de positivos      │  │
                        │  └───────────────────────────────┘  │
                        │                                     │
                        │  • Conclusão (texto livre)          │
                        │  • Referência bibliográfica         │
                        │  • Estado: Rascunho / Finalizado    │
                        │  • Data da avaliação                │
                        │  • PDF gerado                       │
                        └─────────────────────────────────────┘
```

---

## 4. Regras de Negócio Consolidadas

### Criação do Laudo

| # | Regra |
|---|-------|
| RN01 | Um laudo pertence a exatamente um examinador. Nenhum outro examinador pode vê-lo. |
| RN02 | O laudo deve ter pelo menos 1 foto e no máximo 3. |
| RN03 | As fotos são ordenadas (1ª, 2ª, 3ª) e aparecem nessa ordem no PDF. |
| RN04 | Os campos "Material" e "Método" são fixos e não editáveis. |
| RN05 | A referência bibliográfica vem pré-preenchida com Nugent (1991), mas o examinador pode alterar livremente. |
| RN06 | Se o examinador preencheu dados da clínica e/ou assinatura no perfil, eles são puxados automaticamente para o laudo. Se não preencheu, o laudo é gerado sem esses elementos — nada é obrigatório. |

### Score de Nugent

| # | Regra |
|---|-------|
| RN07 | O examinador informa apenas a quantidade observada de cada morfotipo. O app faz a conversão em pontos e soma. |
| RN08 | O score é a soma dos 3 morfotipos: Lactobacillus (0-4, invertido) + Gardnerella (0-4) + Mobiluncus (0-2). Máximo possível: 10. |
| RN09 | A classificação (tipo I, II ou III) é derivada automaticamente e exibida como informação auxiliar — não substitui a conclusão do examinador. |

### Critérios de Amsel

| # | Regra |
|---|-------|
| RN10 | Cada critério é independente (sim/não). O campo de pH é numérico e opcional (o examinador pode marcar "pH > 4.5" como positivo sem informar o valor exato). |
| RN11 | O app exibe a contagem de critérios positivos (ex: "3/4 positivos"), mas não emite diagnóstico. A interpretação é responsabilidade do examinador. |

### Ciclo de Vida do Laudo

| # | Regra |
|---|-------|
| RN12 | Um laudo só pode ser finalizado se tiver: dados do paciente (nome, data coleta), pelo menos 1 foto, e conclusão preenchida. |
| RN13 | Ao finalizar, o PDF é gerado e o laudo muda de "rascunho" para "finalizado". |
| RN14 | Um laudo finalizado **pode ser editado** para corrigir erros. Ao editar, o laudo volta ao estado "rascunho", o PDF anterior é descartado, e o examinador deve re-finalizar para gerar um novo PDF. O número da revisão é incrementado (ex: revisão 1, 2, 3...). |
| RN15 | Rascunhos podem ser editados livremente até serem finalizados. |
| RN15b | Editar um laudo finalizado **não consome cota do trial** novamente — o laudo já foi contado na primeira finalização. |

### Trial e Pagamento

| # | Regra |
|---|-------|
| RN16 | O trial permite finalizar no máximo 2 laudos. Rascunhos não consomem cota. |
| RN17 | O contador do trial nunca reseta. É vinculado à conta (e-mail / Google / Apple), não ao dispositivo. |
| RN18 | Ao atingir o limite do trial, o examinador pode: ver laudos existentes, criar rascunhos (para experimentar o fluxo), mas NÃO finalizar novos laudos. |
| RN19 | Se o plano pago expirar, o comportamento é idêntico ao trial esgotado: visualização permitida, criação bloqueada. |
| RN20 | Laudos já finalizados nunca são apagados ou bloqueados por mudança de plano. O examinador sempre tem acesso ao que já produziu. |

### Perfil e Clínica

| # | Regra |
|---|-------|
| RN21 | Alterar dados da clínica ou assinatura não retroage. Laudos já finalizados mantêm os dados de quando foram gerados. |
| RN22 | O examinador pode excluir sua conta. Isso remove permanentemente: perfil, todos os laudos, todas as fotos, dados da clínica. Ação irreversível, exige confirmação. |

### Fotos

| # | Regra |
|---|-------|
| RN23 | A foto pode ser capturada pela câmera do dispositivo ou selecionada da galeria. |
| RN24 | O crop é a única edição permitida. Não há filtros, ajuste de brilho/contraste ou anotações. |
| RN25 | As fotos são armazenadas de forma privada. Nenhum examinador pode acessar fotos de outro. |

---

## 5. Invariantes do Domínio

Invariantes são condições que **nunca** podem ser violadas, em nenhuma circunstância:

1. **Edição de laudo finalizado gera nova revisão.** Um laudo finalizado pode ser editado, mas ao fazê-lo ele volta ao estado "rascunho" e o número da revisão é incrementado. O PDF anterior é substituído ao re-finalizar. Não existe laudo no estado "finalizado" com alterações pendentes — ou está finalizado (PDF válido), ou está em rascunho (sendo editado).

2. **Fotos por laudo: mínimo 1, máximo 3.** Um laudo não pode ser finalizado sem foto, nem ter mais de 3.

3. **Score de Nugent entre 0 e 10.** Qualquer combinação de morfotipos que resulte fora dessa faixa indica erro de cálculo.

4. **Trial nunca reseta.** Nenhuma ação do examinador (logout, reinstalação, troca de dispositivo, limpeza de cache) pode zerar o contador de laudos do trial.

5. **Isolamento total entre examinadores.** Examinador A nunca tem acesso a qualquer dado (laudo, foto, paciente) do Examinador B.

6. **Laudos sobrevivem ao plano.** Mesmo com plano expirado ou conta em trial esgotado, laudos finalizados permanecem acessíveis para visualização e impressão.

---

## 6. Fronteiras do que o App NÃO faz

É importante delimitar explicitamente para evitar scope creep:

- **Não cadastra pacientes.** Os dados do paciente existem apenas dentro de cada laudo. Não há "banco de pacientes".
- **Não sugere diagnóstico.** O app calcula scores e exibe classificações, mas a conclusão é sempre texto livre do examinador.
- **Não integra com sistemas de laboratório (LIS).** O produto é standalone.
- **Não integra com prontuário eletrônico.** O PDF é o deliverable final.
- **Não faz análise de imagem por IA.** As fotos são documentação visual, não input para classificação.
- **Não gera receitas ou prescrições.** É exclusivamente um laudo de microscopia.
- **Não permite compartilhamento de laudos entre examinadores.** Cada um vê apenas os seus.
