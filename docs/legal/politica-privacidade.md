# Política de Privacidade do MicroLaudo

> **RASCUNHO — não publicado.** Precisa de revisão jurídica antes do lançamento
> (o app trata dado de saúde). Os trechos marcados com **[PENDENTE]** dependem
> de decisões ainda em aberto. Blocos de citação como este são **notas
> internas**: o gerador (`scripts/build-legal.js`) não os publica na página
> `microlaudo.com/privacidade`.

**Última atualização:** 14 de novembro de 2026

Esta Política de Privacidade explica como o **MicroLaudo** (aplicativo para iOS,
Android e versão web) coleta, usa, armazena, compartilha e elimina dados
pessoais, em conformidade com a Lei Geral de Proteção de Dados Pessoais
(Lei nº 13.709/2018 — "LGPD").

Ao criar uma conta e usar o MicroLaudo, você declara que leu e compreendeu esta
Política.

---

## 1. Quem somos

O MicroLaudo é desenvolvido e operado por:

- **IGARATECH SISTEMAS E DESENVOLVIMENTO LTDA**
- **CNPJ:** 66.173.331/0001-31
- **Site:** https://microlaudo.com
- **E-mail de contato:** contato@microlaudo.com
- **E-mail de privacidade:** privacidade@microlaudo.com

Neste documento, "MicroLaudo", "nós" e "nosso" referem-se à IGARATECH.
"Você" ou "Médico" refere-se ao profissional de saúde que usa o aplicativo.
"Paciente" refere-se à pessoa cujos dados constam nos laudos emitidos pelo
Médico.

## 2. A quem o MicroLaudo se destina

O MicroLaudo é uma ferramenta profissional destinada **exclusivamente a
médicos** com registro ativo no Conselho Regional de Medicina (CRM), maiores de
18 anos, para a elaboração de laudos ginecológicos (microscopia de secreção
vaginal e ultrassonografia transvaginal). Pacientes não usam o aplicativo nem
criam conta.

## 3. Papéis no tratamento de dados: controlador e operador

A LGPD distingue quem **decide** sobre o tratamento (controlador) de quem
**executa** o tratamento em nome de outro (operador). No MicroLaudo, os papéis
são estes:

| Dados | Controlador | Operador |
|---|---|---|
| Dados do Médico (cadastro, conta, uso) | IGARATECH | — |
| Dados do Paciente inseridos nos laudos | **O Médico** | IGARATECH |

Isso significa que:

- **Quanto aos seus próprios dados**, a IGARATECH é a controladora e responde
  diretamente a você.
- **Quanto aos dados dos Pacientes**, quem decide coletá-los, para qual
  finalidade e por quanto tempo é o Médico, no exercício da relação
  médico-paciente. A IGARATECH apenas armazena e processa esses dados para
  prestar o serviço, seguindo as instruções do Médico, e não os utiliza para
  nenhuma finalidade própria.
- Cabe ao Médico garantir que possui base legal para tratar os dados dos
  seus Pacientes, informá-los quando aplicável e atender às obrigações éticas
  e legais da profissão, incluindo o sigilo médico e a guarda de prontuário.

## 4. Quais dados coletamos

### 4.1 Dados do Médico

| Dado | Como é obtido |
|---|---|
| Nome completo, CRM e RQE (opcional) | Informados no cadastro |
| E-mail e senha (armazenada apenas em forma criptografada — *hash*) | Informados no cadastro |
| Nome, e-mail e identificador da conta Google ou Facebook | Fornecidos pelo provedor, **somente** se você escolher entrar com essas contas |
| Dados da clínica: nome, CNPJ, endereço e telefone (opcionais) | Informados no perfil |
| Logotipo da clínica e imagem da assinatura (opcionais) | Enviados por você no perfil |
| Idioma preferido | Configuração do app |
| Plano contratado (mensal ou anual), situação da assinatura, data de renovação e identificadores do cliente e da assinatura no processador de pagamentos | Gerados na contratação e atualizados pelo processador de pagamentos |
| Quantidade de laudos usados no teste grátis | Gerado pelo uso do serviço |
| Histórico de eventos de pagamento enviados pelo processador (ex.: pagamento confirmado, atrasado, estornado; valor, forma de pagamento e datas) | Recebido automaticamente do processador de pagamentos |
| Registros de auditoria (ex.: laudo finalizado, laudo editado, conta excluída), com data e hora | Gerados automaticamente pelo uso |

