import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Save, Loader2 } from 'lucide-react';
import { MODULES, DOCUMENT_TYPES } from './documentConstants';

export default function DocumentEditModal({ document, properties = [], onSave, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    document_name: document.document_name || '',
    document_type: document.document_type || '',
    module: document.module || '',
    description: document.description || '',
    upload_date: document.upload_date || new Date().toISOString().split('T')[0],
    entity_id: document.entity_id || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(document.id, {
        ...form,
        entity_type: form.entity_id ? 'Property' : document.entity_type,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Editar Documento</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel} disabled={saving}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Property */}
            {properties.length > 0 && (
              <div>
                <Label>Propriedade Vinculada</Label>
                <select
                  value={form.entity_id}
                  onChange={(e) => setForm({ ...form, entity_id: e.target.value })}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                >
                  <option value="">Nenhuma (Documento Geral)</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.property_name} {p.city ? `— ${p.city}/${p.state}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Module */}
            <div>
              <Label>Módulo</Label>
              <select
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
              >
                <option value="">Selecione o módulo</option>
                {MODULES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Document Type */}
            <div>
              <Label>Tipo de Documento *</Label>
              <select
                required
                value={form.document_type}
                onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
              >
                <option value="">Selecione o tipo</option>
                {DEFAULT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Document Name */}
            <div>
              <Label>Nome do Documento *</Label>
              <Input
                required
                value={form.document_name}
                onChange={(e) => setForm({ ...form, document_name: e.target.value })}
                placeholder="Ex: CAR - Propriedade São José"
                disabled={saving}
              />
            </div>

            {/* Date */}
            <div>
              <Label>Data do Documento</Label>
              <Input
                type="date"
                value={form.upload_date}
                onChange={(e) => setForm({ ...form, upload_date: e.target.value })}
                disabled={saving}
              />
            </div>

            {/* Description */}
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Informações adicionais sobre o documento..."
                rows={3}
                disabled={saving}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />Salvar Alterações</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}