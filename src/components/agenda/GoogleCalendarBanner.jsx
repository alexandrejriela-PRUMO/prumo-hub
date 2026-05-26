import { Calendar, RefreshCw, Unplug, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GoogleCalendarBanner({ connected, loading, syncing, onConnect, onDisconnect, onRefresh }) {
  if (loading) return null;

  if (!connected) {
    return (
      <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-800">Conectar Google Calendar</p>
            <p className="text-xs text-indigo-500">Visualize seus eventos do Google diretamente na agenda</p>
          </div>
        </div>
        <Button size="sm" onClick={onConnect} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 flex-shrink-0">
          <Plug className="w-4 h-4" /> Conectar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 gap-3">
      <div className="flex items-center gap-3">
        <Calendar className="w-5 h-5 text-indigo-500 flex-shrink-0" />
        <p className="text-sm font-medium text-indigo-800">Google Calendar conectado</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={syncing} className="gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-100">
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Atualizando...' : 'Atualizar'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDisconnect} className="gap-1.5 text-red-500 hover:bg-red-50">
          <Unplug className="w-3.5 h-3.5" /> Desconectar
        </Button>
      </div>
    </div>
  );
}