**CPF ou CNPJ para cobrança:** ao assinar, pedimos o CPF ou CNPJ do titular da
assinatura, exigido pelo processador de pagamentos e para a emissão da nota
fiscal. Esse número é repassado diretamente ao processador (Asaas) e **não fica
armazenado no banco de dados do MicroLaudo**.

### 4.2 Dados do Paciente (inseridos pelo Médico)

São **dados pessoais sensíveis referentes à saúde** (art. 5º, II, e art. 11 da
LGPD):

| Dado | Observação |
|---|---|
| Nome do Paciente | Obrigatório no laudo |
| Data de nascimento | Opcional |
| CPF e número do Cartão Nacional de Saúde (SUS) | Opcionais |
| Nome do médico solicitante | Opcional |
| Datas da coleta e da avaliação | — |
| Achados do exame: microscopia, escores de Nugent e Amsel, pH, medidas e descrição da ultrassonografia, conclusão | Conteúdo clínico do laudo |
| Fotografias das lâminas (até 3 por laudo) | Imagens microscópicas; não são fotos do Paciente |
| Arquivo PDF do laudo | Gerado pelo app |

### 4.3 O que **não** coletamos

- Não usamos ferramentas de análise de uso (*analytics*), rastreamento de
  publicidade ou anúncios.
- Não acessamos sua localização, contatos ou microfone.
- A câmera e a galeria são acessadas **apenas** quando você escolhe fotografar
  ou anexar a imagem de uma lâmina ou enviar seu logotipo/assinatura.
- Não recebemos nem armazenamos dados de cartão de crédito (ver seção 9).

## 5. Para que usamos os dados e com qual base legal

### 5.1 Dados do Médico

| Finalidade | Base legal (LGPD) |
|---|---|
| Criar e manter sua conta, autenticar seu acesso e recuperar sua senha | Execução de contrato (art. 7º, V) |
| Gerar os laudos com seu nome, CRM, RQE, dados da clínica, logotipo e assinatura | Execução de contrato (art. 7º, V) |
| Controlar o teste grátis, processar a assinatura, liberar ou suspender o acesso conforme a situação do pagamento | Execução de contrato (art. 7º, V) |
| Emitir nota fiscal e manter registros contábeis e fiscais dos pagamentos | Cumprimento de obrigação legal (art. 7º, II) |
| Prevenir fraude e uso indevido do teste grátis e da cobrança | Legítimo interesse (art. 7º, IX) |
| Proteger a plataforma contra abuso e acesso automatizado (CAPTCHA) | Legítimo interesse (art. 7º, IX) |
| Manter registros de auditoria para segurança, rastreabilidade de alterações em laudos e defesa em processos | Exercício regular de direitos (art. 7º, VI) e legítimo interesse (art. 7º, IX) |
| Enviar comunicações operacionais (confirmação de cadastro, recuperação de senha, avisos sobre o serviço) | Execução de contrato (art. 7º, V) |
| Cumprir obrigações legais e regulatórias e atender autoridades | Cumprimento de obrigação legal (art. 7º, II) |

### 5.2 Dados do Paciente

A IGARATECH trata esses dados **apenas para prestar o serviço ao Médico**:
armazenar o laudo, exibi-lo, gerar o PDF e permitir que o Médico o consulte,
edite, compartilhe e exclua. Para controlar o teste grátis, o sistema guarda,
junto ao laudo, um código irreversível (*hash*) gerado a partir dos dados de
identificação do Paciente, que não permite recuperar esses dados e é apagado
junto com o laudo. A base legal é definida pelo Médico, como
controlador, e normalmente corresponde à **tutela da saúde, exclusivamente, em
procedimento realizado por profissionais de saúde** (art. 11, II, "f", da
LGPD).

Os dados dos Pacientes **nunca** são vendidos, usados para publicidade, para
treinar modelos de inteligência artificial, para criação de perfis ou
compartilhados com terceiros para finalidades próprias da IGARATECH.

## 6. Com quem compartilhamos os dados

