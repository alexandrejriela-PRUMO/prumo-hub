import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, User, UserCheck, FileText, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function RequestConversation({ request, onUpdate, currentUser }) {
  const [message, setMessage] = useState('');
  const [offerBudget, setOfferBudget] = useState(false);
  const [sending, setSending] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const conversation = request.conversation || [];

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }

    setSending(true);
    try {
      const newMessage = {
        sender: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email,
        sender_type: isAdmin ? 'team' : 'client',
        message: message.trim(),
        timestamp: new Date().toISOString(),
        offer_budget: offerBudget
      };

      const updatedConversation = [...conversation, newMessage];
      
      // Atualizar status se necessário
      let newStatus = request.status;
      if (isAdmin && request.status === 'Aberto') {
        newStatus = 'Em Análise';
      }
      if (isAdmin && message.trim().length > 0) {
        newStatus = 'Respondido';
      }

      await base44.entities.Request.update(request.id, {
        conversation: updatedConversation,
        status: newStatus,
        response: isAdmin ? message.trim() : request.response
      });

      // Enviar notificação
      const recipientEmail = isAdmin ? request.client_email : currentUser.email;
      const notificationTitle = isAdmin 
        ? 'Nova Resposta ao seu Requerimento'
        : 'Nova Mensagem do Cliente no Requerimento';
      
      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: notificationTitle,
        body: `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
              <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #1B4332;">${notificationTitle}</h2>
                <p style="font-size: 14px; color: #666;">Requerimento: <strong>${request.subject}</strong></p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="font-size: 16px; color: #333; line-height: 1.6;">${message.trim()}</p>
                </div>
                ${offerBudget ? '<p style="font-size: 14px; color: #C9A227; font-weight: bold;">💼 Oferecemos orçamento com estratégia para dar andamento nesta situação.</p>' : ''}
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
                <p style="font-size: 14px; color: #666;">
                  Acesse o sistema Santa Rute para continuar a conversa.
                </p>
              </div>
            </body>
          </html>
        `
      });

      setMessage('');
      setOfferBudget(false);
      toast.success('Mensagem enviada!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-emerald-200">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5 text-emerald-600" />
          Conversa com a Equipe Santa Rute
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Histórico de Mensagens */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {conversation.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
              <p className="text-xs mt-1">Inicie a conversa abaixo</p>
            </div>
          ) : (
            conversation.map((msg, index) => (
              <div 
                key={index} 
                className={`flex gap-3 ${msg.sender_type === 'client' ? 'flex-row' : 'flex-row-reverse'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.sender_type === 'team' 
                    ? 'bg-emerald-600' 
                    : 'bg-blue-600'
                }`}>
                  {msg.sender_type === 'team' ? (
                    <UserCheck className="w-4 h-4 text-white" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`flex-1 ${msg.sender_type === 'client' ? 'text-left' : 'text-right'}`}>
                  <div className={`inline-block max-w-[85%] p-3 rounded-lg ${
                    msg.sender_type === 'team'
                      ? 'bg-emerald-100 text-gray-900'
                      : 'bg-blue-100 text-gray-900'
                  }`}>
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {msg.sender_name}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    {msg.offer_budget && (
                      <div className="mt-2 pt-2 border-t border-amber-200">
                        <Badge className="bg-amber-500 text-white">
                          <DollarSign className="w-3 h-3 mr-1" />
                          Orçamento Disponível
                        </Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(parseISO(msg.timestamp), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Área de Nova Mensagem */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isAdmin ? "Digite sua orientação ao cliente..." : "Digite sua mensagem..."}
              rows={3}
              className="resize-none"
            />
            
            {isAdmin && (
              <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Checkbox
                  id="offer-budget"
                  checked={offerBudget}
                  onCheckedChange={setOfferBudget}
                />
                <Label 
                  htmlFor="offer-budget" 
                  className="text-sm font-medium cursor-pointer flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-amber-600" />
                  Oferecer orçamento com estratégia para dar andamento nesta diligência
                </Label>
              </div>
            )}

            <Button
              onClick={handleSendMessage}
              disabled={sending || !message.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Enviando...' : 'Enviar Mensagem'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}