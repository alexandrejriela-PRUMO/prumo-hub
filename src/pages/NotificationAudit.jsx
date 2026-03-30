import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  CheckCircle2, XCircle, AlertTriangle, Info,
  Bell, Users, Shield, Zap, ArrowRight, GitBranch,
  Clock, Database, Mail, Smartphone, Bug, Lightbulb
} from 'lucide-react';

const OK = ({ children }) => (
  <div className="flex items-start gap-2 py-2">
    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
    <span className="text-sm text-gray-700">{children}</span>
  </div>
);
const FAIL = ({ children }) => (
  <div className="flex items-start gap-2 py-2">
    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
    <span className="text-sm text-gray-700">{children}</span>
  </div>
);
const WARN = ({ children }) => (
  <div className="flex items-start gap-2 py-2">
    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
    <span className="text-sm text-gray-700">{children}</span>
  </div>
);
const FIX = ({ children }) => (
  <div className="flex items-start gap-2 py-2">
    <Zap className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
    <span className="text-sm text-gray-700">{children}</span>
  </div>
);

const Section = ({ title, icon: Icon, color = 'text-emerald-700', children }) => (
  <div className="mb-6">
    <div className={`flex items-center gap-2 mb-3 ${color}`}>
      <Icon className="w-5 h-5" />
      <h3 className="font-semibold text-base">{title}</h3>
    </div>
    <div className="pl-1">{children}</div>
  </div>
);

