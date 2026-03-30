import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Mail, Image as ImageIcon, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { base44 } from '@/api/base44Client';

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['link', 'image', 'video'],
    [{ font: [] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['clean']
  ]
};

export default function BudgetEditorAdvanced({ budgetData, templates = [], onSave, onSend }) {
  // Injetar CSS para corrigir o Quill
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .quill-editor-wrapper {
        display: flex;
        flex-direction: column;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
      }
      .quill-editor-wrapper .ql-toolbar.ql-snow {
        border: none !important;
        border-bottom: 1px solid #e5e7eb !important;
        padding: 8px !important;
        background: #fafafa;
      }
      .quill-editor-wrapper .ql-container.ql-snow {
        border: none !important;
        font-size: 14px;
      }
      .quill-editor-wrapper .ql-editor {
        min-height: 350px !important;
        padding: 15px !important;
        font-family: 'Segoe UI', Arial, sans-serif !important;
        line-height: 1.6 !important;
      }
      .quill-editor-wrapper .ql-editor.ql-blank::before {
        font-style: italic;
        color: #999;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  const [documentHtml, setDocumentHtml] = useState(budgetData?.document_html || '');
  const [logoUrl, setLogoUrl] = useState(budgetData?.logo_url || '');
  const [selectedTemplate, setSelectedTemplate] = useState(budgetData?.template_id || '');
  const [loadingLogo, setLoadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!documentHtml && selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setDocumentHtml(template.html_template);
        setLogoUrl(template.logo_url || '');
      }
    }
  }, [selectedTemplate, templates, documentHtml]);

  useEffect(() => {
    if (!documentHtml) {
      generateDefaultDocument();
    }
  }, []);

  const generateDefaultDocument = () => {
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.6; color: #333;">
        <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #1B4332;">
          ${logoUrl ? `<div style="margin-bottom: 20px;"><img src="${logoUrl}" style="max-width: 180px; max-height: 90px; object-fit: contain;" /></div>` : '<div style="height: 80px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; margin-bottom: 20px; border-radius: 4px; color: #999;">Logo aqui</div>'}
          <h1 style="color: #1B4332; margin: 10px 0; font-size: 32px; font-weight: bold;">ORÇAMENTO</h1>
          <p style="color: #666; margin: 5px 0; font-size: 14px;">Nº ${budgetData?.budget_number || '####'}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
          <div>
            <h3 style="color: #1B4332; margin-bottom: 10px; font-size: 14px; font-weight: bold; text-transform: uppercase;">CLIENTE</h3>
            <p style="margin: 8px 0;"><strong>${budgetData?.client_name}</strong></p>
            <p style="margin: 8px 0; color: #555;">${budgetData?.client_email}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 8px 0;"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
            <p style="margin: 8px 0;"><strong>Validade:</strong> ${budgetData?.validity_days} dias</p>
          </div>
        </div>

        <h3 style="color: #1B4332; margin-top: 30px; margin-bottom: 15px; font-size: 16px; font-weight: bold; text-transform: uppercase;">SERVIÇOS</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #1B4332; color: white;">
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: bold;">Serviço</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: bold;">Horas</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: bold;">Valor/h</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${budgetData?.services?.map(s => `
              <tr>
                <td style="padding: 12px; border: 1px solid #ddd;">${s.name}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${s.hours.toFixed(1)}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">R$ ${s.hourly_rate.toFixed(2)}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">R$ ${(s.hours * s.hourly_rate).toFixed(2)}</td>
              </tr>
            `).join('') || '<tr><td colspan="4" style="padding: 12px; border: 1px solid #ddd; text-align: center; color: #999;">Nenhum serviço adicionado</td></tr>'}
          </tbody>
        </table>

        <div style="text-align: right; font-size: 14px; margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
          ${budgetData?.travel_cost > 0 ? `<p style="margin: 8px 0;">Deslocamento: <strong>R$ ${budgetData.travel_cost.toFixed(2)}</strong></p>` : ''}
          ${budgetData?.fuel_cost > 0 ? `<p style="margin: 8px 0;">Combustível: <strong>R$ ${budgetData.fuel_cost.toFixed(2)}</strong></p>` : ''}
          ${budgetData?.additional_fees?.map(f => `<p style="margin: 8px 0;">${f.name}: <strong>R$ ${f.amount.toFixed(2)}</strong></p>`).join('') || ''}
          ${budgetData?.discount_percentage > 0 ? `<p style="margin: 8px 0;">Desconto: <strong>-${budgetData.discount_percentage.toFixed(1)}%</strong></p>` : ''}
          <div style="border-top: 2px solid #1B4332; margin-top: 15px; padding-top: 15px;">
            <h3 style="color: #1B4332; margin: 0; font-size: 18px;">TOTAL: R$ ${budgetData?.total_amount?.toFixed(2) || '0.00'}</h3>
          </div>
        </div>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin-top: 20px; border-left: 4px solid #1B4332;">
          <h4 style="margin: 0 0 10px 0; color: #1B4332; font-weight: bold;">Observações:</h4>
          <p style="margin: 0; color: #555;">${budgetData?.notes || 'N/A'}</p>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #999; font-size: 12px;">
          <p>Este orçamento é válido por ${budgetData?.validity_days} dias a partir da data acima.</p>
        </div>
      </div>
    `;
    setDocumentHtml(html);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingLogo(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setLogoUrl(result.file_url);
      // Atualizar documento com nova logo
      const updatedHtml = documentHtml.replace(
        /<div style="height: 80px;.*?Logo aqui<\/div>/,
        `<div style="margin-bottom: 20px;"><img src="${result.file_url}" style="max-width: 180px; max-height: 90px; object-fit: contain;" /></div>`
      ).replace(
        /(<img src=")([^"]*)(" style="max-width: 180px; max-height: 90px;)/,
        `$1${result.file_url}$3`
      );
      setDocumentHtml(updatedHtml);
    } catch (error) {
      console.error('Erro ao fazer upload da logo:', error);
    } finally {
      setLoadingLogo(false);
    }
  };

  const exportPDF = async () => {
    const element = document.getElementById('budget-preview');
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#fff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`orcamento-${budgetData?.budget_number}.pdf`);
  };

  const resetDocument = () => {
    setDocumentHtml('');
    generateDefaultDocument();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com configurações */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editor de Orçamento</h1>
            <p className="text-sm text-gray-500 mt-1">Customize seu documento com editor profissional</p>
          </div>
          <Button
            onClick={resetDocument}
            variant="outline"
            className="gap-2"
            title="Restaurar documento padrão"
          >
            <RefreshCw className="w-4 h-4" />
            Restaurar Padrão
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto p-4">
        {/* Painel de configuração rápida */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Logo Upload */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-sm mb-3 text-gray-900">Logo da Empresa</h3>
            <div className="flex gap-2 mb-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={loadingLogo}
                variant="outline"
                size="sm"
                className="gap-2 flex-1"
              >
                <ImageIcon className="w-4 h-4" />
                {loadingLogo ? 'Enviando...' : 'Importar'}
              </Button>
              {logoUrl && (
                <Button
                  onClick={() => setLogoUrl('')}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 px-2"
                >
                  ✕
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
            {logoUrl && (
              <div className="p-2 bg-gray-50 rounded border border-gray-200">
                <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }} />
              </div>
            )}
          </div>

          {/* Modelos */}
          {templates.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-sm mb-3 text-gray-900">Modelos de Documento</h3>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              >
                <option value="">Documento em branco</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Editor e Prévia lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-32">
          {/* Editor */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="font-semibold text-sm text-gray-900">Editor</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="quill-editor-wrapper h-full">
                <ReactQuill
                  value={documentHtml}
                  onChange={setDocumentHtml}
                  modules={modules}
                  theme="snow"
                />
              </div>
            </div>
          </div>

          {/* Prévia */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="font-semibold text-sm text-gray-900">Prévia do Documento</h3>
            </div>
            <div className="flex-1 overflow-auto">
              <div
                id="budget-preview"
                className="p-6 bg-white"
                dangerouslySetInnerHTML={{ __html: documentHtml }}
              />
            </div>
          </div>
        </div>

        {/* Ações - Rodapé fixo */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex gap-3 justify-end">
            <Button
              onClick={exportPDF}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" /> Download PDF
            </Button>
            <Button
              onClick={() => onSave({ documentHtml, logoUrl, selectedTemplate })}
              variant="outline"
              className="gap-2"
            >
              Salvar Orçamento
            </Button>
            <Button
              onClick={() => onSend({ documentHtml, logoUrl, selectedTemplate })}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              <Mail className="w-4 h-4" /> Enviar por Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}