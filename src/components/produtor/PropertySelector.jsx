import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PropertySelector({ properties = [], selectedPropertyId, onSelect, isLoading }) {
  if (isLoading) {
    return <Skeleton className="h-12 rounded-lg" />;
  }

  if (!properties || properties.length === 0) {
    return null;
  }

  return (
    <Card className="border-emerald-100 bg-emerald-50/30">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1">
            <label className="text-xs font-semibold text-emerald-700 block mb-2">Selecione a Propriedade</label>
            <Select value={selectedPropertyId || ''} onValueChange={onSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha uma propriedade..." />
              </SelectTrigger>
              <SelectContent>
                {properties.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{prop.property_name}</span>
                      {prop.city && <span className="text-xs text-gray-500">• {prop.city}/{prop.state}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}