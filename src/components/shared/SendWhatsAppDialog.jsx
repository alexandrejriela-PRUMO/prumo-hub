import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageCircle, Loader2 } from 'lucide-react';

/**
 * SendWhatsAppDialog — modal reutilizável para Recibo, Orçamento, Cópia de Contrato e
 * notificação de assinatura digital (Clicksign). Substitui o antigo window.prompt()
 * (que falha dentro do iframe de preview do Base44).
 *
 * Props:
 * - open, onOpenChange: controle de visibilidade
 * - title: título do dialog (default "Enviar por WhatsApp")
 * - defaultPhone: telefone pré-preenchido (vindo do ClientCRM, se encontrado)
 * - defaultMessage: mensagem padrão sugerida, editável pelo usuário
 * - showMessage: exibe o campo de mensagem (default true). Desative quando não houver
 *   mensagem customizável a enviar (ex: notificação de assinatura, que usa o template
 *   próprio da Clicksign).
 * - confirmLabel: texto do botão de confirmação (default "Enviar")
 * - isSending: estado de carregamento (desabilita o formulário)
 * - onConfirm(phone, message): chamado ao clicar em confirmar
 */
export default function SendWhatsAppDialog({
  open, onOpenChange,
  title = 'Enviar por WhatsApp',
  defaultPhone = '', defaultMessage = '',
  showMessage = true,
  confirmLabel = 'Enviar',
  isSending = false, onConfirm
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState(defaultMessage);

  useEffect(() => {
    if (open) {
      setPhone(defaultPhone);
      setMessage(defaultMessage);
    }
  }, [open, defaultPhone, defaultMessage]);

  const handleConfirm = () => {
    if (!phone.trim()) return;
    onConfirm(phone.trim(), message.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="wa-phone">WhatsApp do destinatário (com DDD)</Label>
            <Input
              id="wa-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 55999999999"
              disabled={isSending}
            />
            {!defaultPhone && (
              <p className="text-xs text-amber-600">
                Não encontramos um telefone cadastrado para este cliente. Preencha manualmente.
              </p>
            )}
          </div>

          {showMessage && (
            <div className="space-y-1.5">
              <Label htmlFor="wa-message">Mensagem</Label>
              <Textarea
                id="wa-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                disabled={isSending}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSending || !phone.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            {isSending ? 'Enviando...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
