import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { getOfflineStats, getPendingRecords } from '@/lib/offlineStorage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wifi, WifiOff, RefreshCw, Trash2, AlertTriangle,
  CheckCircle2, Clock, Smartphone, MapPin, Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CampMode() {
  const { isOnline, syncInProgress, syncStats, performSync } = useOfflineSync();
  const [user, setUser] = useState(null);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [view, setView] = useState('overview'); // overview, pending, guide

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const loadPending = async () => {
      const records = await getPendingRecords();
      setPendingRecords(records);
    };
    loadPending();
  }, []);

  const handleSync = async () => {
    const result = await performSync();
    if (result.success) {
      const updated = await getPendingRecords();
      setPendingRecords(updated);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white rounded-xl p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Modo Campo</h1>
            <p className="text-emerald-100">Trabalhe offline e sincronize quando conectado</p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/20">
          <div className={cn(
            'w-4 h-4 rounded-full',
            isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'
          )} />
          <span className="font-semibold">
            {isOnline ? 'Conectado à internet' : 'Modo offline'}
          </span>
          {!isOnline && (
            <span className="text-sm text-emerald-100">Dados serão sincronizados quando a conexão retornar</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        {['overview', 'pending', 'guide'].map(tab => (
          <Button
            key={tab}
            variant={view === tab ? 'default' : 'outline'}
            onClick={() => setView(tab)}
            className={view === tab ? 'bg-emerald-700' : ''}
          >
            {tab === 'overview' && '📊 Visão Geral'}
            {tab === 'pending' && '⏳ Registros Pendentes'}
            {tab === 'guide' && '📖 Como Usar'}
          </Button>
        ))}
      </div>

      {/* OVERVIEW */}
      {view === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Registros Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-amber-600 mb-3">
                  {syncStats?.total_pending_records || 0}
                </div>
                <div className="space-y-2 text-sm">
                  {syncStats?.pending_creates > 0 && (
                    <p className="text-gray-600">
                      <span className="font-semibold text-green-600">{syncStats.pending_creates}</span> criações
                    </p>
                  )}
                  {syncStats?.pending_updates > 0 && (
                    <p className="text-gray-600">
                      <span className="font-semibold text-blue-600">{syncStats.pending_updates}</span> atualizações
                    </p>
                  )}
                  {syncStats?.pending_deletes > 0 && (
                    <p className="text-gray-600">
                      <span className="font-semibold text-red-600">{syncStats.pending_deletes}</span> deletions
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {isOnline ? (
                    <Wifi className="w-5 h-5 text-green-600" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-600" />
                  )}
                  Conexão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  'text-2xl font-bold mb-3',
                  isOnline ? 'text-green-600' : 'text-red-600'
                )}>
                  {isOnline ? 'Online' : 'Offline'}
                </div>
                {isOnline && (
                  <Button
                    onClick={handleSync}
                    disabled={syncInProgress || (syncStats?.total_pending_records === 0)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <RefreshCw className={cn('w-4 h-4 mr-2', syncInProgress && 'animate-spin')} />
                    {syncInProgress ? 'Sincronizando...' : 'Sincronizar Agora'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Arquivos Pendentes */}
          {syncStats?.total_pending_files > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-amber-900">
                  📁 {syncStats.total_pending_files} arquivo{syncStats.total_pending_files > 1 ? 's' : ''} para upload
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-amber-800">
                Tamanho total: {(syncStats.total_file_size / 1024 / 1024).toFixed(2)}MB
              </CardContent>
            </Card>
          )}

          {/* Última sincronização */}
          {syncStats?.last_sync && (
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Última sincronização:</span>
                  {' '}{new Date(syncStats.last_sync).toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Info Online */}
          {isOnline && syncStats?.total_pending_records === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-green-900 mb-2">Tudo sincronizado!</h3>
              <p className="text-sm text-green-700">
                Todos os dados estão atualizados no servidor. Continue trabalhando com segurança.
              </p>
            </div>
          )}
        </div>
      )}

      {/* PENDING RECORDS */}
      {view === 'pending' && (
        <div className="space-y-4">
          {pendingRecords.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">Nenhum registro pendente</p>
            </Card>
          ) : (
            pendingRecords.map(record => (
              <Card key={record.id} className={cn(
                'border-l-4',
                record.status === 'pending' && 'border-l-amber-500 bg-amber-50',
                record.status === 'error' && 'border-l-red-500 bg-red-50',
                record.status === 'synced' && 'border-l-green-500 bg-green-50'
              )}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">
                          {record.entity_name}
                        </span>
                        <Badge variant="outline" className={cn(
                          record.operation === 'create' && 'bg-green-100 text-green-800',
                          record.operation === 'update' && 'bg-blue-100 text-blue-800',
                          record.operation === 'delete' && 'bg-red-100 text-red-800'
                        )}>
                          {record.operation === 'create' && 'Criação'}
                          {record.operation === 'update' && 'Atualização'}
                          {record.operation === 'delete' && 'Exclusão'}
                        </Badge>
                        <Badge variant={
                          record.status === 'pending' ? 'secondary' :
                          record.status === 'error' ? 'destructive' :
                          'default'
                        }>
                          {record.status === 'pending' && 'Aguardando'}
                          {record.status === 'error' && `Erro (${record.retry_count || 0})`}
                          {record.status === 'synced' && 'Sincronizado'}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        {new Date(record.created_at).toLocaleString('pt-BR')}
                      </p>

                      {record.error && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                          {record.error}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* GUIDE */}
      {view === 'guide' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Como usar o Modo Campo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">1. Ir a campo sem internet</h4>
                  <p className="text-sm text-gray-600">
                    Você pode usar o aplicativo normalmente, mesmo sem sinal de internet. Todos os dados serão salvos no seu dispositivo.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">2. Criar e editar registros</h4>
                  <p className="text-sm text-gray-600">
                    Preencha formulários, tire fotos, adicione coordenadas GPS. Tudo será salvo localmente.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">3. Monitorar status</h4>
                  <p className="text-sm text-gray-600">
                    Veja quantos registros estão aguardando sincronização no ícone de status no canto inferior direito.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">4. Sincronizar automaticamente</h4>
                  <p className="text-sm text-gray-600">
                    Quando a conexão retornar, a sincronização será automática. Você também pode iniciar manualmente.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">5. Verificar no painel</h4>
                  <p className="text-sm text-gray-600">
                    Acesse este painel a qualquer momento para ver o status de todos os registros pendentes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">💡 Dicas úteis</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800 space-y-2">
              <p>✓ Seu dispositivo armazena dados por até 30 dias offline</p>
              <p>✓ Fotos e arquivos são sincronizados automaticamente após a conexão</p>
              <p>✓ Não feche o aplicativo abruptamente - os dados podem não ser salvos</p>
              <p>✓ Se houver erros de sincronização, tente novamente quando a conexão estiver estável</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}