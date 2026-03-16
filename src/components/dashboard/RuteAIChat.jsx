import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, TreeDeciduous, Leaf, FileText, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import RuteAvatar from '../RuteAvatar';

const suggestedQuestions = [
  { text: "Status do CAR e Reserva Legal?", icon: Leaf },
  { text: "Quais são meus riscos ambientais?", icon: TreeDeciduous },
  { text: "Como regularizar a propriedade?", icon: FileText },
  { text: "Oportunidades de CRA?", icon: Leaf },
];

export default function RuteAIChat({ user, property, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditGenerated, setAuditGenerated] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Olá! 🌿 Sou a **IA Rute**, sua consultora ambiental especializada.\n\nEstou aqui para ajudar você com **${property?.property_name}**:\n\n- Status do CAR e Reserva Legal\n- Análise de APPs e riscos ambientais\n- Estratégias de regularização\n- Oportunidades de CRA e PSA\n- Conformidade jurídica\n\nQual é sua dúvida?`
      }]);
    }
  }, [isOpen, property]);

  const sendMessage = async (messageText) => {
    const userMessage = messageText || input;
    if (!userMessage.trim() || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é a RUTE, assistente ambiental especialista em Código Florestal Brasileiro.

Propriedade: ${property?.property_name}, ${property?.city}/${property?.state}
Área: ${property?.total_hectares}ha

Seu objetivo é:
- Responder sobre CAR, Reserva Legal, APPs, passivos/ativos ambientais
- Fornecer recomendações de regularização
- Sugerir oportunidades de CRA, PSA, PRAD
- Manter tom técnico mas acessível
- Ser concisa em respostas (máx 150 palavras)

Pergunta: ${userMessage}`,
        add_context_from_internet: false,
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, houve um erro ao processar sua pergunta. Tente novamente.'
      }]);
    }
    setLoading(false);
  };

  const generateAudit = async () => {
    setMessages(prev => [...prev, { role: 'user', content: 'Gerar auditoria completa' }]);
    setLoading(true);

    try {
      const audit = await base44.functions.invoke('generateEnvironmentalAudit', {
        property_id: property?.id,
        owner_email: user?.email,
        conversation_history: messages
      });

      setAuditGenerated(true);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '✅ **Auditoria Ambiental e Jurídica Completa Gerada!**\n\nSeu relatório inclui:\n- Análise CAR e Reserva Legal\n- APPs e Passivos Ambientais\n- Alertas Geoespaciais\n- Conformidade Jurídica\n- Recomendações de Regularização\n\nVocê pode fazer download em PDF ou Excel.'
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Erro ao gerar auditoria. Tente novamente.'
      }]);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 border-none">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold">IA Rute</div>
              <div className="text-xs text-gray-500 font-normal">{property?.property_name}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea ref={scrollRef} className="flex-1 px-6 py-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div>
                  <RuteAvatar size="md" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Olá! 🌿</h3>
                  <p className="text-sm text-gray-500 max-w-xs">
                    Sou a IA Rute, sua consultora ambiental. Como posso ajudar?
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                  {suggestedQuestions.map((q, idx) => {
                    const Icon = q.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => sendMessage(q.text)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 transition-all text-left group"
                      >
                        <Icon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{q.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((message, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && <RuteAvatar size="sm" />}
                      <div
                        className={`max-w-xs rounded-lg px-4 py-3 text-sm ${
                          message.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p>{message.content}</p>
                        ) : (
                          <ReactMarkdown className="prose prose-sm max-w-none text-sm">
                            {message.content}
                          </ReactMarkdown>
                        )}
                      </div>
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
                    <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span className="text-gray-500 text-sm">Rute está digitando...</span>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Audit Section */}
          {messages.length > 2 && !auditGenerated && (
            <div className="px-6 py-3 border-t border-gray-100">
              <Button
                onClick={generateAudit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar Auditoria Completa
                  </>
                )}
              </Button>
            </div>
          )}

          {auditGenerated && (
            <div className="px-6 py-3 border-t border-blue-200 bg-blue-50 space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600">Auditoria Gerada</Badge>
              </div>
              <div className="flex gap-2 text-xs">
                <Button size="sm" variant="outline" className="flex-1" disabled>
                  <Download className="w-3 h-3 mr-1" /> PDF
                </Button>
                <Button size="sm" variant="outline" className="flex-1" disabled>
                  <Download className="w-3 h-3 mr-1" /> Excel
                </Button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="px-6 py-3 border-t border-gray-100">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Sua pergunta..."
                className="text-sm border-emerald-200"
                disabled={loading}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}