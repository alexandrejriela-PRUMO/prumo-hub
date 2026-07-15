// Base de conhecimento da RUTE sobre o funcionamento dos módulos do PRUMO HUB
// Usada tanto no ChatRute (InvokeLLM) quanto nas instruções do agente rute_assistant

export const PRUMO_HUB_MODULES_KNOWLEDGE = `
## Sobre o PRUMO HUB
O PRUMO HUB é uma plataforma de gestão ambiental e rural desenvolvida pela Santa Rute Engenharia Rural. Atende dois perfis principais: **Consultores Ambientais** e **Produtores Rurais**. O sistema centraliza todo o gerenciamento de propriedades rurais, licenciamento ambiental, CAR, documentos, processos, finanças e muito mais em um único lugar.

## Módulos do PRUMO HUB

### 📂 MEU ESCRITÓRIO (Consultor)
- **Dashboard**: Visão geral com métricas, gráficos, alertas de licenças vencendo, termômetro de regularidade e acesso rápido às principais funcionalidades.
- **Agenda**: Calendário integrado onde você agenda reuniões, visitas técnicas, prazos e compromissos. Pode ser sincronizada com o Google Calendar.
- **CRM Prumo**: Kanban de gestão de relacionamento com clientes e leads. Permite acompanhar prospects, criar interações (ligações, reuniões, e-mails, WhatsApp), delegar tarefas para a equipe e gerenciar serviços contratados.
- **Meus Clientes**: Lista de todos os clientes e propriedades vinculadas ao consultor. Cada cliente tem perfil completo com dados cadastrais, propriedades, contratos, cobranças e histórico de interações.
- **Propriedades e Empreendimentos**: Cadastro e gestão de propriedades rurais e urbanas. Inclui dados do imóvel, endereço fiscal, matrículas, CAR, atividades produtivas, áreas (total, APP, reserva legal), vizinhos e georreferenciamento.
- **Meus Contratos**: Gestão de contratos com clientes. Visualize, edite e acompanhe contratos assinados digitalmente via Clicksign.
- **Gerador de Contratos**: Ferramenta para criar contratos personalizados a partir de modelos (templates). Permite editar conteúdo, vincular a clientes e propriedades, e enviar para assinatura digital. A assinatura digital integrada está em desenvolvimento.
- **Gerador de Orçamentos**: Criação de orçamentos e propostas comerciais com modelos customizáveis. Inclui logo da empresa, serviços, valores, condições de pagamento e envio por e-mail ao cliente.
- **Minha Equipe**: Gestão de membros da equipe do consultor. Convide membros, atribua permissões por módulo, defina funções (equipe_consultor) e acompanhe o status dos convites.

### 💰 CONTROLE FINANCEIRO
- **Painel Financeiro**: Dashboard financeiro com receitas, despesas, saldo, gráficos de fluxo de caixa e indicadores de performance.
- **Transações Consolidadas**: Registro de todas as transações financeiras (receitas e despesas), com filtros por período, categoria, propriedade e status.
- **Gateway de Cobrança**: Emissão de cobranças para clientes via Asaas (PIX, boleto, cartão). Gera links de pagamento, acompanha status de pagamento e gerencia a carteira digital com split automático (10% PRUMO / 90% consultor).
- **Config. de Pagamento**: Configuração da subconta Asaas White Label para recebimento de pagamentos (em breve).
- **Notas Fiscais (NF-e)**: Emissão e gestão de notas fiscais eletrônicas via Focus NFe (em breve).

### 🏠 CENTRAL DA PROPRIEDADE
- **Visão Geral**: Painel central da propriedade selecionada com resumo de todas as informações, documentos e alertas da propriedade.
- **Documentos**: Repositório central de documentos com controle de versões, categorias (CCIR, ITR, matrícula, escritura, etc.), validade e observações. Documentos também são espelhados automaticamente de outros módulos (financeiro, licenças, contratos).
- **Licenças e Projetos**: Cadastro e gestão de licenças ambientais (LP, LI, LO, LAU, LAS, ASV, etc.) e documentos técnicos (laudos, ARTs, RRTs, pareceres). Inclui condicionantes, prazos de validade, andamentos e checklists.
- **Gestão do CAR**: Módulo completo do Cadastro Ambiental Rural. Status do CAR, áreas (APP, reserva legal, consolidada, vegetação nativa), inconsistências, PRA, passivos ambientais, camadas do mapa e Smart Upload com análise por IA.
- **Mapa Interativo**: Visualização georreferenciada da propriedade com camadas (polígono CAR, APP, reserva legal, área consolidada, área de recuperação), ferramentas de desenho, medição e exportação.
- **Processos**: Gestão de processos administrativos, civis e criminais vinculados à propriedade. Acompanha andamentos, multas, embargos, inquériritos civis e resoluções.
- **Alertas de Infrações**: Monitoramento de alertas ambientais (desmatamento, mudança de uso da terra, APP, etc.) com integração PRODES, DETER e MapBiomas. Inclui severidade, área afetada e ações recomendadas.
- **Termômetro de Regularidade**: Avaliação percentual da regularidade ambiental da propriedade baseada em parâmetros configuráveis (licenças, documentos, georreferenciamento, processos).
- **PRAD - Recuperação de Área**: Projeto de Recuperação de Área Degradada com diagnóstico ambiental, métodos de recuperação, cronograma, espécies, relatórios anuais (4 anos) e monitoramento por NDVI e imagens de satélite.
- **Georreferenciamento**: Gestão do georreferenciamento do imóvel rural conforme Lei 10.267/2001, com arquivos (shapefiles, KML), memorial descritivo e status do processo.

### 🌱 AGRICULTURA DE PRECISÃO
- **Mapeamentos**: Upload e gestão de mapas e ortofotos (DJI, drones), arquivos georreferenciados e camadas de dados.
- **Monitoramento Climático**: Dados climáticos em tempo real, previsão do tempo, histórico, alertas e índices (precipitação, temperatura, umidade).
- **Análise de Commodities**: Cotações e análise de preços de commodities agrícolas com histórico e tendências.

### 📈 ATIVOS AMBIENTAIS
- **Créditos de Carbono**: Gestão de créditos de carbono (créditos gerados, vendidos, disponíveis), projetos, certificações e relatórios.
- **PSA - Serviços Ambientais**: Contratos de Pagamento por Serviços Ambientais com beneficiários, duração, compensação e monitoramento.
- **Cotas de Reserva Ambiental (CRA)**: Gestão de títulos CRA — origens, títulos, transações e compensações de reserva legal.
- **Servidão Ambiental**: Criação e gestão de servidões ambientais com registro em cartório, compensação, benefícios fiscais e monitoramento.
- **ESG para o Agro**: Painel ESG (Environmental, Social, Governance) com scores, recomendações, relatórios e wizard para green loans e incentivos fiscais.

### 🌾 CRÉDITO E SAFRA
- **Gestão de Crédito Rural**: Cadastro e acompanhamento de operações de crédito rural (Pronaf, Pronamp, crédito empresarial) com prazos, taxas e status.
- **Frustração de Safra**: Registro e gestão de perdas/frustração de safra para fins de seguro agrícola e comunicação oficial.

### 📋 OUTROS MÓDULOS
- **Requerimentos**: Sistema de requerimentos internos onde o produtor solicita serviços ao consultor e acompanha a resposta.
- **Relatórios**: Geração de relatórios personalizados e consolidados com exportação em PDF e CSV.
- **Configurar Notificações**: Preferências de notificação por evento (nova licença, vencimento, alerta ambiental, etc.) com canais e-mail, push e SMS.
- **Modo Campo**: Interface otimizada para uso em campo com acesso rápido e offline a informações essenciais.
- **Chat IA Rute**: Este chat — sua assistente virtual para dúvidas ambientais e sobre o uso da plataforma.

## Perfis de Usuário
- **Consultor**: Profissional ambiental que gerencia múltiplos clientes e propriedades. Tem acesso ao escritório, financeiro e todos os módulos de propriedade.
- **Produtor Rural**: Proprietário rural que gerencia suas próprias propriedades. Tem acesso à central da propriedade, agricultura de precisão, ativos ambientais e crédito/safra.
- **Equipe (Consultor/Produtor)**: Membro da equipe do consultor ou produtor, com permissões configuráveis por módulo.
- **Cliente do Consultor**: Cliente do plano Enterprise que tem acesso somente leitura aos dados de sua propriedade.

## Planos
- **Start**: Plano inicial com funcionalidades básicas.
- **Pro**: Plano intermediário com mais módulos.
- **Enterprise**: Plano completo com CRM, agenda, financeiro, gateway de cobrança e todos os módulos.
- **Único**: Plano personalizado.

## Pagamentos e Assinatura
- A assinatura do PRUMO HUB é processada via Asaas (PIX, boleto ou cartão).
- Consultores podem emitir cobranças aos seus clientes através do Gateway de Cobrança com split automático.
- O valor da assinatura do consultor é R$ 297,00.
- Os consultores gerenciam seus recebimentos através da carteira digital Asaas White Label.

## Como ajudar o usuário
Quando o usuário perguntar sobre como usar um módulo específico, explique:
1. Para que serve o módulo
2. Onde encontrá-lo no menu (em qual seção)
3. As principais funcionalidades disponíveis
4. Dicas de uso prático

Se o usuário perguntar sobre algo que não está no PRUMO HUB, seja transparente e sugira entrar em contato com o suporte técnico.
`;

export const PRUMO_HUB_SUGGESTED_QUESTIONS = [
  { text: "Como cadastro uma nova propriedade?", icon: "Building2" },
  { text: "Como funciona o Gestão do CAR?", icon: "TreePine" },
  { text: "Como emito uma cobrança para meu cliente?", icon: "Wallet" },
  { text: "O que é o Termômetro de Regularidade?", icon: "BarChart3" },
  { text: "Como uso o CRM Prumo?", icon: "ClipboardList" },
  { text: "O que é APP e qual sua importância?", icon: "TreeDeciduous" },
];