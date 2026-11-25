# Ficha da App Store (MicroLaudo iOS)

Textos e respostas para copiar no App Store Connect. Atualize aqui quando mudar lá.

## Informações do app (App Information)

| Campo | Valor |
|---|---|
| Nome | MicroLaudo |
| Subtítulo (30) | Laudos de microscopia e USG |
| Categoria principal | Medicina (Medical) |
| Categoria secundária | Produtividade (Productivity) |
| Idioma principal | Português (Brasil) |
| Bundle ID | com.microlaudo.app |
| Content Rights | Não usa conteúdo de terceiros |

## Versão 1.0 (página da versão)

**Texto promocional (170, pode mudar sem nova versão)**

> Microscopia com Nugent e Amsel automáticos e USG transvaginal com volumes calculados: laudo em PDF em poucos minutos. 1 laudo grátis para testar.

**Descrição**

> O MicroLaudo transforma a microscopia de conteúdo vaginal e a USG pélvica transvaginal em laudos em PDF profissionais e padronizados, direto do celular. Sem passar fotos para o computador, sem modelo de Word, sem formatar à mão.
>
> MICROSCOPIA DE CONTEÚDO VAGINAL
> • Fotografe a lâmina pela câmera do microscópio ou escolha da galeria (até 3 imagens por laudo).
> • Registre os achados da microscopia em poucos toques.
> • Score de Nugent e Critérios de Amsel calculados automaticamente.
> • Conclusão sugerida a partir dos achados, sempre editável por você.
>
> USG PÉLVICA TRANSVAGINAL
> • Útero, colo, endométrio, ovários e cavidade pélvica em campos rápidos de preencher.
> • Volumes do útero e dos ovários calculados automaticamente, com valores de referência editáveis.
> • O texto da análise é escrito pelo app a partir dos campos, e você edita como quiser.
> • Opinião do relatório sugerida e laudo pronto com código SIGTAP.
>
> PDF COM A SUA IDENTIDADE
> • Logotipo, dados da clínica e sua assinatura em todos os laudos.
> • Nome, CRM e RQE no rodapé.
> • Compartilhe por e-mail ou aplicativo de mensagem.
>
> HISTÓRICO SEGURO
> • Busque laudos por paciente ou data.
> • Revisões guardadas: cada alteração em um laudo finalizado gera uma nova versão.
> • Cada médico só acessa os próprios laudos. Dados armazenados no Brasil.
>
> PLANOS
> O primeiro laudo é grátis. Para laudos ilimitados, assine o MicroLaudo Pro mensal ou anual pela App Store. A assinatura renova automaticamente e pode ser cancelada a qualquer momento nos Ajustes do iPhone.
>
> O MicroLaudo é uma ferramenta de apoio à elaboração de laudos e não substitui o julgamento clínico. O conteúdo de cada laudo é de responsabilidade do médico que o assina.
>
> O MicroLaudo é um produto desenvolvido e operado pela IGARATECH SISTEMAS E DESENVOLVIMENTO LTDA (CNPJ 66.173.331/0001-31).
>
> Termos de Uso: https://microlaudo.com/termos
> Política de Privacidade: https://microlaudo.com/privacidade

**Palavras-chave (100, separadas por vírgula, sem espaço)**

```
laudo,microscopia,ginecologia,nugent,amsel,vaginose,candidíase,usg,ultrassom,transvaginal,pdf
```

| Campo | Valor |
|---|---|
| URL de suporte | https://microlaudo.com |
| URL de marketing | https://microlaudo.com |
| URL da Política de Privacidade | https://microlaudo.com/privacidade |
| Copyright | 2026 IGARATECH SISTEMAS E DESENVOLVIMENTO LTDA (sem o "©": a Apple já coloca) |

O link dos **Termos de Uso** precisa estar na descrição (acima) ou no campo
"License Agreement" (EULA personalizado). É exigência da Apple para assinatura
com renovação automática.

### Prints

- Obrigatório: iPhone 6,9" (**1320×2868**) ou 6,7" (**1290×2796**). Mínimo 3, máximo 10.
- iPad: não precisa (`supportsTablet: false`).
- Tirar no build de **produção/TestFlight**, que não tem o botão "Tools" do modo desenvolvimento.
- Sugestão de sequência: Início → foto da lâmina → achados → Nugent/Amsel → PDF pronto →
  USG: Análise com o útero preenchido (volume calculado) → USG: preview do PDF → Histórico.
- Usar um paciente **fictício** (ex.: "Maria Exemplo"). Nunca dados reais.

## Classificação etária (Age Rating)

Questionário em 7 etapas. Responda **Não / Nenhum (None)** em tudo, exceto o
bloco médico:

