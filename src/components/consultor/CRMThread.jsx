import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, AtSign, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function CRMThread({ item, itemType, teamMembers = [], currentUser, onSaveThread }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const thread = item?.thread || [];

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, thread.length]);

  const handleInput = (e) => {
    const val = e.target.value;
    setMessage(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === val.length - 1 || (lastAt !== -1 && !val.slice(lastAt + 1).includes(' '))) {
      setShowMentions(true);
      setMentionQuery(val.slice(lastAt + 1));
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member) => {
    const lastAt = message.lastIndexOf('@');
    const newMsg = message.slice(0, lastAt) + `@${member.member_name || member.member_email} `;
    setMessage(newMsg);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const getMentions = () => {
    const regex = /@([\w\s]+)/g;
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
    if (!message.trim()) return;
    const mentions = getMentions();
    const newMsg = {
      id: Date.now().toString(),
      author_email: currentUser?.email || '',
      author_name: currentUser?.full_name || currentUser?.email || 'Usuário',
      message: message.trim(),
      timestamp: new Date().toISOString(),
      mentions,
    };
    const updatedThread = [...thread, newMsg];
    await onSaveThread(updatedThread);
    setMessage('');
    setShowMentions(false);
    // Notifica mencionados
    if (mentions.length > 0) {
      mentions.forEach(email => {
        base44.functions.invoke('notifyCRMAssignment', {
          responsible_email: email,
          assigner_name: currentUser?.full_name || currentUser?.email,
          type: 'mention',
          title: `Menção em ${itemType === 'interaction' ? 'interação' : 'tarefa'}: ${item?.title}`,
          client_name: '',
        }).catch(() => {});
      });
    }
  };

  const filteredMembers = teamMembers.filter(m =>
    (m.member_name || m.member_email).toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const getInitials = (name) => name ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : '?';

  const avatarColors = [
    'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'
  ];
  const getColor = (email) => avatarColors[(email?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-600 transition-colors"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>{thread.length > 0 ? `${thread.length} comentário${thread.length > 1 ? 's' : ''}` : 'Comentar'}</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {/* Thread messages */}
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {thread.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">Nenhum comentário ainda. Inicie a conversa!</p>
            )}
            {thread.map(msg => {
              const isMe = msg.author_email === currentUser?.email;
              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${getColor(msg.author_email)}`}>
                    {getInitials(msg.author_name)}
                  </div>
                  <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
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

          {/* Input */}
          <div className="relative flex gap-2 items-end">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={message}
                onChange={handleInput}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                placeholder={`Comentar... (use @ para mencionar)`}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white"
              />
              {teamMembers.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setMessage(m => m + '@'); setShowMentions(true); inputRef.current?.focus(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-emerald-500 transition-colors"
                  title="Mencionar alguém"
                >
                  <AtSign className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Mentions dropdown */}
              {showMentions && filteredMembers.length > 0 && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                  {filteredMembers.map(m => (
                    <button
                      key={m.member_email}
                      onMouseDown={() => insertMention(m)}
                      className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-xs flex items-center gap-2"
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${getColor(m.member_email)}`}>
                        {getInitials(m.member_name || m.member_email)}
                      </div>
                      <span className="font-medium">{m.member_name || m.member_email}</span>
                      <span className="text-gray-400">{m.member_role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              size="sm"
              onClick={sendMessage}
              disabled={!message.trim()}
              className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function renderMessage(text) {
  const parts = text.split(/(@[\w\s]+)/g);
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="font-semibold text-amber-300">{part}</span>
      : <span key={i}>{part}</span>
  );
}