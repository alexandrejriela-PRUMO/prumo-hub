import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users } from 'lucide-react';

export default function ConsultorPropertySelector({ properties, selectedPropertyId, onSelect, isLoading }) {
  if (isLoading) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-4">
          <p className="text-sm text-amber-700">Carregando propriedades...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Modo Consultor</p>
              <p className="text-sm font-semibold text-amber-900">Selecione o seu Cliente</p>
            </div>
          </div>
          <div className="w-full sm:flex-1">
            <Select value={selectedPropertyId || ''} onValueChange={onSelect}>
              <SelectTrigger className="bg-white border-amber-300 focus:ring-amber-400">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <SelectValue placeholder="Selecione o seu Cliente..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                {properties.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">Nenhum cliente encontrado</div>
                ) : (
                  properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="font-medium">{p.property_name}</span>
                      {(p.client_name || p.city) && (
                        <span className="text-gray-500 ml-2 text-xs">
                          {p.client_name ? `— ${p.client_name}` : ''}{p.city ? ` (${p.city}/${p.state})` : ''}
                        </span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        {!selectedPropertyId && (
          <p className="text-xs text-amber-600 mt-2">⚠ Selecione o seu Cliente para visualizar as informações</p>
        )}
      </CardContent>
    </Card>
  );
}