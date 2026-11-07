# Spec — Laudo de USG Pélvica Transvaginal (Sprint USG-Web)

Baseado no modelo de laudo enviado pelo usuário em 06/11/2026 (laudo real impresso).
**O modelo original contém dados reais de paciente — não versionar a imagem no repositório.** Esta spec guarda só a estrutura.

---

## 1. Estrutura do laudo (como está no modelo)

1. **Cabeçalho** — "LAUDO MÉDICO · ULTRASSONOGRAFIA" + logo (no app: logo do médico, como na microscopia).
2. **Identificação do paciente** — no modelo: boletim/SAC, nº exame, nascimento, idade, endereço, cidade, bairro, estado, paciente, CPF, cartão SUS.
3. **Procedimentos realizados** — código SIGTAP `02.05.02.018-6` · ULTRASSONOGRAFIA TRANSVAGINAL.
4. **Achados / Descrição**
   - Título: ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL
   - **Técnica** (texto fixo): "Exame realizado em aparelho dinâmico com transdutor endocavitário por via transvaginal."
   - **Análise** — um parágrafo por estrutura: útero, colo, endométrio, ovário direito, ovário esquerdo, cavidade pélvica.
   - **Opinião do relatório** (= conclusão).
5. **Rodapé** — data e hora por extenso, assinatura, nome, CRM/UF.

Todo o texto do laudo sai em **CAIXA ALTA**.

---

## 2. Abordagem: campos estruturados → texto gerado → texto editável

Igual à microscopia (`lib/conclusionTemplates.ts`): a médica preenche **campos estruturados** (selects + medidas), o app **gera os parágrafos** no padrão do modelo e ela pode **editar o texto livremente** antes do PDF. Isso garante velocidade (90% dos laudos são "normal") sem engessar casos atípicos.

### Cálculo de volume (elipsoide)

`volume = comprimento × AP × transverso × 0,52` — confere com o modelo:
- Útero 6,3 × 2,7 × 3,8 × 0,52 = **33,6 cm³** ✔
- Ovário 1,3 × 1,1 × 1,2 × 0,52 = **0,9 cm³** ✔

Calculado automaticamente, com 1 casa decimal. Vai em `src/lib/usgVolume.ts` com testes.

---

## 3. Campos por estrutura (`reports.content` JSONB)

| Estrutura | Campos | Texto gerado (caso normal do modelo) |
|---|---|---|
| **Útero** | forma (piriforme / globoso), posição (anteversoflexão / retroversoflexão / medioversão), centrado / desviado à D / à E, contornos (regulares / irregulares / lobulados), dimensões (habituais / aumentadas / reduzidas), 3 medidas em cm → volume, ref. normal (padrão 90 cm³), miométrio (homogêneo / heterogêneo), obs. livre. Opção "ausente (histerectomia)". | "Útero piriforme, em anteversoflexão, centrado, com contornos regulares, dimensões habituais, medindo cerca de 6,3 x 2,7 x 3,8 cm, com volume estimado de 33,6 cm³ (normal até 90,0 cm³). Miométrio homogêneo." |
| **Colo / canal endocervical** | aspecto habitual / alterado + obs. | "Colo uterino e canal endocervical de aspecto habitual." |
| **Endométrio** | regular / irregular, homogêneo / heterogêneo, espessura (mm), ecogenicidade (select), Doppler — escore de vascularização 1–4 (opcional), obs. | "Endométrio regular e homogêneo, medindo 5,7 mm de espessura, apresentando ecogenicidade uniformemente anecoica. Ao Doppler, escore de vascularização 1." |
| **Ovário direito / esquerdo** (mesmo componente) | caracterizado? Se sim: tópico / ectópico, contornos, 3 medidas → volume, ref. normal (padrão 10 cm³), parênquima / ecotextura, obs. Se não: região anexial com ou sem massas/coleções. | D: "Ovário direito tópico, de contornos regulares, medindo cerca de 1,3 x 1,1 x 1,2 cm, com volume de 0,9 cm³ (normal até 10,0 cm³). O parênquima tem ecotextura habitual." · E: "Ovário esquerdo não caracterizado. Região anexial esquerda sem evidências de massas ou coleções." |
| **Cavidade pélvica** | líquido livre: ausente / pequena / moderada / grande quantidade | "Cavidade pélvica sem líquido livre." |
| **Opinião do relatório** | texto livre, com sugestão automática ("Demais estruturas sem alterações" quando tudo normal) → `reports.conclusion` | "Endométrio medindo 5,7 mm de espessura. Correlacionar com os dados clínicos… Demais estruturas sem alterações." |

O texto final da Análise (editado ou não) também é salvo em `content.analysis_text`, para que o PDF e as reedições usem exatamente o que a médica aprovou.

---

## 4. Fluxo de telas (web — `app/report-usg/`)

Como é só web (tela larga), as estruturas ficam em **uma tela com seções**, não uma tela por órgão:

1. **Paciente** — reaproveita o formulário da microscopia, com os campos opcionais de CPF e cartão SUS.
2. **Análise** — seções Útero · Colo · Endométrio · Ovários · Pelve, com volumes calculados ao vivo.
3. **Texto e conclusão** — parágrafos gerados (editáveis) + Opinião do relatório.
4. **Preview / PDF / Finalizar** — reaproveita a lógica do preview atual.

---

## 5. Decisões

**Fechadas (06/11/2026):**
- [x] **Paciente**: **CPF e cartão SUS opcionais**, como colunas novas e nullable em `reports` (`patient_cpf`, `patient_sus_card`), já que são dados do paciente e servem para qualquer tipo de laudo. CPF com validação de dígito verificador. Idade calculada a partir do nascimento. **Sem endereço**, boletim nem nº do exame (LGPD — minimização).
- [x] **Imagens**: **USG vai sem imagens**. Não há step de fotos e o limite de `report_images` não muda.
- [x] **Valores de referência**: **padrão editável**. Vêm preenchidos com 90 cm³ (útero) e 10 cm³ (ovário), e a médica pode alterar em cada laudo (salvo no `content`).
- [x] **Código SIGTAP**: **mantido no PDF**, na seção "Procedimentos realizados" (`02.05.02.018-6`).
- [ ] **Cabeçalho**: usar o logo do médico, como na microscopia. Não reproduzir o logo do SUS/Ministério da Saúde, a menos que exista uso institucional autorizado.
- [ ] **Assinatura digital / validade jurídica** (caixa do rodapé do modelo): fica fora da sprint, para ser avaliada depois.
