import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileUp, Download, CheckCircle, AlertCircle, Loader2, Link } from 'lucide-react';
import { toast } from 'sonner';
import DocumentLinkWidget from '../documents/DocumentLinkWidget';

export default function CertificationAuditTool({ certification, userEmail, onClose }) {
  const [checklist, setChecklist] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [linkedDocs, setLinkedDocs] = useState({});
  const [showDocLink, setShowDocLink] = useState(null);

  // Checklists por tipo de certificação
  const auditChecklists = {
    'Orgânica': [
      { id: 'soil_analysis', label: 'Análise de Solo (últimos 2 anos)', required: true },
      { id: 'pesticide_records', label: 'Registro de uso de pesticidas', required: true },
      { id: 'pest_management', label: 'Plano de manejo integrado de pragas', required: true },
      { id: 'fertilizer_records', label: 'Documentação de fertilizantes utilizados', required: true },
      { id: 'production_logs', label: 'Registros de produção mensal', required: true },
      { id: 'facility_inspection', label: 'Fotos da instalação/propriedade', required: false },
      { id: 'training_records', label: 'Certificados de treinamento da equipe', required: false }
    ],
    'Carbono Neutro': [
      { id: 'carbon_inventory', label: 'Inventário de emissões de carbono', required: true },
      { id: 'energy_audit', label: 'Auditoria energética', required: true },
      { id: 'renewable_energy', label: 'Documentação de energia renovável', required: true },
      { id: 'offset_records', label: 'Registros de compensação de carbono', required: true },
      { id: 'supplier_info', label: 'Informações de fornecedores', required: false },
      { id: 'transportation_data', label: 'Dados de transporte e logística', required: false }
    ],
    'Fair Trade': [
      { id: 'labor_records', label: 'Registros de folha de pagamento', required: true },
      { id: 'labor_conditions', label: 'Documentação de condições de trabalho', required: true },
      { id: 'worker_contracts', label: 'Contratos de trabalho', required: true },
      { id: 'health_safety', label: 'Políticas de saúde e segurança', required: true },
      { id: 'grievance_procedures', label: 'Procedimentos de reclamações', required: false },
      { id: 'training_programs', label: 'Programas de treinamento', required: false }
    ],
    'Rainforest Alliance': [
      { id: 'environmental_policy', label: 'Política ambiental documentada', required: true },
      { id: 'biodiversity_plan', label: 'Plano de conservação de biodiversidade', required: true },
      { id: 'water_management', label: 'Plano de gestão de água', required: true },
      { id: 'legal_compliance', label: 'Comprovante de conformidade legal', required: true },
      { id: 'community_engagement', label: 'Plano de engajamento comunitário', required: false },
      { id: 'monitoring_results', label: 'Resultados de monitoramento', required: false }
    ]
  };

  const certType = certification?.certification_type || 'Orgânica';
  const items = auditChecklists[certType] || auditChecklists['Orgânica'];

  const handleCheckItem = (itemId) => {
    setChecklist(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleFileUpload = async (itemId, file) => {
    if (!file) return;
    
    setLoading(true);
    try {
      const fileUrl = await base44.integrations.Core.UploadFile({ file });
      setUploadedFiles(prev => ({
        ...prev,
        [itemId]: fileUrl.file_url
      }));
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload do arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentsLinked = (itemId, documents) => {
    setLinkedDocs(prev => ({
      ...prev,
      [itemId]: documents
    }));
    setShowDocLink(null);
    toast.success(`${documents.length} documento(s) vinculado(s)`);
  };

  const generateAuditReport = async () => {
    setGeneratingReport(true);
    try {
      const completedItems = Object.keys(checklist).filter(k => checklist[k]).length;
      const totalItems = items.length;
      const completionPercentage = Math.round((completedItems / totalItems) * 100);

      const reportData = {
        certificationName: certification?.certification_type,
        certificationDate: new Date().toLocaleDateString('pt-BR'),
        completionPercentage,
        checklist: items.map(item => ({
          label: item.label,
          completed: checklist[item.id] || false,
          hasFile: !!uploadedFiles[item.id],
          required: item.required
        }))
      };

      // Salvar relatório compilado
      await base44.entities.UnifiedDocument.create({
        entity_type: 'General',
        document_type: 'Relatório de Auditoria',
        document_name: `Auditoria ${certType} - ${new Date().toLocaleDateString('pt-BR')}`,
        description: `Relatório de compilação de dados para auditoria de certificação ${certType}`,
        file_url: 'audit_report',
        upload_date: new Date().toISOString(),
        tags: ['auditoria', 'certificação', certType.toLowerCase()]
      });

      // Gerar PDF (simulado)
      const reportText = `
RELATÓRIO DE COMPILAÇÃO PARA AUDITORIA
=====================================
Tipo de Certificação: ${reportData.certificationName}
Data do Relatório: ${reportData.certificationDate}
Completude: ${reportData.completionPercentage}%

CHECKLIST DE DOCUMENTOS
${reportData.checklist.map((item, idx) => `
${idx + 1}. ${item.label}
   Status: ${item.completed ? '✓ Completo' : '✗ Pendente'} ${item.required ? '(Obrigatório)' : '(Opcional)'}
   Arquivo: ${item.hasFile ? '✓ Enviado' : '✗ Não enviado'}
`).join('')}

RESUMO
- Total de itens: ${totalItems}
- Itens preenchidos: ${completedItems}
- Completude: ${completionPercentage}%
- Itens obrigatórios pendentes: ${items.filter(i => i.required && !checklist[i.id]).length}
      `;

      toast.success('Relatório de auditoria gerado com sucesso!');
      
      // Oferecer download
      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Auditoria_${certType}_${new Date().getTime()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setGeneratingReport(false);
    }
  };

  const requiredItems = items.filter(i => i.required);
  const completedRequired = requiredItems.filter(i => checklist[i.id]).length;
  const isReadyForAudit = completedRequired === requiredItems.length;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Ferramenta de Auditoria - {certType}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progresso */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900">Progresso de Preparação</span>
              <Badge className={isReadyForAudit ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                {completedRequired}/{requiredItems.length} itens obrigatórios
              </Badge>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(completedRequired / requiredItems.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Documentos Necessários</h3>
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={item.id}
                    checked={checklist[item.id] || false}
                    onCheckedChange={() => handleCheckItem(item.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={item.id}
                      className="font-medium text-gray-900 cursor-pointer flex items-center gap-2"
                    >
                      {item.label}
                      {item.required && <Badge className="bg-red-100 text-red-700">Obrigatório</Badge>}
                    </label>

                    <div className="mt-3 flex items-center gap-2">
                      <label className="relative cursor-pointer">
                        <span className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                          <FileUp className="w-4 h-4" />
                          {uploadedFiles[item.id] ? 'Arquivo Enviado' : 'Fazer Upload'}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileUpload(item.id, e.target.files?.[0])}
                          disabled={loading}
                        />
                      </label>

                      {userEmail && (
                        <Button
                          onClick={() => setShowDocLink(item.id)}
                          variant="outline"
                          size="sm"
                          className="text-xs h-9"
                          title="Vincular documentos existentes"
                        >
                          <Link className="w-3 h-3 mr-1" />
                          Vincular
                        </Button>
                      )}

                      {uploadedFiles[item.id] && (
                        <div className="flex items-center gap-2 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Arquivo enviado
                        </div>
                      )}

                      {linkedDocs[item.id]?.length > 0 && (
                        <Badge className="bg-blue-100 text-blue-700">
                          {linkedDocs[item.id].length} doc(s)
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Aviso de Preparação */}
          {isReadyForAudit ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Pronto para Auditoria!</p>
                <p className="text-sm text-green-800">Todos os documentos obrigatórios foram preenchidos.</p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-900">Documentos Faltantes</p>
                <p className="text-sm text-yellow-800">
                  Ainda faltam {requiredItems.length - completedRequired} itens obrigatórios.
                </p>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Fechar
            </Button>
            <Button
              onClick={generateAuditReport}
              disabled={generatingReport || !isReadyForAudit}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {generatingReport ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar Relatório de Auditoria
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}