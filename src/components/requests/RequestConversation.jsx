import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, User, UserCheck, FileText, DollarSign, Paperclip, Download, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function RequestConversation({ request, onUpdate, currentUser }) {
  const [message, setMessage] = useState('');
  const [offerBudget, setOfferBudget] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const conversation = request.conversation || [];

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validar tipo de arquivo (apenas PDFs)
    const invalidFiles = files.filter(f => !f.type.includes('pdf'));
    if (invalidFiles.length > 0) {
      toast.error('Apenas arquivos PDF são permitidos');
      return;
    }

    // Validar tamanho (máximo 10MB por arquivo)
    const largeFiles = files.filter(f => f.size > 10 * 1024 * 1024);
    if (largeFiles.length > 0) {
      toast.error('Arquivos devem ter no máximo 10MB');
      return;
    }

    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedFiles.push({
          name: file.name,
          url: file_url,
          type: 'outro',
          size: file.size
        });
      }
      setAttachments([...attachments, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} arquivo(s) anexado(s)`);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!message.trim() && attachments.length === 0) {
      toast.error('Digite uma mensagem ou anexe um documento');
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
        offer_budget: offerBudget,
        attachments: attachments
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

      // Enviar notificação - cliente envia para admins, admin envia para cliente
      const recipientEmail = isAdmin ? request.client_email : 'contato@santarute.com.br';
      const notificationTitle = isAdmin 
        ? 'Nova Resposta da Equipe Santa Rute'
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
      setAttachments([]);
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
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold">
                        {msg.sender_name || 'Usuário'}
                      </p>
                      <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${
                        msg.sender_type === 'team' 
                          ? 'bg-emerald-600 text-white border-emerald-600' 
                          : 'bg-blue-600 text-white border-blue-600'
                      }`}>
                        {msg.sender_type === 'team' ? 'Equipe Santa Rute' : 'Cliente'}
                      </Badge>
                    </div>
                    {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                    
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((file, fileIdx) => (
                          <a
                            key={fileIdx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-white/50 rounded-lg hover:bg-white/80 transition-colors border border-gray-200"
                          >
                            <FileText className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{file.name}</p>
                              <p className="text-[10px] text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <Download className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                    
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
                    {msg.timestamp ? format(parseISO(msg.timestamp), 'dd/MM/yyyy HH:mm') : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Área de Nova Mensagem */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-3">
            {/* Anexos Pendentes */}
            {attachments.length > 0 && (
              <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-700 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  Arquivos anexados ({attachments.length})
                </p>
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg">
                    <FileText className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isAdmin ? "Digite sua orientação ao cliente..." : "Digite sua mensagem..."}
              rows={3}
              className="resize-none"
            />

            {/* Botão de Anexar */}
            <div>
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                  <Paperclip className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {uploading ? 'Fazendo upload...' : 'Anexar documento PDF (máx. 10MB)'}
                  </span>
                </div>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
            
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
              disabled={sending || uploading || (!message.trim() && attachments.length === 0)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Enviando...' : uploading ? 'Aguardando upload...' : 'Enviar Mensagem'}
            </Button>

            {!isAdmin && (
              <p className="text-xs text-gray-500 text-center mt-2">
                A Equipe Santa Rute responderá em breve
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}