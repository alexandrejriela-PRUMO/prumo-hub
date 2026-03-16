import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader, Send, Download, FileText } from 'lucide-react';

export default function RuteAIChat({ user, property, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [auditGenerated, setAuditGenerated] = useState(false);
  const scrollRef = useRef(null);

  const chatMutation = useMutation({
    mutationFn: async (userMessage) => {
      const response = await base44.functions.invoke('ruteAIChat', {
        property_id: property?.id,
        owner_email: user?.email,
        message: userMessage,
        conversation_history: messages
      });
      return response.data;
    }
  });

  const auditMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateEnvironmentalAudit', {
        property_id: property?.id,
        owner_email: user?.email,
        conversation_history: messages
      });
      return response.data;
    },
    onSuccess: () => {
      setAuditGenerated(true);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '✅ Auditoria ambiental e jurídica completa gerada! Você pode fazer download do relatório em PDF ou Excel com todas as informações avançadas.'
      }]);
    }
  });

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');

    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage
    }]);

    const response = await chatMutation.mutateAsync(userMessage);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: response.message,
      suggestions: response.suggestions
    }]);
  };

  const handleGenerateAudit = async () => {
    setMessages(prev => [...prev, {
      role: 'user',
      content: 'Gerar auditoria completa'
    }, {
      role: 'assistant',
      content: 'Gerando auditoria ambiental e jurídica completa...',
      loading: true
    }]);
    await auditMutation.mutateAsync();
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `🌿 Olá! Sou a IA Rute, sua consultora ambiental especializada.\n\nEstou aqui para ajudar você com:\n\n📋 CAR - Cadastro Ambiental Rural\n🌳 Reserva Legal - Análise e conformidade\n💧 APPs - Áreas de Preservação Permanente\n⚠️ Passivos ambientais - Identificação e regularização\n✅ Ativos ambientais - Oportunidades de CRA e PSA\n📊 Alertas geoespaciais - Monitoramento em tempo real\n📜 Conformidade jurídica - Análise legal completa\n\nEu posso gerar uma auditoria ambiental e jurídica completa com recomendações detalhadas. O que você gostaria de saber sobre ${property?.property_name}?`
      }]);
    }
  }, [isOpen, property]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="2"/>
              <path d="M50 20C35 20 25 30 25 50C25 70 50 85 50 85C50 85 75 70 75 50C75 30 65 20 50 20Z" fill="#10b981"/>
              <circle cx="50" cy="50" r="8" fill="white"/>
            </svg>
            <div>
              <div>IA Rute - Consultora Ambiental</div>
              <div className="text-xs text-gray-500 font-normal">{property?.property_name}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-4 mb-4">
          <div className="space-y-4 py-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-lg p-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}
                >
                  {msg.loading ? (
                    <div className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      {msg.content}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {msg.suggestions && (
                    <div className="mt-3 space-y-1.5">
                      {msg.suggestions.map((sugg, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInput(sugg);
                          }}
                          className="block w-full text-left text-xs bg-white border border-gray-200 rounded px-2 py-1.5 hover:bg-gray-50 transition-colors"
                        >
                          → {sugg}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Audit Button */}
        {messages.length > 2 && !auditGenerated && (
          <div className="mb-4">
            <Button
              onClick={handleGenerateAudit}
              disabled={auditMutation.isPending}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            >
              {auditMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Gerando auditoria...
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

        {/* Download Options */}
        {auditGenerated && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600">Auditoria Gerada</Badge>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled
              >
                <Download className="w-3 h-3 mr-1" />
                PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled
              >
                <Download className="w-3 h-3 mr-1" />
                Excel
              </Button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Digite sua pergunta..."
            disabled={chatMutation.isPending}
            className="text-sm"
          />
          <Button
            onClick={handleSendMessage}
            disabled={chatMutation.isPending || !input.trim()}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {chatMutation.isPending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}