Para funcionar, o MicroLaudo depende de prestadores de serviço
(suboperadores), contratados com obrigações de segurança e confidencialidade.
Os dados são compartilhados somente na medida necessária:

| Prestador | Finalidade | Dados envolvidos |
|---|---|---|
| **Supabase** | Banco de dados, autenticação, armazenamento de arquivos e funções de servidor. **Os dados ficam armazenados em servidores na região de São Paulo (Brasil).** | Todos os dados descritos na seção 4 |
| **Cloudflare** | Hospedagem da versão web, verificação anti-robô (Turnstile) nas telas de login e cadastro, e estatística agregada de visitas ao site (Web Analytics, sem cookies) | Endereço IP e dados técnicos do navegador; nenhum dado de Paciente |
| **Asaas** (Asaas Gestão Financeira Instituição de Pagamento S.A.) | Processamento das assinaturas e cobranças (cartão de crédito, Pix ou boleto) e emissão de nota fiscal. Os dados de pagamento são digitados diretamente na página de fatura do Asaas | Nome, e-mail e CPF/CNPJ do Médico; plano e valores. **Nenhum dado de Paciente** |
| **Brevo** | Envio de e-mails transacionais (confirmação de cadastro, recuperação de senha) | E-mail e nome do Médico; nenhum dado de Paciente |
| **Google** | Login com conta Google, se você escolher; recebimento dos e-mails enviados aos nossos endereços de contato | Dados do perfil Google; conteúdo das mensagens que você nos enviar |
| **Meta (Facebook)** | Login com conta Facebook, se você escolher | Dados do perfil Facebook |
| **ProDoctor** | Integração opcional com o sistema de prontuário/agenda do consultório, para preencher automaticamente nome e data de nascimento do Paciente. **Disponível apenas para Médicos habilitados** pela IGARATECH a pedido do consultório que já usa o ProDoctor | Nome pesquisado; retorno de nome, data de nascimento e médico do último atendimento |
| **Apple e Google (lojas de aplicativos)** | Distribuição do aplicativo e, quando disponível, processamento das assinaturas feitas dentro do app (ver seção 9) | Conforme as políticas próprias de cada loja |

Também poderemos compartilhar dados:

- quando exigido por lei, ordem judicial ou requisição de autoridade
  competente;
- para proteger direitos da IGARATECH em processos judiciais, administrativos
  ou arbitrais;
- em caso de reorganização societária (fusão, aquisição), hipótese em que o
  sucessor ficará sujeito a esta Política.

**O Médico** pode, por iniciativa própria, compartilhar o PDF do laudo (por
e-mail, aplicativos de mensagem etc.). Esse compartilhamento é feito pelo
Médico, sob sua responsabilidade.

## 7. Transferência internacional de dados

O banco de dados e os arquivos do MicroLaudo ficam armazenados no Brasil (São
Paulo). Ainda assim, alguns prestadores listados na seção 6 são empresas
estrangeiras ou operam infraestrutura global (por exemplo, a rede da
Cloudflare, os serviços do Google e da Meta, o envio de e-mails pela Brevo,
empresa sediada na União Europeia, e o processamento de algumas funções de
servidor), o que pode envolver tratamento fora do Brasil.

Nesses casos, a transferência ocorre com base no art. 33 da LGPD, com
prestadores que adotam cláusulas contratuais de proteção de dados e padrões de
segurança reconhecidos internacionalmente.

## 8. Como protegemos os dados

Adotamos medidas técnicas e administrativas para proteger os dados contra
acesso não autorizado, perda, alteração ou divulgação, entre elas:

- **Isolamento por médico:** cada Médico só consegue acessar os próprios
  laudos, imagens e arquivos. Esse isolamento é imposto no próprio banco de
  dados (*Row Level Security*), e não apenas no aplicativo.
- **Arquivos privados:** fotos, PDFs, logotipos e assinaturas ficam em
  repositórios privados. O acesso é feito por links temporários que expiram
  em até 10 minutos.
- **Criptografia em trânsito:** toda comunicação entre o app e os servidores
  usa HTTPS/TLS.
- **Criptografia em repouso** dos dados armazenados pelo provedor de
  infraestrutura.
