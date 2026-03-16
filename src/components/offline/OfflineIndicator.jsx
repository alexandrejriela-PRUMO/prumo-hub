import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OfflineIndicator({ isOnline, syncInProgress, syncStats, lastError }) {
  const [showDetails, setShowDetails] = useState(false);

  if (isOnline && !syncInProgress && (!syncStats || syncStats.total_pending_records === 0)) {
    return null; // Não mostrar se tudo está ok
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Indicador principal */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={cn(
          'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg transition-all',
          isOnline
            ? syncInProgress
              ? 'bg-blue-100 text-blue-800 border border-blue-200'
              : 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200',
          'hover:shadow-xl'
        )}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-5 h-5" />
            <span className="text-sm font-semibold">Offline</span>
          </>
        ) : syncInProgress ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span className="text-sm font-semibold">Sincronizando...</span>
          </>
        ) : syncStats?.total_pending_records > 0 ? (
          <>
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">
              {syncStats.total_pending_records} pendentes
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">Sincronizado</span>
          </>
        )}
      </button>

      {/* Painel detalhado */}
      {showDetails && (
        <div className={cn(
          'absolute bottom-16 right-0 w-80 bg-white rounded-xl shadow-2xl border p-4',
          isOnline ? 'border-green-200' : 'border-red-200'
        )}>
          <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center gap-2 pb-3 border-b">
              <div className={cn(
                'w-3 h-3 rounded-full',
                isOnline ? 'bg-green-500' : 'bg-red-500'
              )} />
              <span className="font-semibold text-gray-900">
                {isOnline ? 'Conectado' : 'Desconectado'}
              </span>
            </div>

            {/* Sincronização em progresso */}
            {syncInProgress && (
              <div className="flex items-center gap-2 text-blue-700">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm">Sincronizando dados...</span>
              </div>
            )}

            {/* Erros */}
            {lastError && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <p className="text-xs text-red-800">
                  <strong>Erro:</strong> {lastError}
                </p>
              </div>
            )}

            {/* Estatísticas */}
            {syncStats && (
              <div className="space-y-2 pt-3 border-t">
                <h4 className="text-xs font-bold text-gray-700 uppercase">Pendentes</h4>
                
                {syncStats.total_pending_records === 0 ? (
                  <p className="text-xs text-green-700">✓ Nenhum registro pendente</p>
                ) : (
                  <>
                    {syncStats.pending_creates > 0 && (
                      <p className="text-xs text-gray-600">
                        Criações: <span className="font-semibold">{syncStats.pending_creates}</span>
                      </p>
                    )}
                    {syncStats.pending_updates > 0 && (
                      <p className="text-xs text-gray-600">
                        Atualizações: <span className="font-semibold">{syncStats.pending_updates}</span>
                      </p>
                    )}
                    {syncStats.pending_deletes > 0 && (
                      <p className="text-xs text-gray-600">
                        Deletions: <span className="font-semibold">{syncStats.pending_deletes}</span>
                      </p>
                    )}
                    {syncStats.total_pending_files > 0 && (
                      <p className="text-xs text-gray-600">
                        Arquivos: <span className="font-semibold">{syncStats.total_pending_files}</span> (
                        {(syncStats.total_file_size / 1024 / 1024).toFixed(2)}MB)
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Última sincronização */}
            {syncStats?.last_sync && (
              <div className="pt-3 border-t">
                <p className="text-xs text-gray-500">
                  Última sincronização: {new Date(syncStats.last_sync).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}