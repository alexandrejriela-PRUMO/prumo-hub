import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function GreenLoanForm({ loan, property, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  
  const [formData, setFormData] = useState({
    property_id: property?.id || '',
    loan_type: loan?.name || '',
    requested_amount: '',
    term_months: '12',
    financial_institution: loan?.bank || '',
    program_name: loan?.name || '',
    purpose: '',
    interest_rate: loan?.interestRate || 0
  });

  const createLoanMutation = useMutation({
    mutationFn: async (data) => {
      const loanData = {
        ...data,
        requested_amount: parseFloat(data.requested_amount),
        term_months: parseInt(data.term_months),
        interest_rate: parseFloat(data.interest_rate),
        status: 'Em Análise',
        application_date: new Date().toISOString().split('T')[0]
      };
      
      const newLoan = await base44.entities.GreenLoan.create(loanData);
      
      // Upload documents
      if (documents.length > 0) {
        for (const doc of documents) {
          await base44.entities.UnifiedDocument.create({
            entity_type: 'GreenLoan',
            entity_id: newLoan.id,
            document_type: doc.type,
            document_name: doc.name,
            file_url: doc.url,
            upload_date: new Date().toISOString().split('T')[0],
            uploaded_by: data.applicant_email
          });
        }
      }
      
      return newLoan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['greenLoans']);
      toast.success('Solicitação de empréstimo enviada com sucesso!');
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
    
    if (!formData.requested_amount || !formData.purpose) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const user = await base44.auth.me();
    
    createLoanMutation.mutate({
      ...formData,
      applicant_email: user.email
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader>
          <CardTitle>Solicitar Empréstimo Verde</CardTitle>
          <CardDescription>
            {loan ? `${loan.name} - ${loan.bank}` : 'Preencha os dados para solicitar o financiamento'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Valor Solicitado (R$) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 100000"
                  value={formData.requested_amount}
                  onChange={(e) => setFormData({ ...formData, requested_amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Prazo (meses) *</Label>
                <Select
                  value={formData.term_months}
                  onValueChange={(value) => setFormData({ ...formData, term_months: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 meses</SelectItem>
                    <SelectItem value="24">24 meses</SelectItem>
                    <SelectItem value="36">36 meses</SelectItem>
                    <SelectItem value="48">48 meses</SelectItem>
                    <SelectItem value="60">60 meses</SelectItem>
                    <SelectItem value="120">120 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Tipo de Financiamento</Label>
              <Select
                value={formData.loan_type}
                onValueChange={(value) => setFormData({ ...formData, loan_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Reflorestamento">Reflorestamento</SelectItem>
                  <SelectItem value="Energia Renovável">Energia Renovável</SelectItem>
                  <SelectItem value="Agricultura Sustentável">Agricultura Sustentável</SelectItem>
                  <SelectItem value="Gestão de Recursos Hídricos">Gestão de Recursos Hídricos</SelectItem>
                  <SelectItem value="Crédito de Carbono">Crédito de Carbono</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Finalidade do Empréstimo *</Label>
              <Textarea
                placeholder="Descreva como o empréstimo será utilizado..."
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                rows={3}
                required
              />
            </div>

            {/* Documents Upload */}
            <div>
              <Label>Documentos Comprobatórios</Label>
              <div className="mt-2 space-y-3">
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
                    <p className="text-xs text-gray-500 mt-1">
                      Comprovantes, projetos, plantas, etc.
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
            {loan && formData.requested_amount && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Resumo da Solicitação
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Instituição:</span>
                    <span className="font-medium">{loan.bank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxa de Juros:</span>
                    <span className="font-medium text-green-600">{loan.interestRate}% a.a.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor Solicitado:</span>
                    <span className="font-semibold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.requested_amount)}
                    </span>
                  </div>
                </div>
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
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={createLoanMutation.isPending}
              >
                {createLoanMutation.isPending ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}