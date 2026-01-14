import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, FileText, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function CertificationForm({ certification, property, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  
  const [formData, setFormData] = useState({
    property_id: property?.id || '',
    certification_type: certification?.name || 'Outra',
    product: '',
    certifier: certification?.certifier || '',
    scope: '',
    area_certified: '',
    annual_cost: '',
    notes: ''
  });

  const createCertificationMutation = useMutation({
    mutationFn: async (data) => {
      const certData = {
        ...data,
        area_certified: parseFloat(data.area_certified) || 0,
        annual_cost: parseFloat(data.annual_cost) || 0,
        status: 'Em Solicitação',
        application_date: new Date().toISOString().split('T')[0]
      };
      
      const newCert = await base44.entities.Certification.create(certData);
      
      // Upload documents
      if (documents.length > 0) {
        for (const doc of documents) {
          await base44.entities.UnifiedDocument.create({
            entity_type: 'Certification',
            entity_id: newCert.id,
            document_type: doc.type,
            document_name: doc.name,
            file_url: doc.url,
            upload_date: new Date().toISOString().split('T')[0],
            uploaded_by: data.applicant_email
          });
        }
      }
      
      return newCert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['certifications']);
      toast.success('Solicitação de certificação enviada com sucesso!');
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
        type: 'Documentação',
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
    
    if (!formData.product || !formData.certification_type) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const user = await base44.auth.me();
    
    createCertificationMutation.mutate({
      ...formData,
      applicant_email: user.email
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader>
          <CardTitle>Solicitar Certificação</CardTitle>
          <CardDescription>
            {certification ? `${certification.name} - ${certification.category}` : 'Preencha os dados para solicitar a certificação'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Certification Info */}
            {certification && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Certificadora(s):</p>
                      <p className="text-sm text-gray-700">{certification.certifier}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Custo Estimado:</p>
                      <p className="text-sm text-gray-700">{certification.cost}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Prazo:</p>
                      <p className="text-sm text-gray-700">{certification.duration}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Produto a Certificar *</Label>
                <Input
                  placeholder="Ex: Café, Soja, Leite"
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label>Tipo de Certificação *</Label>
                <Select
                  value={formData.certification_type}
                  onValueChange={(value) => setFormData({ ...formData, certification_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Orgânica">Orgânica</SelectItem>
                    <SelectItem value="Carbono Neutro">Carbono Neutro</SelectItem>
                    <SelectItem value="Fair Trade">Fair Trade</SelectItem>
                    <SelectItem value="Rainforest Alliance">Rainforest Alliance</SelectItem>
                    <SelectItem value="GlobalGAP">GlobalGAP</SelectItem>
                    <SelectItem value="ISO 14001">ISO 14001</SelectItem>
                    <SelectItem value="Certificação Socioambiental">Certificação Socioambiental</SelectItem>
                    <SelectItem value="Produto Sustentável">Produto Sustentável</SelectItem>
                    <SelectItem value="Outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Certificadora Preferencial</Label>
              <Input
                placeholder="Ex: IBD, Ecocert, IMO"
                value={formData.certifier}
                onChange={(e) => setFormData({ ...formData, certifier: e.target.value })}
              />
            </div>

            <div>
              <Label>Escopo da Certificação</Label>
              <Textarea
                placeholder="Descreva o que será certificado (processos, produtos, áreas)..."
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Área Certificada (hectares)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 50"
                  value={formData.area_certified}
                  onChange={(e) => setFormData({ ...formData, area_certified: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Custo Anual Estimado (R$)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 5000"
                  value={formData.annual_cost}
                  onChange={(e) => setFormData({ ...formData, annual_cost: e.target.value })}
                />
              </div>
            </div>

            {/* Documents Upload */}
            <div>
              <Label>Documentos e Comprovantes</Label>
              <p className="text-xs text-gray-500 mb-2">
                Plano de manejo, laudos, registros de produção, etc.
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

            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Informações adicionais..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

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
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={createCertificationMutation.isPending}
              >
                {createCertificationMutation.isPending ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}