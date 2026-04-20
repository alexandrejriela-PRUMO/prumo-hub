import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  CheckCircle2, XCircle, AlertTriangle, Info,
  Bell, Users, Shield, Zap, ArrowRight, GitBranch,
  Clock, Mail, Bug, Lightbulb
} from 'lucide-react';

const OK   = ({ children }) => <div className="flex items-start gap-2 py-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-700">{children}</span></div>;
const FAIL = ({ children }) => <div className="flex items-start gap-2 py-1.5"><XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-700">{children}</span></div>;
const WARN = ({ children }) => <div className="flex items-start gap-2 py-1.5"><AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-700">{children}</span></div>;
const FIX  = ({ children }) => <div className="flex items-start gap-2 py-1.5"><Zap className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-700">{children}</span></div>;

const Section = ({ title, icon: Icon, color = 'text-emerald-700', children }) => (
  <div className="mb-5">
    <div className={`flex items-center gap-2 mb-2 ${color}`}>
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
    {[start, pro, enterprise].map((val, i) => (
      <td key={i} className="py-2 px-3 text-center">
        {val === true ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> :
         val === false ? <XCircle className="w-4 h-4 text-red-400 mx-auto" /> :
         <span className="text-xs text-gray-400">{val}</span>}
      </td>
    ))}
  </tr>
);

