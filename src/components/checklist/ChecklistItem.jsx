import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown, Upload, Trash2, FileText, User, Calendar,
  MessageCircle, Users, Check, Clock, AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import StepChat from './StepChat';

const statusConfig = {
  'Pendente':     { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
  'Em Progresso': { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock },
  'Concluído':    { color: 'bg-green-100 text-green-800 border-green-300', icon: Check },
  'Atrasado':     { color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle },
  'Bloqueado':    { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: AlertTriangle }
};

const priorityColors = {
  'Baixa': 'text-blue-600 bg-blue-50',
  'Média': 'text-orange-600 bg-orange-50',
  'Alta':  'text-red-600 bg-red-50'
};

export default function ChecklistItem({
  item,
  currentUser,
  consultorEmail,
  onUpdate,
  onDelete,
  isExpanded,
  onToggleExpand
}) {
  const [showFileInput, setShowFileInput] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'Concluído';
  const msgCount = item.activity_history?.filter(a => a.action === 'note_added').length || 0;

  // Busca membros da equipe do consultor
  const effectiveConsultorEmail = consultorEmail || currentUser?.email;
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', effectiveConsultorEmail],
    queryFn: () => base44.entities.TeamMember.filter(
      { primary_user_email: effectiveConsultorEmail, status: 'Ativo' },
      'member_name'
    ),
    enabled: !!effectiveConsultorEmail && showTeamPicker
  });

  const handleChange = (field, value) => {
    onUpdate({ ...item, [field]: value });
  };

  const handleAssignTeamMember = (member) => {
    onUpdate({
      ...item,
      responsible_email: member.member_email,
      responsible_name: member.member_name,
      activity_history: [
        ...(item.activity_history || []),
        {
          id: Date.now().toString(),
          action: 'assigned',
          timestamp: new Date().toISOString(),
          user_email: currentUser?.email || '',
          user_name: currentUser?.full_name || 'Sistema',
          details: `Tarefa delegada para ${member.member_name}`
        }
      ]
    });
    setShowTeamPicker(false);
  };

  const handleAddMessage = (msg) => {
    onUpdate({
      ...item,
      activity_history: [...(item.activity_history || []), msg]
    });
  };

  const handleFileUpload = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newFile = {
      id: Date.now().toString(),
      name: file.name,
      url: file_url,
      size_bytes: file.size,
      uploaded_by: currentUser?.email,
      uploaded_date: new Date().toISOString()
    };
    onUpdate({
      ...item,
      files: [...(item.files || []), newFile],
      activity_history: [...(item.activity_history || []), {
        id: Date.now().toString() + '_f',
        action: 'file_uploaded',
        timestamp: new Date().toISOString(),
        user_email: currentUser?.email || '',
        user_name: currentUser?.full_name || 'Sistema',
        details: `Arquivo "${file.name}" anexado`
      }]
    });
    setShowFileInput(false);
  };

  const cfg = statusConfig[item.status] || statusConfig['Pendente'];
  const StatusIcon = cfg.icon;

  return (
    <div className={cn(
      'bg-white rounded-xl border transition-all duration-200 overflow-hidden',
      isOverdue ? 'border-red-400 shadow-red-100 shadow-md' : 'border-gray-200 hover:shadow-md',
      isExpanded ? 'shadow-md' : ''
    )}>
      {/* Header Row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={onToggleExpand}
      >
        <ChevronDown className={cn('w-4 h-4 text-gray-400 flex-shrink-0 transition-transform', isExpanded && 'rotate-180')} />

        {/* Status indicator dot */}
        <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', {
          'bg-yellow-400': item.status === 'Pendente',
          'bg-blue-500': item.status === 'Em Progresso',
          'bg-green-500': item.status === 'Concluído',
          'bg-red-500': item.status === 'Atrasado',
          'bg-gray-400': item.status === 'Bloqueado',
        })} />

        <div className="flex-1 min-w-0">
          <p className={cn('font-semibold text-sm truncate', item.status === 'Concluído' && 'line-through text-gray-400')}>
            {item.title}
          </p>
          {item.responsible_name && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3" /> {item.responsible_name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {item.due_date && (
            <span className={cn('text-xs', isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400')}>
              {format(new Date(item.due_date), 'dd/MM')}
            </span>
          )}
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium hidden sm:inline', cfg.color)}>
            {item.status}
          </span>
          <span className={cn('text-xs px-1.5 py-0.5 rounded font-semibold', priorityColors[item.priority])}>
            {item.priority}
          </span>

          {/* Chat button with badge */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowChat(true); }}
            className="relative p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
            title="Abrir chat"
          >
            <MessageCircle className="w-4 h-4" />
            {msgCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {msgCount > 9 ? '9+' : msgCount}
              </span>
            )}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50/50">
          {item.description && (
            <p className="text-sm text-gray-600">{item.description}</p>
          )}

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Status</label>
              <select
                value={item.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <option>Pendente</option>
                <option>Em Progresso</option>
                <option>Concluído</option>
                <option>Atrasado</option>
                <option>Bloqueado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Prioridade</label>
              <select
                value={item.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <option>Baixa</option>
                <option>Média</option>
                <option>Alta</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Data Início
              </label>
              <input
                type="date"
                value={item.start_date || ''}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Prazo
              </label>
              <input
                type="date"
                value={item.due_date || ''}
                onChange={(e) => handleChange('due_date', e.target.value)}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300',
                  isOverdue ? 'border-red-400 bg-red-50' : 'border-gray-200'
                )}
              />
            </div>
          </div>

          {/* Responsible + Team Picker */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5 flex items-center gap-1">
              <User className="w-3 h-3" /> Responsável
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome ou email do responsável"
                value={item.responsible_name || ''}
                onChange={(e) => handleChange('responsible_name', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <button
                onClick={() => setShowTeamPicker(!showTeamPicker)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-colors',
                  showTeamPicker
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                )}
                title="Delegar para equipe"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Equipe</span>
              </button>
            </div>

            {/* Team Member Picker */}
            {showTeamPicker && (
              <div className="mt-2 bg-white border border-emerald-200 rounded-xl shadow-lg overflow-hidden">
                <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Delegar para membro da equipe
                  </p>
                </div>
                {teamMembers.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-gray-500 text-center">
                    Nenhum membro ativo na equipe
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {teamMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleAssignTeamMember(member)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {member.member_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{member.member_name}</p>
                          <p className="text-xs text-gray-500 truncate">{member.member_email}</p>
                        </div>
                        <Badge className="text-xs bg-gray-100 text-gray-600 border-0">{member.member_role}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Observações</label>
            <textarea
              value={item.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Adicionar notas..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 h-20 resize-none"
            />
          </div>

          {/* Files */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">
              Arquivos ({item.files?.length || 0})
            </label>
            <div className="space-y-1.5 mb-2">
              {item.files?.map(file => (
                <div key={file.id} className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="truncate hover:text-emerald-600 transition-colors">
                      {file.name}
                    </a>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{(file.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="gap-2 w-full border-dashed" onClick={() => setShowFileInput(!showFileInput)}>
              <Upload className="w-4 h-4" /> Anexar Arquivo
            </Button>
            {showFileInput && (
              <input type="file" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="mt-2 w-full text-sm" />
            )}
          </div>

          {/* History (non-chat events) */}
          {item.activity_history?.filter(a => a.action !== 'note_added').length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2">Histórico de Ações</label>
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {item.activity_history.filter(a => a.action !== 'note_added').map(activity => (
                  <div key={activity.id} className="text-xs bg-white border border-gray-100 p-2 rounded-lg flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold flex-shrink-0 mt-0.5 text-xs">
                      {(activity.user_name || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">{activity.details}</p>
                      <p className="text-gray-400">
                        {formatDistanceToNow(new Date(activity.timestamp), { locale: ptBR, addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat shortcut */}
          <button
            onClick={() => setShowChat(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-colors text-sm font-medium"
          >
            <MessageCircle className="w-4 h-4" />
            {msgCount > 0 ? `Ver ${msgCount} mensagem${msgCount > 1 ? 's' : ''} no chat` : 'Iniciar chat desta etapa'}
          </button>
        </div>
      )}

      {/* Chat Modal Overlay */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowChat(false)}>
          <div
            className="w-full sm:w-[420px] h-[500px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <StepChat
              item={item}
              currentUser={currentUser}
              onAddMessage={handleAddMessage}
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}