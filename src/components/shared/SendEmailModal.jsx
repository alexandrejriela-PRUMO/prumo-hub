import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, X, Loader2, Send, Paperclip } from 'lucide-react';

/**
 * Modal genérico para envio de e-mail com PDF anexo (via link).
 * Props:
 *   isOpen: bool
 *   onClose: () => void
 *   onSend: ({ to, subject, message }) => Promise<void>
 *   defaultTo: string
 *   defaultSubject: string
 *   defaultMessage: string
 *   documentLabel: string (ex: "Orçamento Nº ORC-001" ou "Contrato de Serviços")
 *   isSending: bool
 */
export default function SendEmailModal({
  isOpen,
  onClose,
  onSend,
  defaultTo = '',
  defaultSubject = '',
  defaultMessage = '',
  documentLabel = 'Documento',
  isSending = false,
}) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);

  // Atualiza campos se props mudarem (ex: ao abrir o modal com dados diferentes)
  React.useEffect(() => {
    setTo(defaultTo);
    setSubject(defaultSubject);
    setMessage(defaultMessage);
  }, [defaultTo, defaultSubject, defaultMessage, isOpen]);

  const handleSend = () => {
    if (!to.trim()) { alert('Informe o e-mail do destinatário.'); return; }
    if (!subject.trim()) { alert('Informe o assunto do e-mail.'); return; }
    onSend({ to, subject, message });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Enviar por E-mail</h2>
              <p className="text-xs text-gray-500">{documentLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Anexo visual */}
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <Paperclip className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800">PDF será gerado e enviado como link no e-mail</p>
              <p className="text-xs text-emerald-600">{documentLabel}</p>
            </div>
          </div>

          {/* Para */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Para (e-mail do destinatário) *
            </label>
            <Input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="cliente@email.com"
              className="text-sm"
            />
          </div>

          {/* Assunto */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Assunto *
            </label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Ex: Orçamento de Serviços Ambientais"
              className="text-sm"
            />
          </div>

          {/* Mensagem */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Mensagem
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              placeholder="Escreva uma mensagem personalizada para o cliente..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2 min-w-[140px]"
          >
            {isSending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            ) : (
              <><Send className="w-4 h-4" /> Enviar E-mail</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}