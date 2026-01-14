import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Leaf, 
  User,
  Loader2,
  Sparkles,
  TreeDeciduous,
  Droplets,
  FileText
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import RuteAvatar from '../components/RuteAvatar';

const suggestedQuestions = [
  { text: "O que é APP e qual sua importância?", icon: TreeDeciduous },
  { text: "Como funciona a Reserva Legal?", icon: Leaf },
  { text: "Quais os tipos de licença ambiental?", icon: FileText },
  { text: "O que é outorga de água?", icon: Droplets },
];

export default function ChatRute() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageText) => {
    const userMessage = messageText || input;
    if (!userMessage.trim() || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é a RUTE, assistente virtual especialista em engenharia rural e ambiental da empresa Santa Rute Engenharia Rural. 
      
Sua função é auxiliar clientes com dúvidas sobre:
- Licenciamento ambiental (LP, LI, LO, LAU)
- Cadastro Ambiental Rural (CAR)
- Reserva Legal e APP (Área de Preservação Permanente)
- Georreferenciamento de imóveis rurais
- Outorga de recursos hídricos
- Regularização fundiária
- Legislação ambiental
- Boas práticas agrícolas e ambientais

Seja sempre educada, prestativa e técnica, mas use linguagem acessível. Se não souber algo específico, indique que o cliente deve entrar em contato com a equipe técnica.

Pergunta do cliente: ${userMessage}`,
      add_context_from_internet: true,
    });

    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">RUTE - Assistente Virtual</h1>
            <p className="text-gray-500">Especialista em Engenharia Rural e Ambiental</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 border-emerald-100 overflow-hidden flex flex-col">
        <ScrollArea ref={scrollRef} className="flex-1 p-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="mb-6">
                <RuteAvatar size="md" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Olá! Sou a RUTE 👋</h3>
              <p className="text-gray-500 max-w-md mb-8">
                Sua assistente virtual especializada em questões ambientais e rurais. 
                Como posso ajudar você hoje?
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
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0">
                        <Leaf className="w-4 h-4 text-white" />
                      </div>
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                    <Leaf className="w-4 h-4 text-white" />
                  </div>
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
  );
}