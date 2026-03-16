import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Loader, Download, FileText, Leaf } from 'lucide-react';

const RuteIcon = () => (
  <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="#10b981" opacity="0.1" stroke="#10b981" strokeWidth="2"/>
    <path d="M50 20C35 20 25 30 25 50C25 70 50 85 50 85C50 85 75 70 75 50C75 30 65 20 50 20Z" fill="#10b981"/>
    <circle cx="50" cy="50" r="8" fill="white"/>
  </svg>
);

export default function RuteAIChatPanel({ user, property, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [auditReport, setAuditReport] = useState(null);
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

  const generateAuditMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateEnvironmentalAudit', {
        property_id: property?.id,
        owner_email: user?.email,
        conversation_history: messages
      });
      return response.data;
    },
    onSuccess: (data) => {
      setAuditReport(data);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '✅ Auditoria ambiental e jurídica completa gerada! Você pode fazer download do relatório detalhado em PDF ou Excel.',
        type: 'audit_generated'
      }]);
    }
  });

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');

    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage
    }]);

    // Get AI response
    const response = await chatMutation.mutateAsync(userMessage);
    
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: response.message,
      suggestions: response.suggestions
    }]);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initial message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Olá! 🌿 Sou a IA Rute, sua consultora ambiental. Estou aqui para analisar ${property?.property_name} conforme o Código Florestal Brasileiro.\n\nPosso ajudá-lo com:\n• Status do CAR e Reserva Legal\n• Análise de APPs e passivos ambientais\n• Conformidade ambiental\n• Estratégias de regularização\n• Oportunidades de CRA\n\nO que você gostaria de saber sobre sua propriedade?`
      }]);
    }
  }, [isOpen, property]);

  return (
    <div className={`fixed right-0 top-0 h-screen w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RuteIcon />
          <div>
            <h3 className="font-bold">IA Rute</h3>
            <p className="text-xs text-emerald-100">Consultora Ambiental</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-emerald-500/50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-900 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Próximos passos:</p>
                  {msg.suggestions.map((sugg, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(sugg)}
                      className="block w-full text-left text-xs bg-white border border-gray-300 rounded p-2 hover:bg-gray-50 transition-colors"
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
      </ScrollArea>

      {/* Audit Section */}
      {auditReport && (
        <div className="p-4 bg-blue-50 border-t border-blue-200 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-900">Auditoria Gerada</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              disabled={generateAuditMutation.isPending}
            >
              <Download className="w-3 h-3 mr-1" />
              PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              disabled={generateAuditMutation.isPending}
            >
              <Download className="w-3 h-3 mr-1" />
              Excel
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t space-y-3">
        {!auditReport && (
          <Button
            onClick={() => generateAuditMutation.mutate()}
            disabled={generateAuditMutation.isPending || messages.length < 2}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm"
          >
            {generateAuditMutation.isPending ? (
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
        )}

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Faça uma pergunta..."
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
      </div>
    </div>
  );
}