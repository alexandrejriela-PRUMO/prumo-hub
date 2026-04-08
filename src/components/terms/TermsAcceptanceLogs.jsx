import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, User, Calendar, Shield, Monitor } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TermsAcceptanceLogs() {
  const [search, setSearch] = useState('');
  const [filterVersion, setFilterVersion] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['termsAcceptanceLogs'],
    queryFn: () => base44.entities.TermsAcceptanceLog.list('-accepted_at', 500),
  });

  const versions = [...new Set(logs.map(l => l.terms_version))].sort((a, b) => b - a);

  const filtered = logs.filter(log => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      log.user_email?.toLowerCase().includes(q) ||
      log.user_name?.toLowerCase().includes(q);
    const matchVersion = filterVersion === 'all' || String(log.terms_version) === filterVersion;
    return matchSearch && matchVersion;
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold text-emerald-700">{logs.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total de aceites</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold text-blue-700">{new Set(logs.map(l => l.user_email)).size}</p>
            <p className="text-xs text-gray-500 mt-0.5">Usuários únicos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold text-amber-700">{versions.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Versões aceitas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por e-mail ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterVersion} onValueChange={setFilterVersion}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Versão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as versões</SelectItem>
            {versions.map(v => (
              <SelectItem key={v} value={String(v)}>Versão {v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-emerald-900 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {filtered.length} registro(s) encontrado(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center text-gray-400 py-10">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Nenhum registro encontrado.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(log => (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {(log.user_name || log.user_email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{log.user_name || '—'}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="w-3 h-3" /> {log.user_email}
                      </span>
                      {log.accepted_at && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(log.accepted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    {log.user_agent && (
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-1 truncate">
                        <Monitor className="w-3 h-3 flex-shrink-0" />
                        {log.user_agent.substring(0, 80)}...
                      </p>
                    )}
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs flex-shrink-0">
                    v{log.terms_version}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}