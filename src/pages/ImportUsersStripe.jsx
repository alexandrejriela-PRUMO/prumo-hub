import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, CheckCircle, AlertTriangle, RefreshCw, Download,
  CreditCard, Loader2, Info, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function ImportUsersStripe() {
  const [user, setUser] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.role === 'admin') loadPreview();
    }).catch(() => {});
  }, []);

  const loadPreview = async () => {
    setLoadingPreview(true);
    setResults(null);
    try {
      const res = await base44.functions.invoke('importUsersToStripe', { mode: 'preview' });
      setCandidates(res.data.candidates || []);
      setSelected(new Set((res.data.candidates || []).map(c => c.id)));
    } catch (e) {
      toast.error('Erro ao carregar candidatos: ' + e.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleImport = async () => {
    if (selected.size === 0) {
      toast.warning('Selecione ao menos um usuário para importar.');
      return;
    }
    setImporting(true);
    setResults(null);
    try {
      const res = await base44.functions.invoke('importUsersToStripe', {
        mode: 'import',
        users: [...selected],
      });
      setResults(res.data);
      toast.success(`Importação concluída: ${res.data.imported} importados, ${res.data.errors} erros.`);
      await loadPreview();
    } catch (e) {
      toast.error('Erro na importação: ' + e.message);
    } finally {
      setImporting(false);
    }
  };

  const toggleAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map(c => c.id)));
    }
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const planLabel = {
    produtor: 'Produtor',
    start: 'Consultor Start',
    pro: 'Consultor Pro',
    enterprise: 'Consultor Enterprise',
  };

  if (!user) return null;

  if (user.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-700">Acesso restrito a administradores</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="w-7 h-7 text-purple-600" />
          Importar Usuários para o Stripe
        </h1>
        <p className="text-gray-500 mt-1">
          Cria clientes e assinaturas no Stripe para usuários que já estão pagando mas ainda não têm vínculo com o Stripe.
        </p>
      </div>

      {/* Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 space-y-1">
            <p className="font-semibold">O que essa ferramenta faz:</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-700">
              <li>Lista usuários com <code>subscription_plan</code> definido mas sem <code>stripe_customer_id</code></li>
              <li>Cria (ou encontra) o Customer no Stripe pelo e-mail</li>
              <li>Cria a assinatura no plano correspondente</li>
              <li>Salva os IDs <code>stripe_customer_id</code> e <code>stripe_subscription_id</code> no usuário</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Candidatos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-600" />
            Usuários candidatos ({candidates.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={loadPreview} disabled={loadingPreview}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingPreview ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingPreview ? (
            <div className="flex items-center justify-center py-10 gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">Todos os usuários já estão no Stripe!</p>
              <p className="text-sm text-gray-400 mt-1">Nenhum candidato encontrado.</p>
            </div>
          ) : (
            <>
              {/* Select all */}
              <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
                <input
                  type="checkbox"
                  checked={selected.size === candidates.length && candidates.length > 0}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-xs text-gray-600 font-medium">
                  Selecionar todos ({selected.size}/{candidates.length})
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {candidates.map(c => (
                  <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                      className="w-4 h-4 accent-purple-600 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.full_name || c.email}</p>
                      <p className="text-xs text-gray-500 truncate">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 border text-xs">
                        {planLabel[c.subscription_plan] || c.subscription_plan}
                      </Badge>
                      <Badge className="bg-gray-100 text-gray-600 border text-xs">
                        {c.user_type || 'produtor'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Botão importar */}
      {candidates.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleImport}
            disabled={importing || selected.size === 0}
            className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
          >
            {importing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
            ) : (
              <><ArrowRight className="w-4 h-4" /> Importar {selected.size} usuário(s) para o Stripe</>
            )}
          </Button>
        </div>
      )}

      {/* Resultados */}
      {results && (
        <Card className={results.errors > 0 ? 'border-amber-200' : 'border-emerald-200'}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {results.errors === 0 ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
              Resultado da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Summary */}
            <div className="px-4 py-3 border-b border-gray-100 flex gap-6 text-sm">
              <span className="text-emerald-700 font-semibold">✅ {results.imported} importados</span>
              {results.errors > 0 && (
                <span className="text-red-600 font-semibold">❌ {results.errors} com erro</span>
              )}
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {results.results.map((r, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{r.email}</p>
                    {r.customer_id && <p className="text-xs text-gray-400 font-mono">{r.customer_id}</p>}
                    {r.error && <p className="text-xs text-red-600">{r.error}</p>}
                  </div>
                  <Badge className={
                    r.status === 'success'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 border'
                      : 'bg-red-100 text-red-700 border-red-200 border'
                  }>
                    {r.status === 'success' ? (r.action === 'subscription_created' ? 'Criado' : 'Já vinculado') : 'Erro'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}