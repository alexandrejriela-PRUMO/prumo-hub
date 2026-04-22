import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, Save, Mail, Copy, ZoomIn, ZoomOut } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import 'react-quill/dist/quill.snow.css';

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: ['', 'center', 'right', 'justify'] }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean']
  ]
};

export default function ContractEditorWYSIWYG({ 
  contractData, 
  templates = [], 
  onSave, 
  onSendToSign,
  onSaveTemplate 
}) {
  const [documentHtml, setDocumentHtml] = useState(contractData?.document_html || '');
  const [selectedTemplate, setSelectedTemplate] = useState(contractData?.template_id || '');
  const [templateName, setTemplateName] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [zoom, setZoom] = useState(100);


  useEffect(() => {
    if (!documentHtml && selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setDocumentHtml(template.html_template);
      }
    }
  }, [selectedTemplate, templates]);

  useEffect(() => {
    if (!contractData?.document_html) {
      generateDefaultContract(contractData);
    }
  }, [contractData]);

  const generateDefaultContract = (data) => {
    const c = data || contractData || {};
    const contratante = c.contratante || {};
    const contratada = c.contratada || {};
    const html = `
      <div style="font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.8; color: #333;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #1B4332;">
          <h1 style="color: #1B4332; margin: 0; font-size: 28px; font-weight: bold;">CONTRATO DE ${(c.contract_type || 'SERVIÇOS').toUpperCase()}</h1>
          <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <!-- Partes -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1B4332; font-size: 16px; margin-top: 0;">1. CONTRATANTE</h2>
          <p style="margin: 8px 0;"><strong>Razão Social/Nome:</strong> ${contratante.name || c.client_name || '___________________________'}</p>
          <p style="margin: 8px 0;"><strong>CNPJ/CPF:</strong> ${contratante.document || '___________________________'}</p>
          <p style="margin: 8px 0;"><strong>Endereço:</strong> ${contratante.address || '___________________________'}</p>
          ${c.client_email ? `<p style="margin: 8px 0;"><strong>E-mail:</strong> ${c.client_email}</p>` : ''}
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1B4332; font-size: 16px; margin-top: 0;">2. CONTRATADA</h2>
          <p style="margin: 8px 0;"><strong>Razão Social/Nome:</strong> ${contratada.name || '___________________________'}</p>
          <p style="margin: 8px 0;"><strong>CNPJ/CPF:</strong> ${contratada.document || '___________________________'}</p>
          <p style="margin: 8px 0;"><strong>Endereço:</strong> ${contratada.address || '___________________________'}</p>
        </div>

        <!-- Objeto -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1B4332; font-size: 16px; margin-top: 0;">3. OBJETO DO CONTRATO</h2>
          <p>${contractData?.object || 'Descrição dos serviços ou acordo aqui.'}</p>
        </div>

        <!-- Vigência -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1B4332; font-size: 16px; margin-top: 0;">4. VIGÊNCIA</h2>
          <p style="margin: 8px 0;"><strong>Início:</strong> ${contractData?.start_date || '___/___/______'}</p>
          <p style="margin: 8px 0;"><strong>Término:</strong> ${contractData?.end_date || '___/___/______'}</p>
        </div>

        <!-- Valores -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1B4332; font-size: 16px; margin-top: 0;">5. VALOR E CONDIÇÕES DE PAGAMENTO</h2>
          <p style="margin: 8px 0;"><strong>Valor Total:</strong> R$ ${contractData?.total_value?.toFixed(2) || '0,00'}</p>
          <p style="margin: 8px 0;"><strong>Condições de Pagamento:</strong> ${contractData?.payment_terms || 'Especificar condições'}</p>
        </div>

        <!-- Termos -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1B4332; font-size: 16px; margin-top: 0;">6. TERMOS E CONDIÇÕES</h2>
          <p>${contractData?.notes || 'Especificar termos e condições adicionais.'}</p>
        </div>

        <!-- Assinaturas -->
        <div style="margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
          <div style="text-align: center;">
            <div style="border-top: 1px solid #000; padding-top: 20px; margin-bottom: 5px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>Assinatura do Contratante</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Data: ___/___/_______</p>
          </div>
          <div style="text-align: center;">
            <div style="border-top: 1px solid #000; padding-top: 20px; margin-bottom: 5px;"></div>
            <p style="margin: 0; font-size: 13px;"><strong>Assinatura da Contratada</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Data: ___/___/_______</p>
          </div>
        </div>
      </div>
    `;
    setDocumentHtml(html);
  };



  const exportPDF = async () => {
    try {
      const element = document.getElementById('contract-preview');
      const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: '#fff',
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      while (heightLeft >= 0) {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
        position -= 297;
        if (heightLeft > 0) pdf.addPage();
      }
      
      pdf.save(`contrato-${new Date().getTime()}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Digite um nome para o modelo');
      return;
    }
    
    try {
      await onSaveTemplate({
        name: templateName,
        html_template: documentHtml
      });
      setTemplateName('');
      setShowTemplateForm(false);
      toast.success('Modelo salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar modelo: ' + error.message);
    }
  };

  const duplicateTemplate = (template) => {
    setDocumentHtml(template.html_template);
    toast.success('Modelo duplicado para edição');
  };

  return (
    <div className="space-y-6">
      <style>{`
        .ql-toolbar.ql-snow { border-left: none !important; border-right: none !important; border-top: none !important; }
        .ql-container.ql-snow { border: none !important; }
        .ql-editor { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.8; font-size: 14px; }
        .ql-align-center { text-align: center !important; }
        .ql-align-right { text-align: right !important; }
        .ql-align-justify { text-align: justify !important; }
        #contract-preview { font-family: 'Calibri', 'Arial', sans-serif; }
        #contract-preview h1, #contract-preview h2, #contract-preview h3 { color: #1B4332; }
        #contract-preview table { border-collapse: collapse; width: 100%; }
        #contract-preview td, #contract-preview th { border: 1px solid #ddd; padding: 8px; }
      `}</style>

      {/* Templates */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Modelos Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map(template => (
                <div key={template.id} className="border rounded-lg p-3 flex items-center justify-between hover:bg-slate-50">
                  <span className="text-sm font-medium">{template.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => duplicateTemplate(template)}
                    className="gap-2"
                  >
                    <Copy className="w-3 h-3" /> Usar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ferramentas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowTemplateForm(!showTemplateForm)}
            className="gap-2"
          >
            <Save className="w-4 h-4" /> Salvar como Modelo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.max(50, zoom - 10))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm px-2 py-1">{zoom}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.min(200, zoom + 10))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Save as Template Form */}
      {showTemplateForm && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="pt-6 flex gap-3">
            <Input
              placeholder="Nome do modelo (ex: Contrato Padrão)"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <Button
              onClick={handleSaveAsTemplate}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Salvar
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTemplateForm(false)}
            >
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Editor WYSIWYG</CardTitle>
        </CardHeader>
        <CardContent>
          <ReactQuill
            value={documentHtml}
            onChange={setDocumentHtml}
            modules={modules}
            theme="snow"
            style={{ height: '500px', marginBottom: '40px' }}
          />
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prévia em Tempo Real (WYSIWYG)</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            id="contract-preview"
            className="border rounded-lg p-8 bg-white overflow-auto"
            style={{ 
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              minHeight: '600px'
            }}
            dangerouslySetInnerHTML={{ __html: documentHtml }}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end flex-wrap">
        <Button
          onClick={exportPDF}
          variant="outline"
          className="gap-2"
        >
          <Download className="w-4 h-4" /> Download PDF
        </Button>
        <Button
          onClick={() => onSave({ documentHtml, selectedTemplate })}
          variant="outline"
          className="gap-2"
        >
          <Save className="w-4 h-4" /> Salvar Contrato
        </Button>
        <Button
          onClick={() => onSendToSign({ documentHtml, selectedTemplate })}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
        >
          <Mail className="w-4 h-4" /> Enviar para Assinatura
        </Button>
      </div>
    </div>
  );
}