- **Senhas** armazenadas apenas em forma de *hash*; a sessão de login no
  celular fica no armazenamento seguro do sistema (Keychain/Keystore).
- **Credenciais de integrações** (como a do ProDoctor) ficam somente no
  servidor, nunca no aplicativo.
- **Proteção contra robôs** (CAPTCHA) nas telas de login, cadastro e
  recuperação de senha da versão web.
- **Registros de auditoria** de ações relevantes, sem conteúdo clínico.

Nenhum sistema é totalmente imune a falhas. Se ocorrer um incidente de
segurança que possa acarretar risco ou dano relevante, comunicaremos a
Autoridade Nacional de Proteção de Dados (ANPD) e os titulares afetados — e,
no caso de dados de Pacientes, o Médico controlador — nos termos do art. 48 da
LGPD.

**Responsabilidade do Médico:** manter a senha em sigilo, não compartilhar a
conta, proteger o aparelho com bloqueio de tela e encerrar a sessão em
dispositivos de terceiros.

## 9. Pagamentos e assinatura

O MicroLaudo oferece **1 laudo gratuito** para teste. Para finalizar outros
laudos, é necessário contratar um plano pago (mensal ou anual).

- **Versão web:** as cobranças são processadas pelo **Asaas**, instituição de
  pagamento autorizada pelo Banco Central do Brasil. Você escolhe pagar por
  cartão de crédito, Pix ou boleto, e os dados de pagamento são digitados
  **diretamente na página de fatura do Asaas**. A IGARATECH **não recebe nem
  armazena** número de cartão, código de segurança ou dados bancários.
- **Aplicativos para iOS e Android:** quando a assinatura dentro do app estiver
  disponível, o pagamento será processado pela Apple App Store ou pelo Google
  Play, conforme as políticas de cada loja.

Recebemos do processador apenas o necessário para liberar o acesso e cumprir
obrigações fiscais: situação da assinatura, plano, valores, forma de pagamento,
datas e identificadores da cobrança. Para criar a cobrança, enviamos ao Asaas
seu nome, e-mail e o CPF ou CNPJ informado na contratação.

O Asaas trata esses dados também como **controlador independente**, para
cumprir suas próprias obrigações legais e regulatórias (por exemplo, prevenção
à lavagem de dinheiro e normas do Banco Central), conforme a política de
privacidade dele.

Ao excluir sua conta, a assinatura no Asaas é cancelada automaticamente e não
haverá novas cobranças.

## 10. Por quanto tempo guardamos os dados

| Dados | Prazo |
|---|---|
| Dados da conta do Médico e laudos (incluindo dados de Pacientes, fotos e PDFs) | Enquanto a conta estiver ativa, ou até que o Médico exclua o laudo ou a conta |
| Registros de pagamento (histórico de eventos da cobrança, identificadores e valores) | **5 anos** após o pagamento, mesmo após a exclusão da conta, para cumprir a legislação fiscal e tributária (art. 16, I, da LGPD) |
| Registros de auditoria | **5 anos** após o evento, mesmo após a exclusão da conta, para segurança e exercício regular de direitos (art. 16, I e II, da LGPD). Não contêm conteúdo clínico |
| Cópias de segurança (*backups*) do provedor | Backups diários mantidos pelo provedor de infraestrutura por até **7 dias** e eliminados automaticamente depois desse prazo |

**Guarda do prontuário:** a legislação e as normas do Conselho Federal de
Medicina impõem ao médico prazos de guarda de prontuário. O MicroLaudo **não
substitui o sistema de prontuário** do Médico. Antes de excluir laudos ou a
conta, o Médico deve baixar e guardar os PDFs que precise conservar.

## 11. Exclusão da conta

Você pode excluir sua conta a qualquer momento pelo próprio aplicativo, em
**Perfil → Zona de Perigo → Excluir conta**, ou pedindo pelo e-mail
privacidade@microlaudo.com.

Ao excluir a conta, apagamos de forma definitiva e imediata:

- seus dados de cadastro e de autenticação;
- todos os laudos e dados de Pacientes associados;
- todas as fotos de lâminas, PDFs, logotipo e assinatura armazenados.

