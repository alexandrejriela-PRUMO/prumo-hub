import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, MessageCircle, Mail, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import SendWhatsAppDialog from '@/components/shared/SendWhatsAppDialog';

/**
 * DocumentSendButton — botão reutilizável para enviar qualquer documento já
 * hospedado (Documentos, Licenças, CAR, Processos, PRAD, Georreferenciamento)
 * por WhatsApp ou Email, via a function genérica sendGenericDocument.
 *
 * Props:
 * - fileUrl (obrigatório): URL do documento já hospedado
 * - fileName: nome do arquivo, usado como nome do anexo
 * - defaultPhone / defaultEmail: pré-preenchimento (ex: telefone/email do cliente
 *   dono da propriedade, se disponível no contexto de quem renderiza o botão)
 * - defaultMessage: mensagem sugerida (editável)
 * - docType: tipo do documento para o WhatsAppSendLog — 'document' (default),
 *   'license', 'car', 'process', 'prad' ou 'georeferencing'
 * - docId: id do registro relacionado (licença, CAR, processo, PRAD, georreferenciamento),
 *   se disponível no contexto de quem renderiza o botão
 * - size / variant: repassados ao Button, para se adequar ao layout de cada tela
 */
export default function DocumentSendButton({
  fileUrl, fileName, defaultPhone = '', defaultEmail = '', defaultMessage = '',
  docType = 'document', docId,
  size = 'sm', variant = 'outline',
}) {
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [emailMessage, setEmailMessage] = useState(defaultMessage);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (showEmail) {
      setEmail(defaultEmail);
      setEmailMessage(defaultMessage || `Segue o documento: ${fileName || ''}`);
    }
  }, [showEmail, defaultEmail, defaultMessage, fileName]);

  const handleSendWhatsApp = async (phone, message) => {
    setIsSendingWhatsApp(true);
    try {
      await base44.functions.invoke('sendGenericDocument', {
        channel: 'whatsapp', phone, file_url: fileUrl, file_name: fileName, message,
        doc_type: docType, doc_id: docId,
      });
      toast.success('Documento enviado por WhatsApp!');
      setShowWhatsApp(false);
    } catch (err) {
      toast.error('Erro ao enviar por WhatsApp: ' + (err.message || 'erro desconhecido'));
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email.trim()) return;
    setIsSendingEmail(true);
    try {
      await base44.functions.invoke('sendGenericDocument', {
        channel: 'email', email: email.trim(), file_url: fileUrl, file_name: fileName,
        message: emailMessage, doc_type: docType, doc_id: docId,
      });
      toast.success('Documento enviado por email!');
      setShowEmail(false);
    } catch (err) {
      toast.error('Erro ao enviar por email: ' + (err.message || 'erro desconhecido'));
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size={size} variant={variant} className="gap-1.5" title="Enviar documento">
            <Send className="w-3.5 h-3.5" /> Enviar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowWhatsApp(true)}>
            <MessageCircle className="w-4 h-4 mr-2 text-emerald-600" /> WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowEmail(true)}>
            <Mail className="w-4 h-4 mr-2 text-blue-600" /> Email
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SendWhatsAppDialog
        open={showWhatsApp}
        onOpenChange={setShowWhatsApp}
        defaultPhone={defaultPhone}
        defaultMessage={defaultMessage || `Segue o documento: ${fileName || ''}`}
        isSending={isSendingWhatsApp}
        onConfirm={handleSendWhatsApp}
      />

      <Dialog open={showEmail} onOpenChange={setShowEmail}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" /> Enviar por Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-email">Email do destinatário</Label>
              <Input
                id="doc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                disabled={isSendingEmail}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-email-message">Mensagem</Label>
              <Textarea
                id="doc-email-message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={4}
                disabled={isSendingEmail}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmail(false)} disabled={isSendingEmail}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !email.trim()}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {isSendingEmail ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
