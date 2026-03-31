import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, Upload, Trash2, FileText, User, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors = {
  'Pendente': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Em Progresso': 'bg-blue-100 text-blue-800 border-blue-300',
  'Concluído': 'bg-green-100 text-green-800 border-green-300',
  'Atrasado': 'bg-red-100 text-red-800 border-red-300',
  'Bloqueado': 'bg-gray-100 text-gray-800 border-gray-300'
};

const priorityColors = {
  'Baixa': 'text-blue-600',
  'Média': 'text-orange-600',
  'Alta': 'text-red-600'
};

export default function ChecklistItem({
  item,
  onStatusChange,
  onDelete,
  onAddNote,
  onFileUpload,
  isExpanded,
  onToggleExpand
}) {
  const [showFileInput, setShowFileInput] = useState(false);

  const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'Concluído';

  return (
    <Card className={`p-4 mb-3 transition-all ${isOverdue ? 'border-red-500 border-2' : ''}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between cursor-pointer" onClick={onToggleExpand}>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <button
                className="p-1 hover:bg-gray-100 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
              >
                <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              <h3 className="font-bold text-lg">{item.title}</h3>
              <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusColors[item.status]}`}>
                {item.status}
              </span>
              <span className={`text-xs font-bold ${priorityColors[item.priority]}`}>
                {item.priority}
              </span>
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 ml-8">{item.description}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="ml-2"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="ml-8 pt-4 border-t space-y-4">
            {/* Status & Assignment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">Status</label>
                <select
                  value={item.status}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option>Pendente</option>
                  <option>Em Progresso</option>
                  <option>Concluído</option>
                  <option>Atrasado</option>
                  <option>Bloqueado</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">Prioridade</label>
                <select
                  value={item.priority}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option>Baixa</option>
                  <option>Média</option>
                  <option>Alta</option>
                </select>
              </div>
            </div>

            {/* Dates & Responsible */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Data Início
                </label>
                <input
                  type="date"
                  value={item.start_date || ''}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Prazo
                </label>
                <input
                  type="date"
                  value={item.due_date || ''}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${isOverdue ? 'border-red-500 bg-red-50' : ''}`}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2 flex items-center gap-1">
                <User className="w-3 h-3" /> Responsável
              </label>
              <input
                type="text"
                placeholder="Nome ou email"
                value={item.responsible_name || ''}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">Observações</label>
              <textarea
                value={item.notes || ''}
                placeholder="Adicionar notas..."
                className="w-full px-3 py-2 border rounded-lg text-sm h-20"
              />
            </div>

            {/* Files */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">Arquivos ({item.files?.length || 0})</label>
              <div className="space-y-2 mb-3">
                {item.files?.map(file => (
                  <div key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{(file.size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 w-full"
                onClick={() => setShowFileInput(!showFileInput)}
              >
                <Upload className="w-4 h-4" /> Upload Arquivo
              </Button>
              {showFileInput && (
                <div className="mt-2">
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        onFileUpload(e.target.files[0]);
                        setShowFileInput(false);
                      }
                    }}
                    className="w-full text-sm"
                  />
                </div>
              )}
            </div>

            {/* Activity History */}
            {item.activity_history?.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">Histórico</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {item.activity_history.map(activity => (
                    <div key={activity.id} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <p className="font-medium">{activity.user_name}</p>
                      <p>{activity.details}</p>
                      <p className="text-gray-500">
                        {formatDistanceToNow(new Date(activity.timestamp), { locale: ptBR, addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}