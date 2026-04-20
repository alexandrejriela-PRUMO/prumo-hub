import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileCheck, CheckCircle, User, ArrowRight, ArrowLeft } from 'lucide-react';

const SAAS_CONTRACT_VERSION = 1;

const CONTRACT_CONTENT = `
<h2 style="text-align:center; font-size:1.1em; font-weight:bold; margin-bottom:8px;">CONTRATO DE ASSINATURA SAAS — PRUMO HUB</h2>

<p>Pelo presente instrumento particular, de um lado: <strong>PRUMO HUB</strong>, plataforma digital de gestão voltada ao setor agroambiental, doravante denominada <strong>PLATAFORMA</strong>, criada e representada pela <strong>Santa Rute Engenharia LTDA</strong>, pessoa jurídica de direito privado, inscrita sob o CNPJ n.º 62.807.412/0001-95, com sede na Rua José Antônio Saraiva n.º 340, bairro Pindorama, Três Passos/RS – CEP 98600-000,<br/>
e de outro lado, <strong>CONTRATANTE</strong>, pessoa física ou jurídica devidamente cadastrada na plataforma, têm entre si justo e contratado o presente Contrato de Assinatura SaaS, que se regerá pelas seguintes cláusulas e condições:</p>

<hr style="margin:12px 0;"/>

<h3 style="font-weight:bold; margin-top:12px;">Obs.: ADEQUAÇÃO AO PLANO CONTRATADO</h3>
<p>As condições comerciais, limites operacionais conforme a exposição transparente no hub.prumo.site/landing, funcionalidades e valores aplicáveis ao CONTRATANTE serão aqueles correspondentes ao plano efetivamente contratado no momento do checkout NEXANO.</p>
<p>Caso o CONTRATANTE opte por plano diverso do Plano Enterprise, as disposições deste contrato deverão ser interpretadas com as devidas adaptações conforme as informações no site de planos e especificidades, especialmente quanto a:</p>
<ul><li>limites de usuários;</li><li>quantidade de clientes/propriedades;</li><li>funcionalidades disponíveis;</li><li>valores e condições comerciais.</li></ul>
<p>Prevalecerão, para todos os efeitos, as informações constantes no momento da contratação realizada no checkout.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 1 — OBJETO</h3>
<p>O presente contrato tem por objeto a concessão de licença de uso da plataforma PRUMO HUB, na modalidade Software as a Service (SaaS), destinada à gestão de propriedades rurais, clientes, processos técnicos, documentos e atividades relacionadas à consultoria ambiental e rural.<br/>
A plataforma possui natureza tecnológica e organizacional, não substituindo a atuação técnica, profissional ou jurídica dos usuários.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 2 — FUNCIONALIDADES DO PLANO ENTERPRISE</h3>
<p>O Plano Enterprise poderá disponibilizar ao CONTRATANTE, entre outras funcionalidades:</p>
<ul><li>acesso para até 3 usuários (consultor e equipe)</li><li>gestão de até 200 propriedades ou clientes</li><li>módulo de CRM para gestão de clientes</li><li>agenda integrada com serviços externos</li><li>módulo de controle financeiro (ERP)</li><li>alertas e monitoramento de informações relevantes</li><li>notificações para consultor e equipe</li><li>portal para clientes acessarem documentos</li><li>relatórios de gestão</li><li>materiais de suporte e treinamento.</li></ul>
<p>As funcionalidades poderão ser atualizadas, ampliadas ou aprimoradas pela PLATAFORMA ao longo do tempo.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 3 — VALOR DA ASSINATURA</h3>
<p>Pela utilização da plataforma no Plano Enterprise, o CONTRATANTE pagará o valor de:<br/>
<strong>R$ 497,00 (quatrocentos e noventa e sete reais) mensais.</strong></p>
<p>A cobrança poderá ocorrer por meio de: cartão de crédito, boleto bancário, ou outros meios disponibilizados pela plataforma ou via equipe pelos canais oficiais.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 4 — PRAZO DE VIGÊNCIA E FIDELIDADE</h3>
<p>O presente contrato possui prazo mínimo de fidelidade de <strong>12 (doze) meses</strong>, contados a partir da ativação da assinatura.<br/>
Caso o CONTRATANTE solicite cancelamento antes do término do prazo mínimo, será devida multa equivalente a <strong>30% (trinta por cento)</strong> do valor das mensalidades restantes até o final do período de fidelidade.<br/>
Após o cumprimento do prazo mínimo, o contrato passará a vigorar por prazo indeterminado, podendo ser cancelado mediante aviso com antecedência mínima de 30 dias.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 5 — LIMITES DO PLANO</h3>
<p>O plano Enterprise possui os seguintes limites operacionais: até 3 usuários ativos e até 200 propriedades ou clientes cadastrados.<br/>
Ultrapassados esses limites, poderá ser necessário upgrade de plano ou contratação adicional.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 6 — FASE INICIAL DA PLATAFORMA</h3>
<p>O CONTRATANTE reconhece que a plataforma PRUMO HUB encontra-se em processo contínuo de desenvolvimento e evolução tecnológica. Assim, poderão ocorrer eventuais falhas técnicas, instabilidades temporárias, indisponibilidades momentâneas e erros de funcionamento (bugs).<br/>
A PLATAFORMA compromete-se a realizar melhorias contínuas e correções sempre que necessário. Tais situações não configuram, por si só, descumprimento contratual.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 7 — PROGRAMA DE USUÁRIOS INICIAIS (EARLY ADOPTERS)</h3>
<p>O CONTRATANTE poderá integrar o programa de usuários iniciais da plataforma (Early Adopters). Nesse contexto, funcionalidades poderão estar em fase de testes ou evolução, o sistema poderá sofrer ajustes ou melhorias, e feedbacks dos usuários poderão ser utilizados para aprimoramento do produto.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 8 — TREINAMENTO E IMPLANTAÇÃO</h3>
<p>O CONTRATANTE terá direito a período inicial de treinamento de 3 meses, contados da ativação da assinatura. Durante esse período serão disponibilizadas até 2 reuniões mensais de treinamento ou suporte, realizadas de forma remota pela plataforma Google Meet ou ferramenta equivalente. As reuniões deverão ser previamente agendadas entre as partes.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 9 — RESPONSABILIDADE PELOS DADOS</h3>
<p>O CONTRATANTE é responsável pelos dados, documentos e informações inseridos na plataforma. A PRUMO HUB não se responsabiliza pela veracidade das informações inseridas, por decisões técnicas tomadas pelos usuários, ou por eventuais prejuízos decorrentes dessas decisões.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 10 — USO DE DADOS AGREGADOS</h3>
<p>A plataforma poderá utilizar dados gerados no sistema de forma agregada e anonimizada para melhoria da plataforma, desenvolvimento de funcionalidades e produção de estatísticas e indicadores do setor. Em nenhuma hipótese tais dados permitirão identificar usuários ou clientes individualmente. O tratamento de dados seguirá as disposições da Lei Geral de Proteção de Dados Pessoais.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 11 — PROTEÇÃO DA BASE DE CLIENTES DOS CONSULTORES</h3>
<p>A PRUMO HUB reconhece que os dados de clientes cadastrados pelos consultores constituem ativos comerciais de seus respectivos usuários. Dessa forma, a plataforma compromete-se a não compartilhar clientes de um consultor com outros consultores, não utilizar tais dados para prospecção comercial própria, não comercializar ou transferir essas informações a terceiros.<br/>
A plataforma não usará em benefício próprio e nem para terceiros, exceto sob autorização expressa do usuário contratante.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 12 — EVOLUÇÃO PARA MARKETPLACE RURAL</h3>
<p>O CONTRATANTE reconhece que a plataforma poderá evoluir futuramente para incluir funcionalidades de marketplace ou intermediação de serviços rurais e ambientais. Essas funcionalidades poderão permitir a conexão entre produtores rurais, consultores, empresas, instituições financeiras e fornecedores de serviços. Caso implementadas, tais funcionalidades poderão estar sujeitas a termos adicionais específicos.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 13 — PROPRIEDADE INTELECTUAL</h3>
<p>Todo o software, design, estrutura, funcionalidades e marca PRUMO HUB constituem propriedade intelectual exclusiva da plataforma. O presente contrato concede ao CONTRATANTE apenas licença limitada de uso, não exclusiva e intransferível. É proibido copiar o software, realizar engenharia reversa ou explorar comercialmente a plataforma sem autorização.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 14 — DISPONIBILIDADE DO SERVIÇO</h3>
<p>A plataforma envidará seus melhores esforços para manter o sistema disponível. Todavia, poderão ocorrer interrupções decorrentes de manutenção técnica, atualizações, falhas de infraestrutura ou serviços de terceiros.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 15 — LIMITAÇÃO DE RESPONSABILIDADE</h3>
<p>A plataforma PRUMO HUB é fornecida no estado em que se encontra. Na máxima extensão permitida pela legislação, a plataforma não se responsabiliza por danos indiretos ou consequenciais, perdas financeiras ou comerciais, ou decisões técnicas tomadas pelos usuários.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 16 — INFRAESTRUTURA TECNOLÓGICA E SERVIÇOS DE TERCEIROS</h3>
<p>A CONTRATANTE declara estar ciente de que a plataforma PRUMO HUB foi desenvolvida utilizando ferramentas modernas de desenvolvimento e infraestrutura tecnológica, podendo incluir plataformas de criação de software, hospedagem em nuvem, bancos de dados, APIs e serviços de automação fornecidos por terceiros, incluindo, mas não se limitando, à plataforma Base44.<br/>
Em razão dessa arquitetura tecnológica, o funcionamento da plataforma poderá depender parcial ou integralmente da disponibilidade, estabilidade e continuidade desses serviços externos.<br/>
A PRUMO HUB reserva-se o direito de alterar a arquitetura tecnológica, ferramentas de desenvolvimento ou provedores de infraestrutura utilizados na plataforma, sempre que necessário para melhoria de desempenho, segurança, estabilidade ou escalabilidade da solução.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 17 — RESCISÃO</h3>
<p>A plataforma poderá suspender ou encerrar contas em caso de inadimplência, violação contratual ou uso indevido do sistema.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 18 — LEGISLAÇÃO APLICÁVEL</h3>
<p>Este contrato será regido pelas leis do Brasil. Fica eleito o foro da comarca de Três Passos, no estado do Rio Grande do Sul, para dirimir eventuais controvérsias.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 19 — ACEITE DIGITAL</h3>
<p>O aceite deste contrato poderá ocorrer por meio eletrônico, mediante assinatura digital ou aceite na plataforma. O aceite eletrônico possui plena validade jurídica conforme a legislação pátria.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 20 — DA CONTRATAÇÃO DIGITAL, IDENTIFICAÇÃO E CONDIÇÕES DO PLANO</h3>
<p><strong>20.1 — Contratação Eletrônica e Identificação do Contratante</strong><br/>
O presente contrato constitui instrumento padrão de adesão, sendo aceito de forma eletrônica pelo CONTRATANTE no momento da contratação da plataforma. A identificação do CONTRATANTE será realizada por meio dos dados informados no ato do cadastro e contratação, incluindo nome completo ou razão social, CPF ou CNPJ, endereço de e-mail, dados de pagamento, registros de IP, data, hora e dispositivo utilizado e logs de aceite eletrônico do contrato.</p>
<p><strong>20.2 — Processamento de Pagamento e Registros</strong><br/>
A contratação poderá ser realizada por meio de plataformas de pagamento parceiras, incluindo a Nexano ou equivalente. Os dados gerados no processo de checkout constituem prova válida da contratação.</p>
<p><strong>20.3 — Fidelidade Contratual e Cancelamento</strong><br/>
Ainda que o CONTRATANTE realize o cancelamento da assinatura junto à plataforma de pagamento, permanecerá vigente a obrigação de cumprimento do prazo mínimo de fidelidade de 12 (doze) meses. O cancelamento do meio de pagamento não implica rescisão automática do contrato.</p>

<h3 style="font-weight:bold; margin-top:12px;">CLÁUSULA 21 — PLANO PRODUTOR RURAL ÚNICO COMPLETO</h3>
<p>A contratação do Plano Produtor Único será identificada e validada por meio do processo de checkout eletrônico realizado pelo CONTRATANTE.</p>
<p><strong>21.1 — Objeto do Plano Produtor Único</strong><br/>
O Plano Produtor Único consiste na contratação de consultoria técnica mensal prestada pela empresa Santa Rute Engenharia Rural, destinada ao atendimento de uma única propriedade rural pertencente ao CONTRATANTE, podendo incluir orientação sobre regularização ambiental, acompanhamento de demandas administrativas e documentais, suporte consultivo em relação a licenças, cadastros e obrigações ambientais, organização de informações dentro da plataforma PRUMO HUB e encaminhamento de demandas técnicas específicas quando necessário.</p>
<p><strong>21.2 — Utilização da Plataforma</strong><br/>
No âmbito do Plano Produtor Único, a plataforma PRUMO HUB será utilizada como ferramenta de organização, registro e gestão das informações da propriedade rural. O acesso à plataforma não caracteriza contratação de licença SaaS independente, mas sim ferramenta de suporte à consultoria prestada pela Santa Rute.</p>
<p><strong>21.3 — Limitação do Plano</strong><br/>
O Plano Produtor Único contempla atendimento exclusivamente para uma única propriedade rural. Caso o CONTRATANTE deseje incluir propriedades adicionais, será necessária a contratação de plano adicional ou ajuste contratual.</p>
<p><strong>21.4 — Natureza Consultiva dos Serviços</strong><br/>
Os serviços prestados possuem natureza consultiva e orientativa. A execução de serviços técnicos específicos poderá ser objeto de contratação adicional.</p>
<p><strong>21.5 — Valor e Periodicidade</strong><br/>
Pela prestação da consultoria mensal no Plano Produtor Único, o CONTRATANTE pagará o valor estabelecido no momento da contratação, conforme indicado no checkout da plataforma ou proposta comercial apresentada.</p>
<p><strong>21.6 — Integração com o Ecossistema PRUMO</strong><br/>
O Plano Produtor Único integra o ecossistema da plataforma PRUMO HUB, permitindo que o CONTRATANTE utilize funcionalidades básicas da plataforma para acompanhamento de sua propriedade rural. Esse plano não concede acesso às funcionalidades completas destinadas a consultores ou empresas.</p>
`;