A assinatura no processador de pagamentos também é cancelada. Permanecem
apenas os registros de auditoria e de pagamento pelos prazos da seção 10, os
dados que o Asaas precisa manter por obrigação legal própria e,
temporariamente, as cópias de segurança até seu descarte automático. **A exclusão não pode ser
desfeita.**

## 12. Seus direitos

### 12.1 Direitos do Médico

Nos termos do art. 18 da LGPD, você pode, a qualquer momento:

- confirmar se tratamos seus dados e acessá-los;
- corrigir dados incompletos, inexatos ou desatualizados (a maior parte pode
  ser corrigida diretamente no Perfil);
- pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários ou
  tratados em desconformidade com a LGPD;
- pedir a portabilidade dos seus dados;
- pedir a eliminação dos dados, ressalvadas as hipóteses de guarda previstas
  em lei;
- obter informação sobre com quem compartilhamos seus dados;
- revogar consentimentos, quando o tratamento se basear nele;
- opor-se a tratamento realizado com base em legítimo interesse, em caso de
  descumprimento da LGPD;
- apresentar reclamação à ANPD (www.gov.br/anpd).

Para exercer seus direitos, escreva para **privacidade@microlaudo.com**. Podemos
pedir informações para confirmar sua identidade antes de atender. Respondemos
em até 15 dias.

### 12.2 Direitos dos Pacientes

Como os dados dos Pacientes são controlados pelo Médico, **pedidos de
Pacientes devem ser dirigidos ao Médico ou à clínica responsável pelo
exame**. Se recebermos um pedido diretamente de um Paciente, vamos
encaminhá-lo ao Médico responsável, quando for possível identificá-lo, e
apoiar o Médico no atendimento, conforme o art. 39 da LGPD.

## 13. Dados de crianças e adolescentes

O aplicativo não se destina a menores de 18 anos e não permite o cadastro
deles como usuários. Laudos de Pacientes crianças ou adolescentes são de
responsabilidade do Médico, que deve observar o melhor interesse do menor e o
art. 14 da LGPD.

## 14. Cookies e armazenamento local

O MicroLaudo não usa cookies de publicidade nem de análise de uso.

- **Aplicativo (iOS/Android):** a sessão de login fica no armazenamento
  seguro do sistema.
- **Versão web:** a sessão de login fica no armazenamento local do navegador
  (*localStorage*), necessário para manter você conectado. O verificador
  anti-robô da Cloudflare (Turnstile) pode usar dados técnicos do navegador
  estritamente para distinguir pessoas de robôs.
- **Estatística de visitas (versão web):** usamos o Cloudflare Web Analytics
  para contar visitas e medir o tempo de carregamento das páginas. Ele não usa
  cookies, não identifica quem visita e não acompanha você em outros sites;
  recebe apenas dados técnicos da visita (página, navegador, país aproximado).
  Não envolve nenhum dado de Paciente.

## 15. Encarregado pelo tratamento de dados pessoais (DPO)

A IGARATECH indicou como encarregado pelo tratamento de dados pessoais, nos
termos do art. 41 da LGPD:

- **Encarregado:** Octavio Lobo
- **Contato:** privacidade@microlaudo.com

O encarregado recebe reclamações e comunicações dos titulares, presta
esclarecimentos, adota providências, recebe comunicações da Autoridade
Nacional de Proteção de Dados (ANPD) e orienta a equipe sobre as práticas de
proteção de dados.

## 16. Alterações nesta Política

Podemos atualizar esta Política para refletir mudanças no aplicativo, na
legislação ou nos prestadores de serviço. A data da última atualização fica
sempre no topo. Mudanças relevantes serão comunicadas no aplicativo ou por
e-mail antes de entrarem em vigor.

## 17. Legislação e foro

Esta Política é regida pelas leis brasileiras. Fica eleito o foro do
domicílio do titular para resolver eventuais controvérsias, conforme o
Código de Defesa do Consumidor, quando aplicável.

## 18. Contato

- **IGARATECH SISTEMAS E DESENVOLVIMENTO LTDA**
- CNPJ: 66.173.331/0001-31
- Site: https://microlaudo.com
- Atendimento: contato@microlaudo.com
- Privacidade e encarregado de dados (Octavio Lobo): privacidade@microlaudo.com
