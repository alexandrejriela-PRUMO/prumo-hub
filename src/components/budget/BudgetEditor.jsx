import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, Mail } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'image'],
    ['clean']
  ]
};

export default function BudgetEditor({ budgetData, templates = [], onSave, onSend }) {
  const [documentHtml, setDocumentHtml] = useState(budgetData?.document_html || '');
  const [logoUrl, setLogoUrl] = useState(budgetData?.logo_url || '');
  const [selectedTemplate, setSelectedTemplate] = useState(budgetData?.template_id || '');

  useEffect(() => {
    if (!documentHtml && selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setDocumentHtml(template.html_template);
        setLogoUrl(template.logo_url || '');
      }
    }
  }, [selectedTemplate]);

  // Gerar documento padrão se não houver
  useEffect(() => {
    if (!documentHtml) {
      generateDefaultDocument();
    }
  }, []);

  const generateDefaultDocument = () => {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1B4332; padding-bottom: 20px;">
          ${logoUrl ? `<img src="${logoUrl}" style="max-width: 200px; max-height: 100px; margin-bottom: 10px;" />` : ''}
          <h1 style="color: #1B4332; margin: 0;">ORÇAMENTO</h1>
          <p style="color: #666; margin: 5px 0;">Nº ${budgetData?.budget_number || '####'}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
          <div>
            <h3 style="color: #1B4332; margin-bottom: 10px;">CLIENTE</h3>
            <p><strong>${budgetData?.client_name}</strong></p>
            <p>${budgetData?.client_email}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
            <p><strong>Validade:</strong> ${budgetData?.validity_days} dias</p>
          </div>
        </div>

        <h3 style="color: #1B4332; margin-top: 30px; margin-bottom: 15px;">SERVIÇOS</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #1B4332; color: white;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Serviço</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Horas</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Valor/h</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${budgetData?.services?.map(s => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${s.name}</td>
                <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${s.hours}</td>
                <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">R$ ${s.hourly_rate.toFixed(2)}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">R$ ${(s.hours * s.hourly_rate).toFixed(2)}</td>
              </tr>
            `).join('') || '<tr><td colspan="4" style="padding: 10px; border: 1px solid #ddd;">Nenhum serviço adicionado</td></tr>'}
          </tbody>
        </table>

        <div style="text-align: right; font-size: 14px; margin-bottom: 20px;">
          ${budgetData?.travel_cost > 0 ? `<p>Deslocamento: R$ ${budgetData.travel_cost.toFixed(2)}</p>` : ''}
          ${budgetData?.fuel_cost > 0 ? `<p>Combustível: R$ ${budgetData.fuel_cost.toFixed(2)}</p>` : ''}
          ${budgetData?.additional_fees?.map(f => `<p>${f.name}: R$ ${f.amount.toFixed(2)}</p>`).join('') || ''}
          ${budgetData?.discount_percentage > 0 ? `<p>Desconto: -${budgetData.discount_percentage}%</p>` : ''}
          <h3 style="color: #1B4332; border-top: 2px solid #1B4332; padding-top: 10px; margin-top: 10px;">TOTAL: R$ ${budgetData?.total_amount?.toFixed(2) || '0.00'}</h3>
        </div>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h4 style="margin: 0 0 10px 0;">Observações:</h4>
          <p style="margin: 0;">${budgetData?.notes || 'N/A'}</p>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
          <p>Este orçamento é válido por ${budgetData?.validity_days} dias.</p>
        </div>
      </div>
    `;
    setDocumentHtml(html);
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

  return (
    <div className="space-y-6">
      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações do Documento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Usar Modelo</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full border rounded-lg p-2"
              >
                <option value="">Documento em branco</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">URL da Logo</label>
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Editor de Documento</CardTitle>
        </CardHeader>
        <CardContent>
          <ReactQuill
            value={documentHtml}
            onChange={setDocumentHtml}
            modules={modules}
            theme="snow"
            style={{ height: '400px', marginBottom: '40px' }}
          />
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prévia</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            id="budget-preview"
            className="border rounded-lg p-6 bg-white"
            dangerouslySetInnerHTML={{ __html: documentHtml }}
          />
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-3 justify-end">
        <Button
          onClick={exportPDF}
          variant="outline"
          className="gap-2"
        >
          <Download className="w-4 h-4" /> Download PDF
        </Button>
        <Button
          onClick={() => onSave({ documentHtml, logoUrl, selectedTemplate })}
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
  );
}