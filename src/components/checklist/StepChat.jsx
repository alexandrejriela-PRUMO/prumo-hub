import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function StepChat({ item, currentUser, onAddMessage, onClose }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const messages = item.activity_history?.filter(a => a.action === 'note_added') || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    onAddMessage({
      id: Date.now().toString(),
      action: 'note_added',
      timestamp: new Date().toISOString(),
      user_email: currentUser?.email || '',
      user_name: currentUser?.full_name || currentUser?.email || 'Você',
      details: text.trim()
    });
    setText('');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-700 text-white">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          <span className="font-semibold text-sm truncate">Chat — {item.title}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Nenhuma mensagem ainda.<br />Inicie o diálogo sobre esta etapa.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_email === currentUser?.email;
            return (
              <div key={msg.id} className={cn('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  isMe ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-700'
                )}>
                  {(msg.user_name || msg.user_email || '?').charAt(0).toUpperCase()}
                </div>
                <div className={cn('max-w-[75%]', isMe ? 'items-end' : 'items-start', 'flex flex-col gap-0.5')}>
                  <span className="text-xs text-gray-400 px-1">{isMe ? 'Você' : msg.user_name}</span>
                  <div className={cn(
                    'px-3 py-2 rounded-2xl text-sm leading-relaxed',
                    isMe
                      ? 'bg-emerald-600 text-white rounded-tr-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'
                  )}>
                    {msg.details}
                  </div>
                  <span className="text-xs text-gray-400 px-1">
                    {formatDistanceToNow(new Date(msg.timestamp), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t bg-white flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Digite uma mensagem... (Enter para enviar)"
          className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300 max-h-24 min-h-[38px]"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-9 h-9 flex items-center justify-center bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}