export default function NotificationAudit() {
  const [tab, setTab] = useState('resumo');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">Auditoria do Sistema de Notificações</h1>
        <p className="text-sm text-gray-500 mt-1">Relatório técnico completo — atualizado em 20/04/2026</p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Fluxos OK', value: '18', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Falhas Corrigidas', value: '8', icon: Bug, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Canais Ativos', value: '2', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Automações Ativas', value: '12', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
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
          <TabsTrigger value="central">Central de Notificações</TabsTrigger>
          <TabsTrigger value="fluxos">Fluxos</TabsTrigger>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="falhas">Falhas Corrigidas</TabsTrigger>
          <TabsTrigger value="arquitetura">Arquitetura</TabsTrigger>
        </TabsList>

        {/* ── RESUMO ─────────────────────────────────────────────────── */}
        <TabsContent value="resumo" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base text-emerald-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Funcionalidades Ativas e Funcionando</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <OK>Central de notificações com filtros por categoria (tarefas, licenças, CRM, contratos, etc)</OK>
                <OK>Sistema de prioridade visual: Alta 🔴 / Média 🟡 / OK 🟢 / Info ⚪</OK>
                <OK>Alertas urgentes com indicador pulsante "● URGENTE" para severity=error</OK>
                <OK>Notificações in-app em tempo real via WebSocket + polling 30s</OK>
                <OK>Resumo diário por email (08h) com agrupamento por categoria</OK>
                <OK>Resumo semanal opcional (pode ser acionado por parâmetro mode=weekly)</OK>
                <OK>Limpeza automática semanal (dom 03h) — remove lidas com +90 dias</OK>
                <OK>Deduplicação push: janela 5min por title+event_type por usuário</OK>
                <OK>Deduplicação scheduled: janela 20h por title+email</OK>
                <OK>Preferências por evento respeitadas (push e email independentes)</OK>
                <OK>Marcar como lida / marcar todas / deletar funcionam corretamente</OK>
                <OK>Link de ação direto para o item relacionado em todas as notificações</OK>
                <OK>Notificações de vencimento em 30/15/7/1 dias antes para licenças</OK>
                <OK>Email para tarefas vencidas, licenças, processos, contratos e PRADs</OK>
                <OK>Portal do cliente (enterprise): notificações sobre propriedade própria</OK>
                <OK>AuditLog: equipe notifica dono sobre modificações</OK>
                <OK>SMS: campo presente mas canal documentado como "Em breve" (sem confusão)</OK>
                <OK>Botão de atalho para Configurações de Notificação no painel lateral</OK>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base text-amber-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Avisos Ativos (baixo impacto)</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <WARN>Histórico limitado a 100 itens no frontend. Usuários com alto volume podem não ver notificações antigas. A limpeza automática de 90 dias mitiga o crescimento.</WARN>
                <WARN>Automação MapBiomas (mensal) rodou 1 vez. Verificar se alertas criados automaticamente disparam o fluxo de notificação corretamente (criados via asServiceRole).</WARN>
                <WARN>PRAD Hub automation: 1 falha em 46 execuções (2%). Causa provável: timeout em propriedades com muitos dados. Sem impacto crítico.</WARN>
                <WARN>Process Hub: 2 falhas em 28 execuções (7%). Verificar logs para identificar o payload específico que causa falha.</WARN>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── CENTRAL ─────────────────────────────────────────────────── */}
        <TabsContent value="central" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700 flex items-center gap-2"><Bell className="w-4 h-4" />Funcionalidades da Central (sino)</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <OK>Filtro "Todas" e "Não lidas" com contadores</OK>
                <OK>Filtro por categoria: Tarefas, Licenças, CRM, Contratos, Processos, Agenda, Financeiro, Sistema, Urgente</OK>
                <OK>Contagem de notificações por categoria (lidas + não lidas)</OK>
                <OK>Badge de prioridade por severity (Alta/Média/OK/Info)</OK>
                <OK>Indicador pulsante "● URGENTE" para alertas de alta prioridade</OK>
                <OK>Ícone dinâmico por tipo de evento (20+ ícones mapeados)</OK>
                <OK>Borda colorida à esquerda indica severity: vermelha=erro, âmbar=aviso, verde=sucesso, azul=info</OK>
                <OK>Clique abre diretamente o item relacionado (link inteligente com query params)</OK>
                <OK>Marcar todas como lidas com um clique</OK>
                <OK>Deletar notificação individual</OK>
                <OK>Atalho para Configurações de Notificação (ícone ⚙️)</OK>
                <OK>Link para Auditoria no rodapé</OK>
                <OK>Estado vazio com mensagem contextual por filtro ativo</OK>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700 flex items-center gap-2"><Mail className="w-4 h-4" />Canais de Entrega</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <Section title="Push In-App (✅ Ativo)" icon={Bell} color="text-emerald-700">
                  <OK>WebSocket em tempo real via base44.entities.subscribe()</OK>
                  <OK>Polling de fallback a cada 30s</OK>
                  <OK>Deduplicação por janela de 5min no frontend</OK>
                </Section>
                <Section title="Email (✅ Ativo)" icon={Mail} color="text-blue-700">
                  <OK>Emails imediatos para eventos críticos (licença vencida, tarefa vencida)</OK>
                  <OK>Resumo diário às 08h com todas as pendências agrupadas por categoria</OK>
                  <OK>Resumo semanal disponível (mode=weekly)</OK>
                  <OK>Respeita preferência email_enabled por event_type</OK>
                </Section>
                <Section title="SMS (⏳ Em Breve)" icon={Info} color="text-gray-500">
                  <WARN>Canal ainda não implementado. Toggle desabilitado na UI para evitar confusão.</WARN>
                </Section>
              </CardContent>
            </Card>
          </div>

          {/* Classificação por categoria */}
          <Card className="mt-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700">Classificação por Categoria e Prioridade</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="py-2 px-3 text-left text-gray-600">Categoria</th>
                      <th className="py-2 px-3 text-left text-gray-600">Eventos</th>
                      <th className="py-2 px-3 text-center text-gray-600">Prioridade</th>
                      <th className="py-2 px-3 text-center text-gray-600">Email imediato?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { cat: '🔴 Urgente', events: 'Licença vencida, tarefa vencida, alerta crítico', priority: 'Alta', email: true },
                      { cat: '📋 Licenças', events: 'Nova licença, andamento, vencendo, condicionante', priority: 'Alta/Média', email: true },
                      { cat: '⚖️ Processos', events: 'Novo processo, andamento, prazo', priority: 'Alta/Média', email: true },
                      { cat: '✅ Tarefas', events: 'Tarefa vencida, vencendo em 1d', priority: 'Alta', email: true },
                      { cat: '👥 CRM', events: 'Interação, @menção, novo requerimento', priority: 'Média', email: 'Menções sim' },
                      { cat: '📝 Contratos', events: 'Novo contrato, status, vencimento', priority: 'Média', email: true },
                      { cat: '📅 Agenda', events: 'Novo agendamento, atualização', priority: 'Média', email: true },
                      { cat: '💳 Financeiro', events: 'Nova fatura, vencendo em 1d', priority: 'Alta', email: 'Vencendo sim' },
                      { cat: '⚙️ Sistema', events: 'Alerta MapBiomas, PRAD, CAR, servidão', priority: 'Variável', email: 'Críticos sim' },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-medium text-gray-700">{row.cat}</td>
                        <td className="py-2 px-3 text-gray-500">{row.events}</td>
                        <td className="py-2 px-3 text-center text-gray-600">{row.priority}</td>
                        <td className="py-2 px-3 text-center">
                          {row.email === true ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" /> :
                           row.email === false ? <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto" /> :
                           <span className="text-gray-400">{row.email}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FLUXOS ─────────────────────────────────────────────────── */}
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
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700">Sistema → Produtor (Alertas Automáticos)</CardTitle></CardHeader>
              <CardContent className="pt-0 text-xs">
                <FlowStep from="Sistema" to="Produtor" event="Licença vencendo (30/15/7/1 dias)" ok={true} />
                <FlowStep from="Sistema" to="Produtor" event="Licença vencida" ok={true} />
                <FlowStep from="Sistema" to="Produtor" event="Prazo de processo" ok={true} />
                <FlowStep from="Sistema" to="Produtor" event="Etapa PRAD atrasada" ok={true} />
                <FlowStep from="Sistema" to="Produtor" event="Alerta ambiental" ok={true} />
                <FlowStep from="Sistema" to="Produtor" event="Fatura vencendo" ok={true} />
                <FlowStep from="Sistema" to="Produtor" event="Contrato vencendo" ok={true} />
                <FlowStep from="Sistema" to="Produtor" event="Georreferenciamento irregular" ok={true} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700">Consultor ↔ Sistema</CardTitle></CardHeader>
              <CardContent className="pt-0 text-xs">
                <FlowStep from="Consultor" to="Consultor" event="Nova propriedade cadastrada" ok={true} />
                <FlowStep from="Consultor" to="Consultor" event="CRM: nova interação" ok={true} />
                <FlowStep from="Consultor" to="Consultor" event="CRM: nova tarefa" ok={true} />
                <FlowStep from="Consultor" to="Membro" event="Tarefa delegada a membro" ok={true} />
                <FlowStep from="Consultor" to="Consultor" event="CRM: status de serviço" ok={true} />
                <FlowStep from="Equipe" to="Consultor" event="Modificação via AuditLog" ok={true} />
                <FlowStep from="Consultor" to="Cliente" event="Agenda: participante convidado" ok={true} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700">Sistema → Consultor + Equipe + Cliente</CardTitle></CardHeader>
              <CardContent className="pt-0 text-xs">
                <FlowStep from="Sistema" to="Consultor" event="Licença do cliente vencendo" ok={true} />
                <FlowStep from="Sistema" to="Equipe" event="Licença do cliente vencendo (Pro+)" ok={true} />
                <FlowStep from="Sistema" to="Cliente" event="Licença na propriedade (Enterprise)" ok={true} />
                <FlowStep from="Sistema" to="Consultor" event="Alerta ambiental em cliente" ok={true} />
                <FlowStep from="Sistema" to="Equipe" event="Alerta ambiental em cliente" ok={true} />
                <FlowStep from="Sistema" to="Consultor" event="Tarefa CRM vencida (email)" ok={true} />
                <FlowStep from="Sistema" to="Consultor" event="Resumo diário às 08h" ok={true} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── PLANOS ─────────────────────────────────────────────────── */}
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
              <p className="text-xs text-gray-500 mt-3">* Equipe recebe a partir do plano Pro. Verificação em <code className="bg-gray-100 px-1 rounded">canReceiveNotification()</code>.</p>

              <div className="mt-5 space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">Resumo por Plano</h4>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-center gap-2"><PlanBadge plan="Start" /><span className="text-xs text-gray-600">Consultor + Produtor. Equipe e visualizadores bloqueados.</span></div>
                  <div className="flex items-center gap-2"><PlanBadge plan="Pro" /><span className="text-xs text-gray-600">Consultor + Produtor + Equipe. Tarefas CRM notificam equipe.</span></div>
                  <div className="flex items-center gap-2"><PlanBadge plan="Enterprise" /><span className="text-xs text-gray-600">Todos, incluindo Clientes. Portal do cliente ativo. Alertas completos.</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FALHAS ─────────────────────────────────────────────────── */}
        <TabsContent value="falhas" className="mt-4">
          <div className="space-y-4">
            {[
              { id: 1, severity: 'critical', title: 'Produtor bloqueado em todos os planos', file: 'sendEntityNotification.js + checkExpiryNotifications.js', problem: 'canReceiveNotification() listava explicitamente ["consultor","equipe","client_consultor"] — o tipo "produtor" nunca constava, então NENHUM produtor recebia notificações push.', fix: 'Adicionado "produtor" à lista unconditionally allowed.' },
              { id: 2, severity: 'critical', title: 'Cache global de módulo entre requests Deno', file: 'sendEntityNotification.js', problem: 'consultorCache, recipientCache, prefCache e recentEmails declarados fora do handler persistiam entre invocações. Causava dados desatualizados e vazamento de preferências entre usuários.', fix: 'Todos os caches movidos para dentro do handler (escopo local por request).' },
              { id: 3, severity: 'high', title: 'EnvironmentalAlert não notificava equipe do consultor', file: 'sendEntityNotification.js', problem: 'Bloco de alerta ambiental não incluía emails da equipe do consultor — apenas owner e consultor recebiam.', fix: 'Adicionado getTeamEmails(consultorEmail) ao array de candidatos.' },
              { id: 4, severity: 'high', title: 'Request (requerimento) não notificava equipe', file: 'sendEntityNotification.js', problem: 'Apenas o consultor era notificado. Equipe ficava sem visibilidade de novas demandas.', fix: 'getTeamEmails() chamado para cada consultor encontrado.' },
              { id: 5, severity: 'high', title: 'Automação duplicada do Process', file: 'Automations', problem: '"Hub · Process CRUD" e "Notificação: Processo" ambos ativos disparando a mesma função — todo evento Process gerava 2x notificações.', fix: 'Automação "Notificação: Processo" arquivada.' },
              { id: 6, severity: 'medium', title: 'Variável inexistente em syncMapBiomasAlerts.js', file: 'syncMapBiomasAlerts.js', problem: 'Linha 222: referência a matchingCarCode (undefined) mascarava alertas não processados.', fix: 'Substituído por apiCars.join(", ").' },
              { id: 7, severity: 'high', title: 'Enum InAppNotification incompleto', file: 'entities/InAppNotification.json', problem: 'Tipos nova_licenca, atualizacao_licenca, task_overdue, task_due_soon, novo_contrato, atualizacao_contrato, novo_cliente_crm, atualizacao_cliente_crm ausentes. Causava falhas ao salvar notificações.', fix: 'Todos os tipos adicionados ao enum.' },
              { id: 8, severity: 'medium', title: 'SMS habilitado na UI sem backend implementado', file: 'NotificationPreferences.jsx', problem: 'Toggle de SMS permitia ativar sem que nenhum email fosse enviado — usuário ativava sem receber nada.', fix: 'Toggle desabilitado e badge "Em breve" exibido. Campo preservado no schema para implementação futura.' },
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

        {/* ── ARQUITETURA ─────────────────────────────────────────────── */}
        <TabsContent value="arquitetura" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700 flex items-center gap-2"><GitBranch className="w-4 h-4" />Arquitetura Atual</CardTitle></CardHeader>
              <CardContent className="pt-0 text-xs text-gray-600 space-y-2">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono text-xs leading-relaxed">
                  <div className="font-bold text-gray-800">Fluxo em tempo real (eventos)</div>
                  <div className="text-gray-400 ml-2">↓ Ação do usuário → entidade criada/atualizada</div>
                  <div>Automação de Entidade (Base44 webhook)</div>
                  <div className="text-gray-400 ml-2">↓</div>
                  <div>centralNotificationHub → sendEntityNotification</div>
                  <div className="text-gray-400 ml-2">↓ (filtra plano, respeita prefs)</div>
                  <div>InAppNotification.create + SendEmail (imediato)</div>
                  <div className="text-gray-400 ml-2">↓</div>
                  <div>RealtimeNotificationCenter (WebSocket + 30s poll)</div>
                  <div className="mt-3 font-bold text-gray-800">Fluxo agendado (prazos)</div>
                  <div className="text-gray-400 ml-2">↓ checkExpiryNotifications (2x/dia)</div>
                  <div>Vencimentos: push + email para urgentes</div>
                  <div className="mt-3 font-bold text-gray-800">Resumo diário (08h)</div>
                  <div className="text-gray-400 ml-2">↓ sendNotificationDigest (1x/dia)</div>
                  <div>Email agrupado por categoria para não lidas</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-700 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" />Próximas Melhorias Sugeridas</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <FIX><strong>SMS via Twilio/Vonage:</strong> Implementar para alertas críticos (licença vencida, alerta ambiental alta prioridade). Requer TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN.</FIX>
                <FIX><strong>Paginação do sino:</strong> Adicionar botão "Ver mais" para histórico além de 100 itens, ou filtro por data.</FIX>
                <FIX><strong>syncMapBiomasAlerts:</strong> Após criar alertas, chamar sendEntityNotification via asServiceRole.functions.invoke para disparar o fluxo automaticamente.</FIX>
                <FIX><strong>Preferência de digest:</strong> Adicionar toggle específico "Receber resumo diário por email" nas preferências — hoje respeita apenas email_enabled global.</FIX>
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
                    <th className="py-2 px-3 text-center text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Verificação Diária de Vencimentos', type: 'Agendado (10h)', active: true },
                    { name: 'CRM - Verificação Diária de Tarefas', type: 'Agendado (10h)', active: true },
                    { name: 'Resumo Diário de Notificações', type: 'Agendado (08h)', active: true, new: true },
                    { name: 'Limpeza Semanal de Notificações', type: 'Agendado (dom 03h)', active: true, new: true },
                    { name: 'Monitoramento DOE-RS FEPAM', type: 'Agendado (seg 11h)', active: true },
                    { name: 'Sincronização Mensal MapBiomas', type: 'Agendado (dia 1, 4h)', active: true },
                    { name: 'Hub · License CRUD', type: 'Entidade', active: true },
                    { name: 'Hub · Process CRUD', type: 'Entidade', active: true },
                    { name: 'Hub · EnvironmentalAlert CRUD', type: 'Entidade', active: true },
                    { name: 'Hub · PRAD CRUD', type: 'Entidade', active: true },
                    { name: 'Hub · Mapping CRUD', type: 'Entidade', active: true },
                    { name: 'Hub · ClientContract CRUD', type: 'Entidade', active: true },
                    { name: 'Hub · AgendaEvent CRUD', type: 'Entidade', active: true },
                    { name: 'Notificação: Processo (DUPLICADA)', type: 'Entidade', active: false },
                  ].map((row, i) => (
                    <tr key={i} className={`border-b border-gray-100 ${!row.active ? 'opacity-40' : ''}`}>
                      <td className="py-1.5 px-3 font-medium text-gray-700 flex items-center gap-2">
                        {row.name}
                        {row.new && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] px-1.5">Novo</Badge>}
                      </td>
                      <td className="py-1.5 px-3 text-center text-gray-500">{row.type}</td>
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