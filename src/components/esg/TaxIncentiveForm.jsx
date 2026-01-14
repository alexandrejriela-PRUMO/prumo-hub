import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TaxIncentiveForm({ incentive, property, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  
  const [formData, setFormData] = useState({
    property_id: property?.id || '',
    incentive_type: incentive?.type || 'Outro',
    incentive_name: incentive?.name || '',
    sustainable_practice: '',
    description: incentive?.description || '',
    estimated_benefit: '',
    requirements: incentive?.requirements || []
  });

  const createIncentiveMutation = useMutation({
    mutationFn: async (data) => {
      const incentiveData = {
        ...data,
        estimated_benefit: parseFloat(data.estimated_benefit) || 0,
        application_status: 'Em Análise',
        eligibility_status: 'Em Análise',
        application_date: new Date().toISOString().split('T')[0]
      };
      
      const newIncentive = await base44.entities.TaxIncentive.create(incentiveData);
      
      // Upload documents
      if (documents.length > 0) {
        for (const doc of documents) {
          await base44.entities.UnifiedDocument.create({
            entity_type: 'TaxIncentive',
            entity_id: newIncentive.id,
            document_type: doc.type,
            document_name: doc.name,
            file_url: doc.url,
            upload_date: new Date().toISOString().split('T')[0],
            uploaded_by: data.applicant_email
          });
        }
      }
      
      return newIncentive;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['taxIncentives']);
      toast.success('Solicitação de incentivo fiscal enviada com sucesso!');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Erro ao enviar solicitação: ' + error.message);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setDocuments([...documents, {
        name: file.name,
        url: file_url,
        type: 'Comprovante',
        size: file.size
      }]);
      
      toast.success('Documento anexado com sucesso!');
    } catch (error) {
      toast.error('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (index) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.incentive_name || !formData.sustainable_practice) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const user = await base44.auth.me();
    
    createIncentiveMutation.mutate({
      ...formData,
      applicant_email: user.email
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader>
          <CardTitle>Solicitar Incentivo Fiscal</CardTitle>
          <CardDescription>
            {incentive ? incentive.name : 'Preencha os dados para solicitar o incentivo'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Requirements Alert */}
            {incentive && incentive.requirements.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Requisitos:</h4>
                    <ul className="space-y-1">
                      {incentive.requirements.map((req, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div>
              <Label>Nome do Incentivo *</Label>
              <Input
                value={formData.incentive_name}
                onChange={(e) => setFormData({ ...formData, incentive_name: e.target.value })}
                placeholder="Ex: Isenção de ITR"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Incentivo</Label>
                <Select
                  value={formData.incentive_type}
                  onValueChange={(value) => setFormData({ ...formData, incentive_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Isenção de IPTU Rural">Isenção de IPTU Rural</SelectItem>
                    <SelectItem value="Redução de ITR">Redução de ITR</SelectItem>
                    <SelectItem value="Isenção de ICMS">Isenção de ICMS</SelectItem>
                    <SelectItem value="Subsídio Estadual">Subsídio Estadual</SelectItem>
                    <SelectItem value="Crédito Presumido">Crédito Presumido</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prática Sustentável *</Label>
                <Select
                  value={formData.sustainable_practice}
                  onValueChange={(value) => setFormData({ ...formData, sustainable_practice: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reflorestamento">Reflorestamento</SelectItem>
                    <SelectItem value="Agricultura Orgânica">Agricultura Orgânica</SelectItem>
                    <SelectItem value="Conservação de APP">Conservação de APP</SelectItem>
                    <SelectItem value="Energia Renovável">Energia Renovável</SelectItem>
                    <SelectItem value="Gestão de Resíduos">Gestão de Resíduos</SelectItem>
                    <SelectItem value="Sequestro de Carbono">Sequestro de Carbono</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição da Atividade</Label>
              <Textarea
                placeholder="Descreva a atividade sustentável que justifica o incentivo..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Benefício Estimado Anual (R$)</Label>
              <Input
                type="number"
                placeholder="Ex: 5000"
                value={formData.estimated_benefit}
                onChange={(e) => setFormData({ ...formData, estimated_benefit: e.target.value })}
              />
            </div>

            {/* Documents Upload */}
            <div>
              <Label>Documentos Necessários *</Label>
              <p className="text-xs text-gray-500 mb-2">
                CAR, licenças, laudos técnicos, comprovantes de práticas sustentáveis
              </p>
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      {uploading ? 'Enviando...' : 'Clique para anexar documentos'}
                    </p>
                  </label>
                </div>

                {documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                        <p className="text-xs text-gray-500">
                          {(doc.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDocument(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            {incentive && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Benefício Esperado
                </h4>
                <p className="text-sm text-gray-700 mb-2">{incentive.benefit}</p>
                <p className="text-sm font-semibold text-green-700">{incentive.estimatedValue}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={createIncentiveMutation.isPending}
              >
                {createIncentiveMutation.isPending ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}