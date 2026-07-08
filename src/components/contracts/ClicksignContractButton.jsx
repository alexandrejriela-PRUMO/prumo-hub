import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PenLine, CheckCircle, Clock, AlertCircle, Settings, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_CFG = {
  'Aguardando Assinaturas': { color: 'bg-amber-100 text-amber-700 border-amber-300', icon: Clock },
  'Assinado':               { color: 'bg-green-100 text-green-700 border-green-300',  icon: CheckCircle },
  'Recusado':               { color: 'bg-red-100 text-red-700 border-red-300',        icon: AlertCircle },
  'Cancelado':              { color: 'bg-gray-100 text-gray-600 border-gray-300',     icon: AlertCircle },
  'Expirado':               { color: 'bg-gray-100 text-gray-500 border-gray-300',     icon: AlertCircle },
  'Erro':                   { color: 'bg-red-100 text-red-700 border-red-300',        icon: AlertCircle },
};

export default function ClicksignContractButton({ contract, user }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const queryClient = useQueryClient();

  const { data: signatures = [], refetch } = useQuery({
    queryKey: ['signatures', contract.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('listConsultorContracts', {});
      const all = res.data?.signatures || [];
      return all
        .filter(s => s.client_contract_id === contract.id)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 10);
    },
    enabled: !!contract.id && open,
  });

  const latest = signatures[0];
  const cfg = latest ? (STATUS_CFG[latest.status] || STATUS_CFG['Aguardando Assinaturas']) : null;
  const StatusIcon = cfg?.icon || Clock;

  const pdfs = (contract.documents || []).filter(d => d.url && d.name?.toLowerCase().includes('.pdf'));
  const hasApiKey = !!user?.clicksign_api_key;

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) return;
    setSavingKey(true);
    await base44.functions.invoke('clicksignConsultor', { action: 'save_api_key', api_key: apiKeyInput.trim() });
    setSavingKey(false);
    toast.success('API Key salva com sucesso!');
    queryClient.invalidateQueries(['user']);
    // Force reload user
    window.location.reload();
  };

  const handleSend = async () => {
    if (!pdfs.length) {
      toast.error('Nenhum PDF encontrado nos documentos do contrato.');
      return;
    }
    setSending(true);
    const signers = [
      { name: user.full_name || user.email, email: user.email, sign_as: 'sign' },
    ];
    if (contract.client_email) {
      signers.push({ name: contract.client_name || contract.client_email, email: contract.client_email, sign_as: 'sign' });
    }

    const res = await base44.functions.invoke('clicksignConsultor', {
      action: 'send_contract',
      contract_id: contract.id,
      document_url: pdfs[selectedDocIndex].url,
      document_filename: pdfs[selectedDocIndex].name,
      signers,
    });

    setSending(false);
    if (res.data?.success) {
      toast.success('Contrato enviado! Os signatários receberão um e-mail da Clicksign.');
      refetch();
    } else {
      toast.error(res.data?.error || 'Erro ao enviar para assinatura.');
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={latest ? `${cfg?.color} border text-xs` : 'border-violet-300 text-violet-700 hover:bg-violet-50 text-xs'}
        onClick={() => setOpen(true)}
      >
        {latest ? (
          <><StatusIcon className="w-3.5 h-3.5 mr-1" />{latest.status}</>
        ) : (
          <><PenLine className="w-3.5 h-3.5 mr-1" />Assinatura Digital</>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-violet-800">
              <PenLine className="w-5 h-5 text-violet-600" />
              Assinatura Digital — Clicksign
            </DialogTitle>
          </DialogHeader>

          {/* Configure API Key */}
          {!hasApiKey && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Configure sua <strong>API Key pessoal da Clicksign</strong> para enviar contratos para assinatura digital. Sua chave é independente da conta da plataforma.
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sua API Key da Clicksign</Label>
                <Input
                  type="password"
                  placeholder="Cole aqui sua access_token da Clicksign"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-xs text-gray-500">Encontre em: app.clicksign.com → Configurações → API</p>
              </div>
              <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={handleSaveKey} disabled={savingKey || !apiKeyInput}>
                <Settings className="w-4 h-4 mr-2" />
                {savingKey ? 'Salvando...' : 'Salvar API Key'}
              </Button>
            </div>
          )}

          {/* Latest signature status */}
          {hasApiKey && latest && (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 p-3 rounded-lg border ${cfg?.color}`}>
                <StatusIcon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{latest.status}</p>
                  <p className="text-xs opacity-75">Enviado em {format(new Date(latest.created_date), 'dd/MM/yyyy')}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                {(latest.signers || []).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.email}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs ${s.status === 'Assinado' ? 'border-green-400 text-green-700' : 'border-amber-400 text-amber-700'}`}>
                      {s.status}
                    </Badge>
                  </div>
                ))}
              </div>

              {latest.status !== 'Assinado' && latest.status !== 'Cancelado' && (
                <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={handleSend} disabled={sending}>
                  <PenLine className="w-4 h-4 mr-2" />
                  {sending ? 'Reenviando...' : 'Reenviar Notificação'}
                </Button>
              )}
            </div>
          )}

          {/* Send for first time */}
          {hasApiKey && !latest && (
            <div className="space-y-4">
              {pdfs.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  ⚠️ Nenhum PDF encontrado. Faça upload de um arquivo <strong>.pdf</strong> na aba <strong>Documentos</strong> do contrato.
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Selecione o PDF para assinar:</p>
                  {pdfs.map((doc, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedDocIndex(i)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedDocIndex === i ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${selectedDocIndex === i ? 'border-violet-500 bg-violet-500' : 'border-gray-300'}`} />
                      <span className="text-sm font-medium truncate">{doc.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700">Signatários:</p>
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                  <p className="font-medium">{user?.full_name || user?.email}</p>
                  <p className="text-xs text-gray-500">{user?.email} · Consultor</p>
                </div>
                {contract.client_email && (
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                    <p className="font-medium">{contract.client_name || contract.client_email}</p>
                    <p className="text-xs text-gray-500">{contract.client_email} · Contratante</p>
                  </div>
                )}
              </div>

              <Button
                className="w-full bg-violet-600 hover:bg-violet-700"
                onClick={handleSend}
                disabled={sending || pdfs.length === 0}
              >
                <PenLine className="w-4 h-4 mr-2" />
                {sending ? 'Enviando...' : 'Enviar para Assinatura Digital'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}