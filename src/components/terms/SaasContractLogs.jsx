import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Search, User, Calendar, Monitor } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Logs de contrato SaaS usam terms_version >= 1001 (namespace separado)
const CONTRACT_VERSION_OFFSET = 1000;

export default function SaasContractLogs() {
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['saasContractLogs'],
    queryFn: async () => {
      const all = await base44.entities.TermsAcceptanceLog.list('-accepted_at', 200);
      return all.filter(l => l.terms_version >= CONTRACT_VERSION_OFFSET + 1);
    },
  });

  const filtered = logs.filter(l =>
    !search ||
    l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.contractor_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{logs.length}</p>
          <p className="text-xs text-emerald-600 mt-1">Total de aceites</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{new Set(logs.map(l => l.user_email)).size}</p>
          <p className="text-xs text-blue-600 mt-1">Usuários únicos</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">v1</p>
          <p className="text-xs text-amber-600 mt-1">Versão do contrato</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-center text-gray-400 py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ScrollText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nenhum aceite registrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(log => (
            <div key={log.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{log.user_name || '—'}</p>
                    <p className="text-xs text-gray-500">{log.user_email}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">
                  Contrato v{log.terms_version - CONTRACT_VERSION_OFFSET}
                </Badge>
              </div>

              {/* Dados do contratante preenchidos no formulário */}
              {(log.contractor_name || log.contractor_document || log.contractor_address || log.contractor_phone) && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs text-gray-600 border border-gray-100">
                  <p className="font-semibold text-gray-700 mb-1">Dados do Contratante</p>
                  {log.contractor_name && <p><span className="font-medium">Nome/Empresa:</span> {log.contractor_name}</p>}
                  {log.contractor_document && <p><span className="font-medium">CPF/CNPJ:</span> {log.contractor_document}</p>}
                  {log.contractor_address && <p><span className="font-medium">Endereço:</span> {log.contractor_address}</p>}
                  {log.contractor_phone && <p><span className="font-medium">Telefone:</span> {log.contractor_phone}</p>}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {log.accepted_at ? format(parseISO(log.accepted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}
                </span>
                {log.user_agent && (
                  <span className="flex items-center gap-1 truncate max-w-xs">
                    <Monitor className="w-3 h-3 flex-shrink-0" />
                    {log.user_agent.substring(0, 60)}...
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}