import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelect,
  onNew,
  onDelete,
  loading,
}) {
  return (
    <div className="flex flex-col h-full bg-emerald-950/95 rounded-xl border border-emerald-800/50 overflow-hidden">
      <div className="p-3 border-b border-emerald-800/50">
        <Button
          onClick={onNew}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nova Conversa
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        {loading && conversations.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 px-3">
            <MessageSquare className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
            <p className="text-xs text-emerald-400">
              Nenhuma conversa ainda. Inicie uma nova!
            </p>
          </div>
        ) : (
          <div className="space-y-1 py-2">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const title = conv.metadata?.name || 'Conversa sem título';
              const date = conv.updated_date
                ? new Date(conv.updated_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                : '';
              return (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all",
                    isActive
                      ? "bg-amber-500/20 border border-amber-500/30"
                      : "hover:bg-emerald-800/40 border border-transparent"
                  )}
                  onClick={() => onSelect(conv.id)}
                >
                  <MessageSquare className={cn(
                    "w-4 h-4 flex-shrink-0",
                    isActive ? "text-amber-400" : "text-emerald-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-medium truncate",
                      isActive ? "text-amber-300" : "text-emerald-200"
                    )}>
                      {title}
                    </p>
                    {date && (
                      <p className="text-[10px] text-emerald-500">{date}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 flex-shrink-0"
                    title="Excluir conversa"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}