| Pergunta | Resposta | Por quê |
|---|---|---|
| Parental Controls | Não | Não há controle parental |
| Age Assurance | Não | Não verifica idade (o CRM é dado de perfil, não verificação de idade) |
| Unrestricted Web Access | Não | Só abre links fixos (Termos, Política, gerenciar assinatura) |
| User-Generated Content | Não | Os laudos são privados de cada médico; nada é publicado para outros usuários |
| Social Media | Não | Sem feed |
| Messaging and Chat | Não | Sem chat entre usuários |
| Advertising | Não | Sem anúncios |
| Palavrões, horror, álcool/tabaco/drogas | Nenhum | |
| **Medical or Treatment Information** | **Frequente (Frequent)** | O app inteiro é sobre laudos médicos |
| **Health or Wellness Topics** | **Sim** | Saúde ginecológica |
| Sexualidade, nudez | Nenhum | Imagens são lâminas de microscopia e textos clínicos |
| Violência | Nenhum | |
| Apostas, sorteios, concursos, loot box | Nenhum / Não | |
| Faixa etária manual (age override) | Não alterar | Fica a calculada pela Apple |
| Feito para crianças (Kids) | Não | |

A classificação resultante pode subir por causa do conteúdo médico; não atrapalha,
porque o público é profissional.

## App Privacy (Privacidade do app)

**"Você ou seus parceiros coletam dados deste app?"** Sim.
**Rastreamento (tracking):** Não, para todos os itens. O app não tem anúncios,
analytics nem SDK de rastreamento.

Para **todos** os tipos abaixo: finalidade **Funcionalidade do app** (App
Functionality), **vinculado à identidade do usuário** (Linked to the user),
**não usado para rastreamento**.

| Categoria Apple | Tipo | De onde vem |
|---|---|---|
| Informações de contato | Nome | Cadastro do médico (e Entrar com Apple/Google/Facebook) |
| Informações de contato | E-mail | Login e recuperação de senha |
| Informações de contato | Número de telefone | Telefone da clínica (opcional) |
| Informações de contato | Endereço físico | Endereço da clínica (opcional) |
| Saúde e condicionamento | Saúde | Achados clínicos dos laudos, inseridos pelo médico |
| Conteúdo do usuário | Fotos ou vídeos | Fotos das lâminas, logotipo e assinatura |
| Conteúdo do usuário | Outro conteúdo do usuário | Texto dos laudos e dados do paciente (nome, nascimento, CPF/SUS opcionais) |
| Identificadores | ID do usuário | ID interno da conta (também enviado à RevenueCat) |
| Compras | Histórico de compras | Assinatura pela App Store (RevenueCat) |
| Outros dados | Outros tipos de dados | CRM e RQE do médico |

**Não declarar** (o app não coleta): localização, contatos, informações
financeiras (no iPhone a Apple processa o pagamento; o Asaas é só na web),
histórico de navegação/busca, dados de diagnóstico ou de uso (não há
crashlytics/analytics), ID do dispositivo, informações sensíveis
(categoria da Apple para etnia, religião etc.).

## Informações para a revisão (App Review Information)

**Conta demo:** criar uma conta só para a Apple, que nunca é usada com dados reais:
- E-mail: `revisao@microlaudo.com` (criar a regra no Cloudflare Email Routing
  encaminhando para o e-mail da equipe, para receber a confirmação de cadastro);
- senha forte, anotada só no App Store Connect;
- perfil completo (nome, CRM fictício, clínica fictícia) e e-mail confirmado;
- **sem** cortesia e **sem** assinatura, com o laudo grátis ainda disponível, para o
  revisor conseguir testar a compra no sandbox;
- ProDoctor desligado (é o padrão).

**Notas para o revisor (Notes):**

> MicroLaudo is a tool for gynecologists to create vaginal microscopy reports (PDF). The app is in Brazilian Portuguese.
>
> Demo account: use the credentials above. The account has 1 free report available.
>
> How to test:
> 1. Log in (a Cloudflare Turnstile check may appear: tap the checkbox).
> 2. Tap "Novo Laudo" → "Microscopia vaginal" → enter any patient name → take or choose any photo (any image works; in practice it is a microscope slide) → fill in the findings → the Nugent score and Amsel criteria are calculated automatically → "Finalizar" to generate the PDF.
>
>    There is also a transvaginal ultrasound report: "Novo Laudo" → "USG transvaginal" → patient → fill in the measurements (volumes are calculated automatically) → the analysis text is generated and editable → PDF. No photos are needed for this report type. The free report can be used on either type.
> 3. After the free report, the app shows the plans screen. Subscriptions are auto-renewable in-app purchases (monthly and annual) and unlock unlimited reports. "Restaurar compras" restores purchases.
>
> Sign in with Apple is available on the login screen. Account deletion: Perfil → "Excluir conta".
>
> The app does not provide diagnosis: the physician reviews and signs every report.

**Contato:** nome e telefone de quem responde à Apple; e-mail `contato@microlaudo.com`.

## Assinaturas (In-App Purchases)

| Produto | ID | Duração | Preço | Nome exibido | Descrição |
|---|---|---|---|---|---|
| Pro Mensal | com.microlaudo.app.mensal | 1 mês | R$ 39,90 | Pro Mensal | Laudos ilimitados, renovação mensal |
| Pro Anual | com.microlaudo.app.anual | 1 ano | R$ 399,00 | Pro Anual | Laudos ilimitados, renovação anual |

- Grupo **MicroLaudo Pro**, com localização pt-BR. Os dois produtos ficam no **mesmo nível**.
- Print de revisão: tela de Planos do app (1290×2796).
- Na **primeira versão**, as assinaturas são enviadas junto com o app: na página da
  versão, seção "In-App Purchases and Subscriptions", selecione as duas.
