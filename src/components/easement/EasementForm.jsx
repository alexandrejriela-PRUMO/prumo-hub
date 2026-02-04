import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const conservationPurposes = [
  'Conservação de Biodiversidade',
  'Proteção de Recursos Hídricos',
  'Sequestro de Carbono',
  'Proteção de Fauna',
  'Corredor Ecológico',
  'Preservação de Espécies Ameaçadas',
  'Outro'
];

export default function EasementForm({ easement, properties, user, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(easement || {
    property_id: '',
    easement_name: '',
    easement_number: '',
    easement_type: 'Permanente',
    area_hectares: '',
    vegetation_type: '',
    conservation_purpose: [],
    beneficiary: '',
    beneficiary_email: '',
    start_date: '',
    end_date: '',
    duration_years: '',
    status: 'Em Aprovação',
    compensation: {
      has_compensation: false,
      compensation_value: '',
      payment_type: 'Pagamento Único',
      total_paid: ''
    },
    notes: '',
    documents: easement?.documents || []
  });

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const newDoc = {
        name: file.name,
        type: docType,
        url: file_url,
        upload_date: new Date().toISOString()
      };

      setFormData({
        ...formData,
        documents: [...(formData.documents || []), newDoc]
      });
      
      toast.success('Documento adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload do documento');
    }
    setUploading(false);
  };

  const removeDocument = (index) => {
    const newDocs = [...formData.documents];
    newDocs.splice(index, 1);
    setFormData({ ...formData, documents: newDocs });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      area_hectares: parseFloat(formData.area_hectares) || 0,
      duration_years: formData.duration_years ? parseFloat(formData.duration_years) : undefined,
      compensation: formData.compensation?.has_compensation ? {
        ...formData.compensation,
        compensation_value: parseFloat(formData.compensation.compensation_value) || 0,
        total_paid: parseFloat(formData.compensation.total_paid) || 0
      } : undefined
    };

    onSubmit(data);
  };

  const togglePurpose = (purpose) => {
    const purposes = formData.conservation_purpose || [];
    if (purposes.includes(purpose)) {
      setFormData({
        ...formData,
        conservation_purpose: purposes.filter(p => p !== purpose)
      });
    } else {
      setFormData({
        ...formData,
        conservation_purpose: [...purposes, purpose]
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
          <CardTitle>{easement ? 'Editar Servidão Ambiental' : 'Nova Servidão Ambiental'}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Informações Básicas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Propriedade *</Label>
                  <select
                    required
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Selecione a propriedade</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.property_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Nome da Servidão *</Label>
                  <Input
                    required
                    value={formData.easement_name}
                    onChange={(e) => setFormData({ ...formData, easement_name: e.target.value })}
                    placeholder="Ex: Servidão APP Rio Verde"
                  />
                </div>

                <div>
                  <Label>Número/Registro</Label>
                  <Input
                    value={formData.easement_number}
                    onChange={(e) => setFormData({ ...formData, easement_number: e.target.value })}
                    placeholder="Ex: SA-2024-001"
                  />
                </div>

                <div>
                  <Label>Tipo de Servidão *</Label>
                  <select
                    required
                    value={formData.easement_type}
                    onChange={(e) => setFormData({ ...formData, easement_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Permanente">Permanente</option>
                    <option value="Temporária">Temporária</option>
                  </select>
                </div>

                <div>
                  <Label>Área (hectares) *</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={formData.area_hectares}
                    onChange={(e) => setFormData({ ...formData, area_hectares: e.target.value })}
                    placeholder="Ex: 25.5"
                  />
                </div>

                <div>
                  <Label>Tipo de Vegetação *</Label>
                  <select
                    required
                    value={formData.vegetation_type}
                    onChange={(e) => setFormData({ ...formData, vegetation_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Selecione</option>
                    <option value="Mata Atlântica">Mata Atlântica</option>
                    <option value="Cerrado">Cerrado</option>
                    <option value="Amazônia">Amazônia</option>
                    <option value="Caatinga">Caatinga</option>
                    <option value="Pampa">Pampa</option>
                    <option value="Pantanal">Pantanal</option>
                    <option value="Área de Preservação Permanente">Área de Preservação Permanente</option>
                    <option value="Reserva Legal Excedente">Reserva Legal Excedente</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <Label>Status *</Label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Em Aprovação">Em Aprovação</option>
                    <option value="Ativa">Ativa</option>
                    <option value="Registrada">Registrada</option>
                    <option value="Suspensa">Suspensa</option>
                    <option value="Cancelada">Cancelada</option>
                    <option value="Expirada">Expirada</option>
                  </select>
                </div>

                <div>
                  <Label>Data de Início *</Label>
                  <Input
                    required
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                {formData.easement_type === 'Temporária' && (
                  <>
                    <div>
                      <Label>Data de Término</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Duração (anos)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={formData.duration_years}
                        onChange={(e) => setFormData({ ...formData, duration_years: e.target.value })}
                        placeholder="Ex: 15"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Conservation Purpose */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Finalidades de Conservação</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {conservationPurposes.map(purpose => (
                  <label key={purpose} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData.conservation_purpose || []).includes(purpose)}
                      onChange={() => togglePurpose(purpose)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{purpose}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Beneficiary */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Beneficiário</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Beneficiário</Label>
                  <Input
                    value={formData.beneficiary}
                    onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
                    placeholder="Nome da pessoa/instituição"
                  />
                </div>
                <div>
                  <Label>Email do Beneficiário</Label>
                  <Input
                    type="email"
                    value={formData.beneficiary_email}
                    onChange={(e) => setFormData({ ...formData, beneficiary_email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </div>

            {/* Compensation */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Compensação Financeira</h3>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.compensation?.has_compensation || false}
                    onChange={(e) => setFormData({
                      ...formData,
                      compensation: {
                        ...formData.compensation,
                        has_compensation: e.target.checked
                      }
                    })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Possui compensação financeira</span>
                </label>
              </div>

              {formData.compensation?.has_compensation && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Valor da Compensação (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.compensation?.compensation_value || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        compensation: {
                          ...formData.compensation,
                          compensation_value: e.target.value
                        }
                      })}
                      placeholder="Ex: 50000.00"
                    />
                  </div>
                  <div>
                    <Label>Tipo de Pagamento</Label>
                    <select
                      value={formData.compensation?.payment_type || 'Pagamento Único'}
                      onChange={(e) => setFormData({
                        ...formData,
                        compensation: {
                          ...formData.compensation,
                          payment_type: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Pagamento Único">Pagamento Único</option>
                      <option value="Anual">Anual</option>
                      <option value="Semestral">Semestral</option>
                      <option value="Mensal">Mensal</option>
                    </select>
                  </div>
                  <div>
                    <Label>Total Já Pago (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.compensation?.total_paid || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        compensation: {
                          ...formData.compensation,
                          total_paid: e.target.value
                        }
                      })}
                      placeholder="Ex: 25000.00"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="pt-4 border-t">
              <Label>Observações Gerais</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informações adicionais sobre a servidão..."
                rows={3}
              />
            </div>

            {/* Documents Upload */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Documentos da Servidão</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {['Termo de Servidão', 'Certidão de Registro', 'Laudo Técnico', 'Plano de Manejo', 'Relatório de Vistoria', 'Outro'].map(docType => (
                  <div key={docType} className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-400 transition-colors">
                    <Label className="text-sm font-medium mb-2 block">{docType}</Label>
                    <label className="flex items-center justify-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-green-600">
                      <Upload className="w-4 h-4" />
                      Selecionar arquivo
                      <Input
                        type="file"
                        onChange={(e) => handleFileUpload(e, docType)}
                        className="hidden"
                        disabled={uploading}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                    </label>
                  </div>
                ))}
              </div>

              {uploading && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando arquivo...
                </div>
              )}

              {formData.documents?.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Documentos Anexados:</Label>
                  {formData.documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                      <FileText className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-gray-500">{doc.type}</p>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-600 hover:underline"
                      >
                        Abrir
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(idx)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                {easement ? 'Atualizar Servidão' : 'Criar Servidão'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}