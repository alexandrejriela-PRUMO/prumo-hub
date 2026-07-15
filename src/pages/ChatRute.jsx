import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send,
  User,
  Loader2,
  Sparkles,
  TreeDeciduous,
  PanelLeft,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import RuteAvatar from '../components/RuteAvatar';
import ConversationSidebar from '../components/rute/ConversationSidebar';
import { Building2, TreePine, Wallet, BarChart3, ClipboardList } from 'lucide-react';

const suggestedQuestions = [
  { text: "Como cadastro uma nova propriedade?", icon: Building2 },
  { text: "Como funciona a Gestão do CAR?", icon: TreePine },
  { text: "Como emito uma cobrança para meu cliente?", icon: Wallet },
  { text: "O que é o Termômetro de Regularidade?", icon: BarChart3 },
  { text: "Como uso o CRM Prumo?", icon: ClipboardList },
  { text: "O que é APP e qual sua importância?", icon: TreeDeciduous },
];

const AGENT_NAME = 'rute_assistant';

export default function ChatRute() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Load conversation list on mount
  const loadConversations = useCallback(async () => {
    setListLoading(true);
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      // Ordenar por última atualização (mais recente primeiro)
      const sorted = (list || []).filter(c => !c.metadata?.deleted).sort((a, b) => {
        const da = new Date(a.updated_date || a.created_date || 0).getTime();
        const db = new Date(b.updated_date || b.created_date || 0).getTime();
        return db - da;
      });
      setConversations(sorted);
    } catch (err) {
      console.error('[ChatRute] Erro ao carregar conversas:', err);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto-scroll on messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Subscribe to active conversation updates
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    const unsubscribe = base44.agents.subscribeToConversation(activeConversationId, (data) => {
      setMessages(data.messages || []);
      // Stop loading when we get assistant response
      const lastMsg = data.messages?.[data.messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content) {
        setLoading(false);
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeConversationId]);

  const handleNewConversation = useCallback(async (firstMessage) => {
    setLoading(true);
    try {
      const title = firstMessage.length > 45 ? firstMessage.substring(0, 45) + '...' : firstMessage;
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: title, description: title },
      });
      await base44.agents.addMessage(conv, { role: 'user', content: firstMessage });
      setActiveConversationId(conv.id);
      setSidebarOpen(false);
      // Refresh conversation list
      loadConversations();
    } catch (err) {
      console.error('[ChatRute] Erro ao criar conversa:', err);
      setLoading(false);
    }
  }, [loadConversations]);

  const handleSelectConversation = useCallback(async (convId) => {
    setSidebarOpen(false);
    if (convId === activeConversationId) return;
    setActiveConversationId(convId);
    setLoading(true);
    try {
      const conv = await base44.agents.getConversation(convId);
      setMessages(conv.messages || []);
      // Check if last message is from user (agent still responding)
      const lastMsg = conv.messages?.[conv.messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content) {
        setLoading(false);
      }
    } catch (err) {
      console.error('[ChatRute] Erro ao carregar conversa:', err);
      setLoading(false);
    }
  }, [activeConversationId]);

  const handleDeleteConversation = useCallback(async (convId) => {
    // SDK não expõe delete direto; removemos do estado local
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (convId === activeConversationId) {
      setActiveConversationId(null);
      setMessages([]);
    }
  }, [activeConversationId]);

  const sendMessage = useCallback(async (messageText) => {
    const userMessage = messageText || input;
    if (!userMessage.trim() || loading) return;

    setInput('');

    // If no active conversation, create one with the first message
    if (!activeConversationId) {
      handleNewConversation(userMessage);
      return;
    }

    setLoading(true);
    try {
      const conv = { id: activeConversationId };
      await base44.agents.addMessage(conv, { role: 'user', content: userMessage });
      loadConversations(); // refresh list ordering
    } catch (err) {
      console.error('[ChatRute] Erro ao enviar mensagem:', err);
      setLoading(false);
    }
  }, [input, loading, activeConversationId, handleNewConversation, loadConversations]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmptyConversation = messages.length === 0 && !activeConversationId;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex gap-4">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelect={handleSelectConversation}
          onNew={() => {
            setActiveConversationId(null);
            setMessages([]);
            setSidebarOpen(false);
          }}
          onDelete={handleDeleteConversation}
          loading={listLoading}
        />
      </div>

      {/* Sidebar - Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 h-full w-72 z-50 p-2"
            >
              <div className="relative h-full">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="absolute -top-1 -right-1 z-10 p-1.5 rounded-lg bg-emerald-900 text-white shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
                <ConversationSidebar
                  conversations={conversations}
                  activeConversationId={activeConversationId}
                  onSelect={handleSelectConversation}
                  onNew={() => {
                    setActiveConversationId(null);
                    setMessages([]);
                    setSidebarOpen(false);
                  }}
                  onDelete={handleDeleteConversation}
                  loading={listLoading}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-emerald-50 transition-colors"
          >
            <PanelLeft className="w-5 h-5 text-emerald-700" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">RUTE - Assistente Virtual</h1>
            <p className="text-sm text-gray-500">Especialista ambiental e no uso do PRUMO HUB</p>
          </div>
        </div>

        {/* Chat Card */}
        <Card className="flex-1 border-emerald-100 overflow-hidden flex flex-col">
          <ScrollArea ref={scrollRef} className="flex-1 p-6">
            {isEmptyConversation ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="mb-6">
                  <RuteAvatar size="md" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Olá! Sou a RUTE 👋</h3>
                <p className="text-gray-500 max-w-md mb-8">
                  Posso tirar suas dúvidas sobre questões ambientais e rurais, e também ajudar você a usar os módulos do PRUMO HUB. Como posso ajudar?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(q.text)}
                      className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 transition-all text-left group"
                    >
                      <q.icon className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-gray-700">{q.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence>
                  {messages.map((message, idx) => (
                    <motion.div
                      key={message.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <RuteAvatar size="sm" />
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p>{message.content}</p>
                        ) : (
                          <ReactMarkdown className="prose prose-sm max-w-none prose-emerald">
                            {message.content}
                          </ReactMarkdown>
                        )}
                      </div>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <RuteAvatar size="sm" />
                    <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span className="text-gray-500 text-sm">RUTE está digitando...</span>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua pergunta..."
                className="flex-1 border-emerald-200 focus:border-emerald-400"
                disabled={loading}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 px-6"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}