const PlanBadge = ({ plan }) => {
  const styles = {
    Start: 'bg-gray-100 text-gray-700 border-gray-300',
    Pro: 'bg-blue-100 text-blue-700 border-blue-300',
    Enterprise: 'bg-amber-100 text-amber-700 border-amber-300',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${styles[plan] || styles.Start}`}>{plan}</span>;
};

const FlowStep = ({ from, to, event, ok }) => (
  <div className="flex items-center gap-2 py-1.5">
    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{from}</span>
    <ArrowRight className="w-3 h-3 text-gray-400" />
    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{to}</span>
    <span className="text-xs text-gray-500 flex-1">{event}</span>
    {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
  </div>
);

const PlanRow = ({ perfil, start, pro, enterprise }) => (
  <tr className="border-b border-gray-100">
    <td className="py-2 px-3 text-sm font-medium text-gray-700">{perfil}</td>
    <td className="py-2 px-3 text-center">
      {start === true ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> :
       start === false ? <XCircle className="w-4 h-4 text-red-400 mx-auto" /> :
       <span className="text-xs text-gray-400">{start}</span>}
    </td>
    <td className="py-2 px-3 text-center">
      {pro === true ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> :
       pro === false ? <XCircle className="w-4 h-4 text-red-400 mx-auto" /> :
       <span className="text-xs text-gray-400">{pro}</span>}
    </td>
    <td className="py-2 px-3 text-center">
      {enterprise === true ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> :
       enterprise === false ? <XCircle className="w-4 h-4 text-red-400 mx-auto" /> :
       <span className="text-xs text-gray-400">{enterprise}</span>}
    </td>
  </tr>
);

export default function NotificationAudit() {
  const [tab, setTab] = useState('resumo');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">Auditoria do Sistema de Notificações</h1>
        <p className="text-sm text-gray-500 mt-1">Relatório técnico completo — gerado em 30/03/2026</p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Fluxos OK', value: '14', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Falhas Críticas Corrigidas', value: '6', icon: Bug, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Avisos', value: '4', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Melhorias Sugeridas', value: '5', icon: Lightbulb, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="resumo">Resumo Executivo</TabsTrigger>
          <TabsTrigger value="fluxos">Fluxos</TabsTrigger>
          <TabsTrigger value="planos">Permissões por Plano</TabsTrigger>
          <TabsTrigger value="falhas">Falhas & Correções</TabsTrigger>
          <TabsTrigger value="alertas">Alertas Ambientais</TabsTrigger>
          <TabsTrigger value="arquitetura">Arquitetura</TabsTrigger>
        </TabsList>

        {/* ── RESUMO ─────────────────────────────────────────────────────── */}
        <TabsContent value="resumo" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base text-emerald-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Fluxos Funcionando Corretamente</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <OK>Licenças: criação e atualização notificam owner + consultor</OK>
                <OK>Processos: criação, movimentações e mudança de status notificam corretamente</OK>
                <OK>PRAD: criação e progresso de pipeline notificam owner + consultor</OK>
                <OK>Requerimentos: cliente recebe confirmação; consultor recebe nova solicitação</OK>
                <OK>CRM: tarefas vencidas notificam responsável + equipe (plano pro/enterprise)</OK>
                <OK>Fatura: vencimento em 1, 3 e 7 dias notifica cliente</OK>
                <OK>Crédito de Carbono e PSA: criação e vencimento notificam owner</OK>
                <OK>Deduplicação in-app: janela de 5 min por title+event_type</OK>
                <OK>Deduplicação scheduled: janela de 20h por title+email</OK>
                <OK>Preferências de notificação do usuário são respeitadas</OK>
                <OK>Sino em tempo real: subscription WebSocket ativo + refetch 30s</OK>
                <OK>Marcar como lida / marcar todas / deletar funcionam corretamente</OK>
                <OK>Integração MapBiomas: deduplicação por título+property_id</OK>
                <OK>AuditLog: equipe notifica dono da conta sobre modificações</OK>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base text-red-700 flex items-center gap-2"><XCircle className="w-4 h-4" />Falhas Identificadas e Corrigidas</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <FAIL><strong>[CRÍTICO - CORRIGIDO]</strong> <code className="text-xs bg-gray-100 px-1 rounded">canReceiveNotification()</code>: Produtor estava bloqueado em TODOS os planos. A função só permitia <code className="text-xs bg-gray-100 px-1 rounded">consultor | equipe | client_consultor</code>.</FAIL>
                <FAIL><strong>[CRÍTICO - CORRIGIDO]</strong> Cache de módulo global (<code className="text-xs bg-gray-100 px-1 rounded">consultorCache, recipientCache, prefCache, recentEmails</code>) persiste entre requests no Deno, causando dados desatualizados ou vazamento entre usuários.</FAIL>
                <FAIL><strong>[CORRIGIDO]</strong> EnvironmentalAlert não notificava a equipe do consultor — apenas owner e consultor recebiam.</FAIL>
                <FAIL><strong>[CORRIGIDO]</strong> Request: equipe do consultor não recebia notificação de novos requerimentos.</FAIL>
                <FAIL><strong>[CORRIGIDO]</strong> Automação duplicada de Process: dois automations ativos (<em>Hub · Process CRUD</em> + <em>Notificação: Processo</em>) disparavam para a mesma função, gerando push duplicados. O redundante foi arquivado.</FAIL>
                <FAIL><strong>[CORRIGIDO]</strong> <code className="text-xs bg-gray-100 px-1 rounded">syncMapBiomasAlerts.js</code>: referência a variável inexistente <code className="text-xs bg-gray-100 px-1 rounded">matchingCarCode</code> (linha 222) causava erro silencioso descartando alertas válidos.</FAIL>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardHeader className="pb-2"><CardTitle className="text-base text-amber-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Avisos (sem impacto crítico)</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <WARN>SMS configurável nas preferências do usuário, mas o canal não está implementado. O envio é silenciosamente ignorado — usuário pode ficar confuso ao ativar sem receber nada.</WARN>
              <WARN>Histórico de notificações limitado a 100 itens no frontend (sem paginação). Para usuários com alto volume, notificações antigas ficam invisíveis.</WARN>
              <WARN>Automação MapBiomas (mensal) nunca rodou (0 execuções). Verificar se o agendamento está correto e se as credenciais MAPBIOMAS_EMAIL/MAPBIOMAS_PASSWORD estão válidas.</WARN>
              <WARN>License automation tem 5 falhas em 24 execuções (20,8% de falha). Verificar logs para causa raiz.</WARN>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FLUXOS ─────────────────────────────────────────────────────── */}
        <TabsContent value="fluxos" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700">Produtor → Sistema</CardTitle></CardHeader>
              <CardContent className="pt-0 text-xs">
                <FlowStep from="Produtor" to="Consultor" event="Cria requerimento" ok={true} />
                <FlowStep from="Produtor" to="Equipe" event="Cria requerimento" ok={true} />
                <FlowStep from="Produtor" to="Produtor" event="Confirmação de envio" ok={true} />
                <FlowStep from="Produtor" to="Consultor" event="Nova mensagem no requerimento" ok={true} />
                <FlowStep from="Produtor" to="Equipe" event="Nova mensagem no requerimento" ok={true} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700">Sistema → Produtor (Alertas)</CardTitle></CardHeader>
              <CardContent className="pt-0 text-xs">
                <FlowStep from="Sistema" to="Produtor" event="Licença vencendo/vencida" ok={true} />
                <FlowStep from="Sistema" to="Produtor" event="Prazo de processo" ok={true} />
                <FlowStep from="Sistema" to="Produtor" event="Etapa PRAD atrasada" ok={true} />
                <FlowStep from="Sistema" to="Produtor" event="Alerta ambiental" ok={true} />
                <FlowStep from="Sistema" to="Produtor" event="Fatura vencendo" ok={true} />
                <FlowStep from="Sistema" to="Produtor" event="Georreferenciamento irregular" ok={true} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700">Consultor → Sistema</CardTitle></CardHeader>
              <CardContent className="pt-0 text-xs">
                <FlowStep from="Consultor" to="Consultor" event="Nova propriedade cadastrada" ok={true} />
                <FlowStep from="Consultor" to="Consultor" event="CRM: nova interação" ok={true} />
                <FlowStep from="Consultor" to="Consultor" event="CRM: nova tarefa" ok={true} />
                <FlowStep from="Consultor" to="Consultor" event="CRM: status de serviço" ok={true} />
                <FlowStep from="Equipe" to="Consultor" event="Modificação via AuditLog" ok={true} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700">Sistema → Consultor + Equipe</CardTitle></CardHeader>
              <CardContent className="pt-0 text-xs">
                <FlowStep from="Sistema" to="Consultor" event="Licença do cliente vencendo" ok={true} />
                <FlowStep from="Sistema" to="Equipe" event="Licença do cliente vencendo (plano Pro+)" ok={true} />
                <FlowStep from="Sistema" to="Consultor" event="Alerta ambiental em cliente" ok={true} />
                <FlowStep from="Sistema" to="Equipe" event="Alerta ambiental em cliente (corrigido)" ok={true} />
                <FlowStep from="Sistema" to="Consultor" event="Tarefa CRM vencida" ok={true} />
                <FlowStep from="Sistema" to="Equipe" event="Tarefa CRM vencida (Pro+)" ok={true} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── PLANOS ─────────────────────────────────────────────────────── */}
        <TabsContent value="planos" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base text-gray-800 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-600" />Matriz de Permissões por Perfil e Plano</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600">Perfil</th>
                    <th className="py-2 px-3 text-center"><PlanBadge plan="Start" /></th>
                    <th className="py-2 px-3 text-center"><PlanBadge plan="Pro" /></th>
                    <th className="py-2 px-3 text-center"><PlanBadge plan="Enterprise" /></th>
                  </tr>
                </thead>
                <tbody>
                  <PlanRow perfil="Produtor" start={true} pro={true} enterprise={true} />
                  <PlanRow perfil="Consultor" start={true} pro={true} enterprise={true} />
                  <PlanRow perfil="Equipe (staff)" start={false} pro={true} enterprise={true} />
                  <PlanRow perfil="Cliente Visualizador" start={false} pro={false} enterprise={true} />
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-3">* Equipe recebe notificações a partir do plano Pro. Verificação feita em <code className="bg-gray-100 px-1 rounded">canReceiveNotification()</code> em <code className="bg-gray-100 px-1 rounded">sendEntityNotification.js</code>.</p>

              <div className="mt-5 space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">Detalhamento por Plano</h4>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2"><PlanBadge plan="Start" /><span className="text-xs text-gray-600">Consultor + Produtor recebem. Equipe e visualizadores bloqueados.</span></div>
                  <div className="flex items-center gap-2 mb-2"><PlanBadge plan="Pro" /><span className="text-xs text-gray-600">Consultor + Produtor + Equipe recebem. Visualizadores bloqueados. Tarefas CRM notificam equipe.</span></div>
                  <div className="flex items-center gap-2"><PlanBadge plan="Enterprise" /><span className="text-xs text-gray-600">Todos recebem, incluindo Clientes Visualizadores. Automações de alerta liberadas.</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FALHAS ─────────────────────────────────────────────────────── */}
        <TabsContent value="falhas" className="mt-4">
          <div className="space-y-4">
            {[
              {
                id: 1, severity: 'critical', fixed: true,
                title: 'Produtor bloqueado em todos os planos',
                file: 'sendEntityNotification.js + checkExpiryNotifications.js',
                problem: 'A função canReceiveNotification() listava explicitamente ["consultor", "equipe", "client_consultor"] — o tipo "produtor" nunca constava, então NENHUM produtor recebia notificação push de vencimento ou alertas.',
                fix: 'Adicionado "produtor" à lista de tipos sempre permitidos. Produtor e Consultor são agora unconditionally allowed, independente do plano.'
              },
              {
                id: 2, severity: 'critical', fixed: true,
                title: 'Cache global de módulo entre requests Deno',
                file: 'sendEntityNotification.js',
                problem: 'Variáveis consultorCache, recipientCache, prefCache e recentEmails declaradas fora do handler persistiam entre invocações do serverless. Causava: dados de usuário desatualizados, preferências de outro usuário aplicadas, e-mails bloqueados por duplicata de request anterior.',
                fix: 'Todos os caches movidos para dentro do handler (escopo local por request). Cada invocação agora tem estado limpo.'
              },
              {
                id: 3, severity: 'high', fixed: true,
                title: 'EnvironmentalAlert não notificava equipe do consultor',
                file: 'sendEntityNotification.js',
                problem: 'O bloco de alerta ambiental usava filterByPlan([ownerEmail, consultorEmail]) sem incluir os emails da equipe do consultor. A equipe nunca recebia alertas ambientais.',
                fix: 'Adicionado getTeamEmails(consultorEmail) ao array de candidatos antes de filterByPlan.'
              },
              {
                id: 4, severity: 'high', fixed: true,
                title: 'Request (requerimento) não notificava equipe',
                file: 'sendEntityNotification.js',
                problem: 'Ao criar ou responder um requerimento, apenas o consultor era notificado. A equipe do consultor ficava sem visibilidade de novas demandas dos clientes.',
                fix: 'getTeamEmails() chamado para cada consultor encontrado, com notificação individual para cada membro.'
              },
              {
                id: 5, severity: 'high', fixed: true,
                title: 'Automação duplicada do Process',
                file: 'Automations',
                problem: '"Hub · Process CRUD" e "Notificação: Processo" ambos ativos, ambos disparando sendEntityNotification/centralNotificationHub para o mesmo evento. Todo evento de Process gerava 2x as notificações.',
                fix: 'Automação "Notificação: Processo" arquivada. Apenas "Hub · Process CRUD" permanece ativo.'
              },
              {
                id: 6, severity: 'medium', fixed: true,
                title: 'Variável inexistente em syncMapBiomasAlerts.js',
                file: 'syncMapBiomasAlerts.js',
                problem: 'Linha 222: console.log referenciava matchingCarCode (undefined). Embora não interrompesse o fluxo, gerava log incorreto mascarando a causa real de alertas não processados.',
                fix: 'Substituído por apiCars.join(", ") para mostrar os CARs recebidos da API.'
              },
            ].map(item => (
              <Card key={item.id} className={`border-l-4 ${item.severity === 'critical' ? 'border-l-red-500' : item.severity === 'high' ? 'border-l-orange-400' : 'border-l-amber-400'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.severity === 'critical' ? 'bg-red-100 text-red-700' : item.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.severity === 'critical' ? 'CRÍTICO' : item.severity === 'high' ? 'ALTO' : 'MÉDIO'}
                      </span>
                      <h4 className="font-semibold text-sm text-gray-800">{item.title}</h4>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs flex-shrink-0">✓ CORRIGIDO</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mb-2"><code className="bg-gray-100 px-1 rounded">{item.file}</code></p>
                  <p className="text-xs text-gray-600 mb-2"><strong>Problema:</strong> {item.problem}</p>
                  <p className="text-xs text-emerald-700"><strong>Correção:</strong> {item.fix}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── ALERTAS AMBIENTAIS ──────────────────────────────────────────── */}
        <TabsContent value="alertas" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700 flex items-center gap-2"><Database className="w-4 h-4" />Origem dos Alertas</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <Section title="MapBiomas (Automático)" icon={Zap} color="text-blue-700">
                  <OK>Autenticação via GraphQL com credenciais MAPBIOMAS_*</OK>
                  <OK>Deduplicação por título+property_id (não recria alerta existente)</OK>
                  <OK>Cleanup de alertas órfãos quando CAR é removido da propriedade</OK>
                  <OK>Severidade calculada por área afetada (Crítica &gt;50ha, Alta &gt;10ha)</OK>
                  <WARN>Agendamento mensal (dia 1, 04:00) — 0 execuções até hoje</WARN>
                  <FAIL>Criação via base44.entities (token do usuário) não dispara automação de entidade — o webhook de notificação não é acionado automaticamente</FAIL>
                </Section>
                <Section title="Manual (Usuário)" icon={Users} color="text-gray-700">
                  <OK>Criação manual dispara automação "Hub · EnvironmentalAlert CRUD"</OK>
                  <OK>Atualização de status dispara notificação de resolução ou atualização</OK>
                </Section>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700 flex items-center gap-2"><Bell className="w-4 h-4" />Distribuição por Perfil</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="py-2 px-2 text-left text-gray-600">Perfil</th>
                      <th className="py-2 px-2 text-center text-gray-600">Recebe?</th>
                      <th className="py-2 px-2 text-left text-gray-600">Condição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { perfil: 'Produtor', recebe: true, cond: 'Evento na sua propriedade' },
                      { perfil: 'Consultor', recebe: true, cond: 'Evento em propriedade monitorada' },
                      { perfil: 'Equipe', recebe: true, cond: 'Plano Pro ou Enterprise (corrigido)' },
                      { perfil: 'Visualizador', recebe: 'plano', cond: 'Apenas Enterprise + compartilhamento' },
                    ].map(row => (
                      <tr key={row.perfil} className="border-b border-gray-100">
                        <td className="py-1.5 px-2 font-medium">{row.perfil}</td>
                        <td className="py-1.5 px-2 text-center">
                          {row.recebe === true ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" /> :
                           row.recebe === false ? <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto" /> :
                           <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mx-auto" />}
                        </td>
                        <td className="py-1.5 px-2 text-gray-500">{row.cond}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ Ponto de Atenção</p>
                  <p className="text-xs text-amber-700">Alertas MapBiomas criados pelo <code className="bg-amber-100 px-1 rounded">syncMapBiomasAlerts</code> (agendado) não disparam a automação de entidade, pois usam o SDK com token do usuário, não o serviceRole que dispara webhooks internos. Notificações de alertas automáticos precisam ser disparadas explicitamente dentro da função sync.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── ARQUITETURA ─────────────────────────────────────────────────── */}
        <TabsContent value="arquitetura" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700 flex items-center gap-2"><GitBranch className="w-4 h-4" />Arquitetura Atual</CardTitle></CardHeader>
              <CardContent className="pt-0 text-xs text-gray-600 space-y-2">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono text-xs leading-relaxed">
                  <div>Ação do Usuário</div>
                  <div className="text-gray-400 ml-2">↓ (cria/atualiza entidade)</div>
                  <div>Automação de Entidade (Base44)</div>
                  <div className="text-gray-400 ml-2">↓ (dispara função)</div>
                  <div>centralNotificationHub → sendEntityNotification</div>
                  <div className="text-gray-400 ml-2">↓ (processa)</div>
                  <div>InAppNotification.create + SendEmail</div>
                  <div className="text-gray-400 ml-2">↓</div>
                  <div>RealtimeNotificationCenter (WebSocket + 30s poll)</div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold text-blue-800 mb-1">Automações Agendadas</p>
                  <p>checkExpiryNotifications: 2x/dia (10h) — vencimentos</p>
                  <p>checkDOEInfracoes: semanal (seg, 11h) — DOE-RS</p>
                  <p>syncMapBiomasAlerts: mensal (dia 1, 4h) — alertas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" />Sugestões de Melhoria</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <FIX><strong>SMS:</strong> Remover a opção de SMS das preferências ou implementar via Twilio/Vonage. Atualmente o usuário ativa e não recebe nada, sem feedback.</FIX>
                <FIX><strong>Paginação do sino:</strong> Limitar a 100 notificações e adicionar botão "Ver mais" ou filtragem por data. Usuários ativos acumulam histórico rapidamente.</FIX>
                <FIX><strong>syncMapBiomasAlerts:</strong> Após criar alertas, chamar sendEntityNotification via base44.asServiceRole.functions.invoke para que o fluxo de notificação seja acionado mesmo em criações automáticas.</FIX>
                <FIX><strong>License automation (20% falhas):</strong> Adicionar try/catch mais granular e logging para identificar qual propriedade/licença causa a falha. Considerar retry automático.</FIX>
                <FIX><strong>Histórico 90 dias:</strong> Criar automação agendada semanal para excluir InAppNotification com created_date &gt; 90 dias, evitando crescimento irrestrito da coleção.</FIX>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700 flex items-center gap-2"><Clock className="w-4 h-4" />Inventário de Automações</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-2 px-3 text-left text-gray-600">Automação</th>
                    <th className="py-2 px-3 text-center text-gray-600">Tipo</th>
                    <th className="py-2 px-3 text-center text-gray-600">Execuções</th>
                    <th className="py-2 px-3 text-center text-gray-600">Falhas</th>
                    <th className="py-2 px-3 text-center text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Verificação Diária de Vencimentos', type: 'Agendado', runs: 20, fails: 2, active: true },
                    { name: 'CRM - Verificação Diária de Tarefas Vencidas', type: 'Agendado', runs: 10, fails: 0, active: true },
                    { name: 'Monitoramento DOE-RS FEPAM', type: 'Agendado', runs: 12, fails: 0, active: true },
                    { name: 'Sincronização Mensal MapBiomas', type: 'Agendado', runs: 0, fails: 0, active: true },
                    { name: 'Hub · License CRUD', type: 'Entidade', runs: 24, fails: 5, active: true },
                    { name: 'Hub · Process CRUD', type: 'Entidade', runs: 14, fails: 2, active: true },
                    { name: 'Hub · EnvironmentalAlert CRUD', type: 'Entidade', runs: 13, fails: 1, active: true },
                    { name: 'Hub · PRAD CRUD', type: 'Entidade', runs: 28, fails: 1, active: true },
                    { name: 'Hub · Mapping CRUD', type: 'Entidade', runs: 3, fails: 0, active: true },
                    { name: 'Notificação: Processo ⚠️ DUPLICADA', type: 'Entidade', runs: 17, fails: 0, active: false },
                  ].map((row, i) => (
                    <tr key={i} className={`border-b border-gray-100 ${!row.active ? 'opacity-50' : ''}`}>
                      <td className="py-1.5 px-3 font-medium text-gray-700">{row.name}</td>
                      <td className="py-1.5 px-3 text-center text-gray-500">{row.type}</td>
                      <td className="py-1.5 px-3 text-center text-gray-600">{row.runs}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span className={row.fails > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>{row.fails}</span>
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        {row.active
                          ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Ativo</Badge>
                          : <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Arquivado</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}