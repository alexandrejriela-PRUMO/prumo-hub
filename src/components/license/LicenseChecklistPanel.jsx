import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus, ClipboardList, Save, Trash2, ChevronDown,
  Upload, FileText, User, Calendar, MessageSquare,
  Send, AtSign, CheckCircle2, Clock, AlertTriangle
} from 'lucide-react';
import ChecklistProgress from '@/components/checklist/ChecklistProgress';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Cores ───────────────────────────────────────────
const statusColors = {
  'Pendente':     'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Em Progresso': 'bg-blue-100 text-blue-800 border-blue-300',
  'Concluído':    'bg-green-100 text-green-800 border-green-300',
  'Atrasado':     'bg-red-100 text-red-800 border-red-300',
  'Bloqueado':    'bg-gray-100 text-gray-800 border-gray-300',
};
const priorityColors = { 'Baixa': 'text-blue-500', 'Média': 'text-orange-500', 'Alta': 'text-red-500' };
const avatarColors = ['bg-emerald-500','bg-blue-500','bg-purple-500','bg-amber-500','bg-rose-500','bg-cyan-500'];
const getColor = (email) => avatarColors[(email?.charCodeAt(0)||0) % avatarColors.length];
const getInitials = (name) => name ? name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() : '?';

// ── renderiza @menções ───────────────────────────────
function renderMessage(text) {
  return text.split(/(@[\w\s.@]+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="font-semibold text-emerald-600 bg-emerald-50 rounded px-0.5">{part}</span>
      : <span key={i}>{part}</span>
  );
}

// ── Thread de comentários (reutiliza lógica do CRMThread) ────────────────────
function ChecklistThread({ thread = [], teamMembers, currentUser, onSaveThread, licenseLabel }) {
  const [message, setMessage] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length]);

  const handleInput = (e) => {
    const val = e.target.value;
    setMessage(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && !val.slice(lastAt + 1).includes(' ')) {
      setShowMentions(true);
      setMentionQuery(val.slice(lastAt + 1));
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member) => {
    const lastAt = message.lastIndexOf('@');
    setMessage(message.slice(0, lastAt) + `@${member.member_name || member.member_email} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const getMentions = () => {
    const regex = /@([\w\s.]+)/g;
    const found = [];
    let match;
    while ((match = regex.exec(message)) !== null) {
      const name = match[1].trim();
      const member = teamMembers.find(m => (m.member_name || m.member_email) === name);
      if (member) found.push(member.member_email);
    }
    return found;
  };

  const sendMessage = async () => {
    if (!message.trim() || saving) return;
    setSaving(true);
    const mentions = getMentions();
    const newMsg = {
      id: Date.now().toString(),
      author_email: currentUser?.email || '',
      author_name: currentUser?.full_name || currentUser?.email || 'Usuário',
      message: message.trim(),
      timestamp: new Date().toISOString(),
      mentions,
    };
    await onSaveThread([...thread, newMsg]);
    // notifica mencionados
    mentions.forEach(email => {
      base44.functions.invoke('notifyCRMAssignment', {
        responsible_email: email,
        assigner_name: currentUser?.full_name || currentUser?.email,
        type: 'mention',
        title: `comentário no Checklist de Licença (${licenseLabel})`,
        client_name: licenseLabel,
        property_id: '',
      }).catch(() => {});
    });
    setMessage('');
    setShowMentions(false);
    setSaving(false);
  };

  const filteredMembers = teamMembers.filter(m =>
    (m.member_name || m.member_email).toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {/* mensagens */}
      <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
        {thread.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2 italic">Inicie a conversa. Use @ para mencionar a equipe.</p>
        )}
        {thread.map(msg => {
          const isMe = msg.author_email === currentUser?.email;
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold ${getColor(msg.author_email)}`}>
                {getInitials(msg.author_name)}
              </div>
              <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`px-2.5 py-1.5 rounded-xl text-xs leading-relaxed ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                  {!isMe && <span className="font-semibold block text-emerald-700 text-[10px] mb-0.5">{msg.author_name}</span>}
                  <span className="whitespace-pre-wrap">{renderMessage(msg.message)}</span>
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                  {msg.timestamp ? format(new Date(msg.timestamp), "dd/MM 'às' HH:mm", { locale: ptBR }) : ''}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {/* input */}
      <div className="relative flex gap-2 items-end">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={message}
            onChange={handleInput}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
            placeholder="Comentar... (use @ para mencionar)"
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          {teamMembers.length > 0 && (
            <button
              type="button"
              onClick={() => { setMessage(m => m + '@'); setShowMentions(true); inputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-emerald-500 transition-colors"
            >
              <AtSign className="w-3.5 h-3.5" />
            </button>
          )}
          {showMentions && filteredMembers.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-32 overflow-y-auto">
              {filteredMembers.map(m => (
                <button
                  key={m.member_email}
                  onMouseDown={() => insertMention(m)}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-xs flex items-center gap-2"
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${getColor(m.member_email)}`}>
                    {getInitials(m.member_name)}
                  </div>
                  <span className="font-medium">{m.member_name || m.member_email}</span>
                  <span className="text-gray-400 text-[10px]">{m.member_role}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          size="sm"
          onClick={sendMessage}
          disabled={!message.trim() || saving}
          className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Item individual do checklist ──────────────────────────────────────────────
function ChecklistTaskItem({
  item, teamMembers, consultorEmail, licenseId, licenseLabel, propertyId, licenseOwnerEmail,
  onFieldChange, onStatusChange, onDelete, onSaveThread,
  isExpanded, onToggleExpand, user
}) {
  const [showFileInput, setShowFileInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [agendaDate, setAgendaDate] = useState(item.due_date || '');
  const [agendaTime, setAgendaTime] = useState('09:00');
  const [agendaEndTime, setAgendaEndTime] = useState('10:00');
  const [savingAgenda, setSavingAgenda] = useState(false);
  const [showAgendaForm, setShowAgendaForm] = useState(false);
  const [agendaAssignee, setAgendaAssignee] = useState(item.responsible_email || consultorEmail);

  const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'Concluído';

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onFieldChange('files', [...(item.files || []), {
        id: Date.now().toString(),
        name: file.name,
        url: file_url,
        type: 'Documento',
        uploaded_by: user?.email,
        uploaded_date: new Date().toISOString(),
        size_bytes: file.size,
      }]);
      toast.success('Arquivo anexado!');
    } catch {
      toast.error('Erro ao fazer upload');
    }
    setUploading(false);
    setShowFileInput(false);
  };

  // Cria evento na agenda + interação no CRM da propriedade vinculada
  const handleCreateAgendaEvent = async () => {
    if (!agendaDate) { toast.error('Defina uma data para criar o evento'); return; }
    setSavingAgenda(true);
    try {
      const assignee = teamMembers.find(m => m.member_email === agendaAssignee);
      const startISO = `${agendaDate}T${agendaTime}:00`;
      const endISO   = `${agendaDate}T${agendaEndTime}:00`;
      const eventDesc = `📋 Checklist — ${licenseLabel}\nResponsável: ${assignee?.member_name || agendaAssignee}${item.notes ? '\nObs: ' + item.notes : ''}`;

      // 1. Cria na Agenda
      await base44.entities.AgendaEvent.create({
        consultor_email: consultorEmail,
        title: item.title,
        description: eventDesc,
        event_type: 'Tarefa',
        start_datetime: startISO,
        end_datetime: endISO,
        all_day: false,
        property_id: propertyId || '',
        assigned_to_email: agendaAssignee,
        assigned_to_name: assignee?.member_name || agendaAssignee,
        status: 'Pendente',
        priority: item.priority || 'Média',
        notes: item.notes || '',
      });

      // 2. Cria interação + tarefa no CRM da propriedade vinculada (se houver propertyId)
      if (propertyId) {
        try {
          // Busca o owner_email da Property para poder cruzar com o ClientCRM
          let ownerEmail = null;
          try {
            const propList = await base44.entities.Property.filter({ id: propertyId });
            ownerEmail = propList?.[0]?.owner_email || null;
          } catch {}

          const crmList = await base44.entities.ClientCRM.filter({ consultor_email: consultorEmail });
          // Tenta: 1) property_id direto, 2) client_email == owner_email da propriedade, 3) client_email == owner_email da licença
          const crmMatch = crmList.find(c => c.property_id === propertyId)
            || (ownerEmail ? crmList.find(c => c.client_email === ownerEmail) : null)
            || (licenseOwnerEmail ? crmList.find(c => c.client_email === licenseOwnerEmail) : null);
          if (crmMatch) {
            const taskId = Date.now().toString();
            const interactionId = (Date.now() + 1).toString();

            // Tarefa no CRM (aparece no card do board e na aba Tarefas)
            const newTask = {
              id: taskId,
              title: `📋 ${item.title}`,
              description: `Checklist: ${licenseLabel}${item.notes ? ' — ' + item.notes : ''}`,
              due_date: agendaDate,
              done: false,
              status: 'pending',
              priority: item.priority || 'Média',
              responsible_email: agendaAssignee,
              responsible_name: assignee?.member_name || agendaAssignee,
              assigned_to_email: agendaAssignee,
              assigned_by_email: consultorEmail,
              assigned_at: new Date().toISOString(),
              thread: [...(item.thread || [])], // espelha thread existente da tarefa do checklist
            };

            // Interação no CRM (aparece na aba Interações)
            const newInteraction = {
              id: interactionId,
              date: new Date().toISOString(),
              type: 'Reunião',
              title: `📋 ${item.title} — Checklist: ${licenseLabel}`,
              description: `Tarefa agendada via Checklist de Licença.\nData: ${format(new Date(startISO), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\nDelegado para: ${assignee?.member_name || agendaAssignee}${item.notes ? '\nObs: ' + item.notes : ''}`,
              next_action: item.title,
              next_action_date: agendaDate,
              responsible_email: agendaAssignee,
              responsible_name: assignee?.member_name || agendaAssignee,
              created_by: consultorEmail,
              thread: [],
            };

            // Busca estado fresco para evitar race condition
            const freshList = await base44.entities.ClientCRM.filter({ id: crmMatch.id });
            const freshCRM = freshList?.[0] || crmMatch;
            await base44.entities.ClientCRM.update(crmMatch.id, {
              tasks: [...(freshCRM.tasks || []), newTask],
              interactions: [...(freshCRM.interactions || []), newInteraction],
            });
          }
        } catch {
          // silencioso — agenda já foi criada, CRM é opcional
        }
      }

      // 3. Registra no histórico da tarefa
      onFieldChange('activity_history', [...(item.activity_history || []), {
        id: Date.now().toString(),
        action: 'edited',
        timestamp: new Date().toISOString(),
        user_email: user?.email,
        user_name: user?.full_name || user?.email,
        details: `📅 Agendado para ${format(new Date(startISO), "dd/MM/yyyy 'às' HH:mm")} → ${assignee?.member_name || agendaAssignee} · registrado na Agenda e CRM`,
      }]);

      // 4. Notifica o responsável delegado (se diferente do consultor)
      if (agendaAssignee && agendaAssignee !== consultorEmail) {
        base44.functions.invoke('notifyCRMAssignment', {
          responsible_email: agendaAssignee,
          assigner_name: user?.full_name || consultorEmail,
          type: 'task',
          title: `${item.title} (Checklist: ${licenseLabel})`,
          client_name: licenseLabel,
          property_id: propertyId || '',
        }).catch(() => {});
      }

      toast.success('Evento criado na Agenda e registrado no CRM!');
      setShowAgendaForm(false);
    } catch (err) {
      toast.error('Erro ao criar evento: ' + err.message);
    }
    setSavingAgenda(false);
  };

  return (
    <Card className={`mb-2 transition-all overflow-hidden ${isOverdue ? 'border-red-400 border-l-4' : 'border-gray-200'}`}>
      {/* Header clicável */}
      <div
        className="flex items-start justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            <span className="font-semibold text-sm text-gray-800">{item.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[item.status] || statusColors['Pendente']}`}>
              {item.status}
            </span>
            {item.priority && (
              <span className={`text-xs font-bold ${priorityColors[item.priority]}`}>
                {item.priority === 'Alta' ? '●' : item.priority === 'Média' ? '◐' : '○'} {item.priority}
              </span>
            )}
            {item.responsible_name && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <User className="w-2.5 h-2.5" />{item.responsible_name}
              </span>
            )}
            {item.due_date && (
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${isOverdue ? 'bg-red-100 text-red-700 font-semibold' : 'bg-gray-100 text-gray-600'}`}>
                <Calendar className="w-2.5 h-2.5" />
                {new Date(item.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                {isOverdue && ' ⚠'}
              </span>
            )}
            {item.thread?.length > 0 && (
              <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" />{item.thread.length}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-gray-400 ml-6 mt-0.5 truncate">{item.description}</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="ml-2 text-gray-300 hover:text-red-500 transition-colors p-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <div className="border-t bg-gray-50/50 p-3 space-y-3">

          {/* Linha 1: Título editável */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Título</label>
            <input
              type="text"
              value={item.title}
              onChange={(e) => onFieldChange('title', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-1 focus:ring-emerald-300"
            />
          </div>

          {/* Linha 2: Status + Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Status</label>
              <select
                value={item.status}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option>Pendente</option>
                <option>Em Progresso</option>
                <option>Concluído</option>
                <option>Atrasado</option>
                <option>Bloqueado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Prioridade</label>
              <select
                value={item.priority || 'Média'}
                onChange={(e) => onFieldChange('priority', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option>Baixa</option>
                <option>Média</option>
                <option>Alta</option>
              </select>
            </div>
          </div>

          {/* Linha 3: Responsável */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1 flex items-center gap-1">
              <User className="w-3 h-3" /> Responsável
            </label>
            {teamMembers.length > 1 ? (
              <select
                value={item.responsible_email || ''}
                onChange={(e) => {
                  const m = teamMembers.find(tm => tm.member_email === e.target.value);
                  onFieldChange('responsible_email', e.target.value);
                  onFieldChange('responsible_name', m?.member_name || e.target.value);
                }}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option value="">— Selecionar —</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.member_email}>
                    {m.member_name} ({m.member_role})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={item.responsible_name || ''}
                onChange={(e) => onFieldChange('responsible_name', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                placeholder="Nome do responsável"
              />
            )}
          </div>

          {/* Linha 4: Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Início</label>
              <input type="date" value={item.start_date || ''} onChange={(e) => onFieldChange('start_date', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Prazo</label>
              <input type="date" value={item.due_date || ''} onChange={(e) => {
                onFieldChange('due_date', e.target.value);
                setAgendaDate(e.target.value);
              }}
                className={`w-full px-2 py-1.5 border rounded-lg text-sm bg-white ${isOverdue ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
            </div>
          </div>

          {/* Linha 5: Observações */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Observações
            </label>
            <textarea
              value={item.notes || ''}
              onChange={(e) => onFieldChange('notes', e.target.value)}
              placeholder="Observações sobre esta tarefa..."
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white resize-none"
            />
          </div>

          {/* Linha 6: Criar evento na Agenda (form inline) */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" /> Agendar na Agenda
              </span>
              <button
                onClick={() => setShowAgendaForm(v => !v)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showAgendaForm ? 'Fechar' : '+ Criar evento'}
              </button>
            </div>
            {showAgendaForm && (
              <div className="space-y-2">
                {/* Data + horários */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 block mb-0.5">Data</label>
                    <input type="date" value={agendaDate} onChange={(e) => setAgendaDate(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-0.5">Início</label>
                    <input type="time" value={agendaTime} onChange={(e) => setAgendaTime(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-0.5">Fim</label>
                    <input type="time" value={agendaEndTime} onChange={(e) => setAgendaEndTime(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-xs" />
                  </div>
                </div>
                {/* Delegado para */}
                {teamMembers.length > 1 && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-0.5">Delegar para</label>
                    <select value={agendaAssignee} onChange={(e) => setAgendaAssignee(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-xs">
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.member_email}>{m.member_name} ({m.member_role})</option>
                      ))}
                    </select>
                  </div>
                )}
                <Button size="sm" onClick={handleCreateAgendaEvent} disabled={savingAgenda}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-xs h-8 gap-1">
                  <Calendar className="w-3 h-3" />
                  {savingAgenda ? 'Criando...' : 'Confirmar Evento na Agenda'}
                </Button>
              </div>
            )}
          </div>

          {/* Linha 7: Arquivos */}
          {(item.files?.length > 0 || showFileInput) && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                Arquivos ({item.files?.length || 0})
              </label>
              {item.files?.map(file => (
                <div key={file.id} className="flex items-center gap-2 bg-white border rounded p-1.5 mb-1 text-xs">
                  <FileText className="w-3 h-3 text-blue-500 flex-shrink-0" />
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-blue-600 hover:underline">{file.name}</a>
                </div>
              ))}
            </div>
          )}
          <Button size="sm" variant="outline" className="gap-1 text-xs w-full h-8" onClick={() => setShowFileInput(v => !v)}>
            <Upload className="w-3 h-3" /> Anexar Arquivo
          </Button>
          {showFileInput && (
            <input type="file" onChange={handleFileUpload} disabled={uploading} className="w-full text-xs" />
          )}

          {/* Linha 8: Histórico compacto */}
          {item.activity_history?.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Histórico</label>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {[...item.activity_history].reverse().slice(0, 5).map(act => (
                  <div key={act.id} className="text-xs text-gray-500 flex items-start gap-1">
                    <span className="text-gray-300 mt-0.5">•</span>
                    <span>
                      <span className="font-medium text-gray-600">{act.user_name}: </span>
                      {act.details}
                      <span className="text-gray-300 ml-1">
                        · {formatDistanceToNow(new Date(act.timestamp), { locale: ptBR, addSuffix: true })}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linha 9: Thread de comentários com @ */}
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              Discussão da tarefa
            </p>
            <ChecklistThread
              thread={item.thread || []}
              teamMembers={teamMembers}
              currentUser={user}
              licenseLabel={licenseLabel}
              onSaveThread={(updatedThread) => onSaveThread(updatedThread)}
            />
          </div>

        </div>
      )}
    </Card>
  );
}

// ── View inline do checklist ──────────────────────────────────────────────────
function InlineChecklistView({ checklist, user, consultorEmail, teamMembers, licenseId, licenseLabel, propertyId, licenseOwnerEmail }) {
  const [items, setItems] = useState(checklist.items || []);
  const [expandedItems, setExpandedItems] = useState({});
  const queryClient = useQueryClient();
  // Ref para sempre ter acesso ao state mais recente sem re-render em closures
  const itemsRef = React.useRef(items);
  React.useEffect(() => { itemsRef.current = items; }, [items]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectChecklist.update(checklist.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenseChecklist'] });
    }
  });

  const handleAddItem = () => {
    const newItem = {
      id: Date.now().toString(),
      title: 'Nova Tarefa',
      description: '',
      order: items.length,
      status: 'Pendente',
      priority: 'Média',
      responsible_email: consultorEmail || '',
      responsible_name: user?.full_name || '',
      start_date: '',
      due_date: '',
      notes: '',
      files: [],
      activity_history: [],
      thread: [],
    };
    setItems(prev => [...prev, newItem]);
    setExpandedItems(prev => ({ ...prev, [newItem.id]: true }));
  };

  const handleFieldChange = (itemId, field, value) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const handleStatusChange = (itemId, newStatus) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? {
        ...item, status: newStatus,
        completion_date: newStatus === 'Concluído' ? new Date().toISOString() : null,
        activity_history: [...(item.activity_history || []), {
          id: Date.now().toString(), action: 'status_changed',
          timestamp: new Date().toISOString(),
          user_email: user?.email, user_name: user?.full_name || user?.email,
          details: `Status alterado para "${newStatus}"`,
        }]
      } : item
    ));
  };

  const handleSaveThread = async (itemId, updatedThread) => {
    // Atualiza state local imediatamente
    const newItems = itemsRef.current.map(item => item.id === itemId ? { ...item, thread: updatedThread } : item);
    setItems(newItems);

    // Persiste no banco (checklist)
    const completed = newItems.filter(i => i.status === 'Concluído').length;
    const pending   = newItems.filter(i => i.status === 'Pendente').length;
    const delayed   = newItems.filter(i => i.status === 'Atrasado').length;
    const total = newItems.length;
    await updateMutation.mutateAsync({
      items: newItems,
      overall_progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      completed_tasks: completed, pending_tasks: pending, delayed_tasks: delayed,
      last_updated: new Date().toISOString(),
    });

    // Espelha a thread na tarefa correspondente do CRM (se houver)
    if (propertyId) {
      try {
        const changedItem = newItems.find(i => i.id === itemId);
        if (!changedItem) return;

        // Resolve owner_email da Property para cruzar com ClientCRM
        let ownerEmail = null;
        try {
          const propList = await base44.entities.Property.filter({ id: propertyId });
          ownerEmail = propList?.[0]?.owner_email || null;
        } catch {}

        const crmList = await base44.entities.ClientCRM.filter({ consultor_email: consultorEmail });
        const crmMatch = crmList.find(c => c.property_id === propertyId)
          || (ownerEmail ? crmList.find(c => c.client_email === ownerEmail) : null)
          || (licenseOwnerEmail ? crmList.find(c => c.client_email === licenseOwnerEmail) : null);
        if (crmMatch) {
          // Encontra a tarefa no CRM pelo título espelhado
          const crmTaskTitle = `📋 ${changedItem.title}`;
          const hasMirroredTask = (crmMatch.tasks || []).some(t => t.title === crmTaskTitle);
          if (hasMirroredTask) {
            const freshList = await base44.entities.ClientCRM.filter({ id: crmMatch.id });
            const freshCRM = freshList?.[0] || crmMatch;
            const updatedTasks = (freshCRM.tasks || []).map(t =>
              t.title === crmTaskTitle ? { ...t, thread: updatedThread } : t
            );
            await base44.entities.ClientCRM.update(crmMatch.id, { tasks: updatedTasks });
          }
        }
      } catch {
        // silencioso
      }
    }
  };

  const handleDeleteItem = (itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSave = () => {
    const completed = items.filter(i => i.status === 'Concluído').length;
    const pending   = items.filter(i => i.status === 'Pendente').length;
    const delayed   = items.filter(i => i.status === 'Atrasado').length;
    const total = items.length;
    updateMutation.mutate({
      items,
      overall_progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      completed_tasks: completed, pending_tasks: pending, delayed_tasks: delayed,
      last_updated: new Date().toISOString(),
    });
  };

  const sorted = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-4">
      <ChecklistProgress checklist={{ ...checklist, items }} />

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Pendentes', count: items.filter(i => i.status === 'Pendente').length, icon: Clock, color: 'text-yellow-500 bg-yellow-50' },
          { label: 'Concluídas', count: items.filter(i => i.status === 'Concluído').length, icon: CheckCircle2, color: 'text-green-500 bg-green-50' },
          { label: 'Atrasadas', count: items.filter(i => i.due_date && new Date(i.due_date) < new Date() && i.status !== 'Concluído').length, icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-lg p-2 text-center`}>
            <s.icon className={`w-4 h-4 mx-auto mb-0.5 ${s.color.split(' ')[0]}`} />
            <p className="text-xs font-bold">{s.count}</p>
            <p className="text-[10px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Tarefas ({items.length})</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleAddItem} className="gap-1 text-xs h-8">
            <Plus className="w-3 h-3" /> Adicionar
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 gap-1 text-xs h-8" disabled={updateMutation.isPending}>
            <Save className="w-3 h-3" /> {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          Nenhuma tarefa. Clique em "Adicionar" para começar.
        </p>
      ) : (
        sorted.map(item => (
          <ChecklistTaskItem
            key={item.id}
            item={item}
            teamMembers={teamMembers}
            consultorEmail={consultorEmail}
            licenseId={licenseId}
            licenseLabel={licenseLabel}
            propertyId={propertyId}
            licenseOwnerEmail={licenseOwnerEmail}
            onFieldChange={(field, value) => handleFieldChange(item.id, field, value)}
            onStatusChange={(status) => handleStatusChange(item.id, status)}
            onDelete={() => handleDeleteItem(item.id)}
            onSaveThread={(thread) => handleSaveThread(item.id, thread)}
            isExpanded={!!expandedItems[item.id]}
            onToggleExpand={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
            user={user}
          />
        ))
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function LicenseChecklistPanel({ license, user }) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const queryClient = useQueryClient();

  const consultorEmail = license.consultor_email || user?.email;
  const licenseLabel = `${license.license_type}${license.license_number ? ' Nº ' + license.license_number : ''}`;

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembersForChecklist', consultorEmail],
    queryFn: async () => {
      const all = await base44.entities.TeamMember.filter({ primary_user_email: consultorEmail });
      const active = all.filter(m => m.status === 'Ativo');
      return [
        { id: 'consultor', member_email: consultorEmail, member_name: user?.full_name || consultorEmail, member_role: 'Consultor' },
        ...active,
      ];
    },
    enabled: !!consultorEmail,
  });

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['licenseChecklist', license.id],
    queryFn: async () => {
      const result = await base44.entities.ProjectChecklist.filter({ entity_type: 'License', entity_id: license.id });
      return result?.[0] || null;
    },
    enabled: !!license.id,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['checklistTemplates', consultorEmail],
    queryFn: () => base44.entities.ChecklistTemplate.filter({ consultor_email: consultorEmail }),
    enabled: !!consultorEmail && showCreate,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectChecklist.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenseChecklist', license.id] });
      toast.success('Checklist criado!');
      setShowCreate(false);
      setSelectedTemplateId(null);
    },
    onError: (err) => toast.error('Erro: ' + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectChecklist.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenseChecklist', license.id] });
      toast.success('Checklist removido');
    },
  });

  const handleCreate = () => {
    const template = templates.find(t => t.id === selectedTemplateId);
    createMutation.mutate({
      entity_type: 'License', entity_id: license.id,
      consultor_email: consultorEmail,
      checklist_title: `Checklist - ${license.license_type}`,
      description: `Workflow para ${licenseLabel}`,
      template_id: template?.id || null,
      items: template?.steps?.map((step, index) => ({
        id: Date.now().toString() + index,
        title: step.title, description: step.description || '',
        order: step.order ?? index, status: 'Pendente',
        priority: step.default_priority || 'Média',
        responsible_email: consultorEmail, responsible_name: user?.full_name || '',
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + (step.estimated_days || 5) * 86400000).toISOString().split('T')[0],
        notes: '', files: [], activity_history: [], thread: [],
      })) || [],
      overall_progress: 0, completed_tasks: 0, pending_tasks: 0, delayed_tasks: 0,
      status: 'Em Progresso', created_at: new Date().toISOString(), last_updated: new Date().toISOString(),
    });
  };

  if (isLoading) return <p className="text-sm text-gray-400 py-4 text-center">Carregando checklist...</p>;

  if (!checklist) {
    return (
      <div className="mt-4">
        {!showCreate ? (
          <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}
            className="gap-2 w-full border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50">
            <Plus className="w-4 h-4" /> Criar Checklist para esta Licença
          </Button>
        ) : (
          <Card className="border-emerald-200">
            <CardHeader className="py-3"><CardTitle className="text-sm">Criar Checklist</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Modelo (opcional)</label>
                <select value={selectedTemplateId || ''} onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">— Começar do Zero —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.template_name} ({t.steps?.length || 0} etapas)</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancelar</Button>
                <Button size="sm" onClick={handleCreate} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Criar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <ClipboardList className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-gray-700">{licenseLabel}</span>
          <Badge className="bg-emerald-100 text-emerald-800 text-xs">{checklist.overall_progress || 0}% concluído</Badge>
          {teamMembers.length > 1 && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              {teamMembers.length - 1} membro{teamMembers.length > 2 ? 's' : ''} na equipe
            </Badge>
          )}
        </div>
        <button
          onClick={() => { if (window.confirm('Remover o checklist desta licença?')) deleteMutation.mutate(checklist.id); }}
          className="text-gray-300 hover:text-red-500 transition-colors p-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <InlineChecklistView
        checklist={checklist}
        user={user}
        consultorEmail={consultorEmail}
        teamMembers={teamMembers}
        licenseId={license.id}
        licenseLabel={licenseLabel}
        propertyId={license.property_id}
        licenseOwnerEmail={license.owner_email}
      />
    </div>
  );
}