export default function SaasContractPage({ onAccepted }) {
  const [step, setStep] = useState('contract'); // 'contract' | 'form'
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contractor, setContractor] = useState({
    name: '',
    document: '',
    address: '',
    phone: '',
    email: '',
  });

  const contractorValid = contractor.name.trim() && contractor.document.trim() && contractor.address.trim() && contractor.phone.trim() && contractor.email.trim();

  const handleAccept = async () => {
    if (!contractorValid) return;
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const now = new Date().toISOString();
      await base44.auth.updateMe({
        accepted_saas_contract_version: SAAS_CONTRACT_VERSION,
        accepted_saas_contract_date: now,
      });
      await base44.entities.TermsAcceptanceLog.create({
        user_email: user.email,
        user_name: user.full_name || '',
        terms_version: SAAS_CONTRACT_VERSION + 1000,
        accepted_at: now,
        user_agent: navigator.userAgent,
        contractor_name: contractor.name,
        contractor_document: contractor.document,
        contractor_address: contractor.address,
        contractor_phone: contractor.phone,
        contractor_email: contractor.email,
      });
      if (onAccepted) onAccepted();
    } catch (e) {
      console.error('Erro ao salvar aceite do contrato:', e);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 px-8 py-6 flex items-center gap-4">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
            alt="PRUMO Hub"
            className="h-12 w-auto object-contain"
          />
          <div>
            <h1 className="text-white text-xl font-bold">Contrato de Assinatura SaaS</h1>
            <p className="text-emerald-200 text-sm">PRUMO HUB — Santa Rute Engenharia LTDA</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex border-b border-gray-100">
          <div className={`flex-1 py-3 text-center text-xs font-semibold flex items-center justify-center gap-1.5 ${step === 'contract' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-gray-400'}`}>
            <FileCheck className="w-3.5 h-3.5" /> 1. Leitura do Contrato
          </div>
          <div className={`flex-1 py-3 text-center text-xs font-semibold flex items-center justify-center gap-1.5 ${step === 'form' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-gray-400'}`}>
            <User className="w-3.5 h-3.5" /> 2. Dados do Contratante
          </div>
        </div>

        {/* STEP 1 — Contrato */}
        {step === 'contract' && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              <FileCheck className="w-4 h-4 flex-shrink-0" />
              <span>Leia o contrato abaixo na íntegra antes de prosseguir.</span>
            </div>

            <ScrollArea className="h-96 border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: CONTRACT_CONTENT }}
              />
            </ScrollArea>

            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <Checkbox
                id="accept-contract"
                checked={accepted}
                onCheckedChange={setAccepted}
                className="mt-0.5"
              />
              <label htmlFor="accept-contract" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                Li e concordo com o <strong>Contrato de Assinatura SaaS — PRUMO HUB</strong>, incluindo todas as cláusulas e condições acima.
              </label>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => base44.auth.logout()}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Sair
              </Button>
              <Button
                onClick={() => setStep('form')}
                disabled={!accepted}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                Prosseguir <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2 — Formulário do contratante */}
        {step === 'form' && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
              <User className="w-4 h-4 flex-shrink-0" />
              <span>Preencha os dados de quem está contratando. Essas informações serão vinculadas ao contrato.</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome do Contratante / Empresa *</Label>
                <Input
                  placeholder="Ex: João da Silva ou Fazenda Boa Esperança LTDA"
                  value={contractor.name}
                  onChange={e => setContractor({ ...contractor, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>CPF ou CNPJ *</Label>
                <Input
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  value={contractor.document}
                  onChange={e => setContractor({ ...contractor, document: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Endereço Completo *</Label>
                <Input
                  placeholder="Rua, número, bairro, cidade, estado, CEP"
                  value={contractor.address}
                  onChange={e => setContractor({ ...contractor, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Telefone / WhatsApp *</Label>
                  <Input
                    placeholder="(55) 99999-9999"
                    value={contractor.phone}
                    onChange={e => setContractor({ ...contractor, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    placeholder="contato@empresa.com"
                    value={contractor.email}
                    onChange={e => setContractor({ ...contractor, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                onClick={() => setStep('contract')}
                variant="outline"
                className="gap-2 border-gray-300 text-gray-600"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button
                onClick={handleAccept}
                disabled={!contractorValid || saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Assinar e Continuar'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}