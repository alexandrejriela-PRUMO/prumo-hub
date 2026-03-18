import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export default function PropertySelector({ selectedPropertyId, onPropertyChange, properties }) {
  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-emerald-600" />
      <Select value={selectedPropertyId} onValueChange={onPropertyChange}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Selecione uma propriedade" />
        </SelectTrigger>
        <SelectContent>
          {properties.map((prop) => (
            <SelectItem key={prop.id} value={prop.id}>
              {prop.property_name} {prop.city && `• ${prop.city}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}