import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, Send, Mail } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link'],
    ['clean']
  ]
};

export default function ContractEditor({ contractData, templates = [], onSave, onSendToSign }) {
  const [documentHtml, setDocumentHtml] = useState(contractData?.document_html || '');
  const [selectedTemplate, setSelectedTemplate] = useState(contractData?.template_id || '');

  useEffect(() => {
    if (!documentHtml && selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setDocumentHtml(template.html_template);
      }
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (!documentHtml) {
      generateDefaultContract();
    }
  }, []);

  const generateDefaultContract = () => {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 60px 40px; max-width: 900px; margin: 0 auto; line-height: 1.8;">
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1B4332; padding-bottom: 20px;">
          <h1 style="color: #1B4332; margin: 0; font-size: 24px;">CONTRATO DE ${contractData?.contract_type?.toUpperCase() || 'SERVIÇOS'}</h1>
        </div>

        <p style="margin-bottom: 30px;"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>

        <h3 style="color: #1B4332; margin-top: 30px;">CONTRATANTE</h3>
        <p>Razão Social/Nome: ___________________________</p>
        <p>CNPJ/CPF: ___________________________</p>
        <p>Endereço: ___________________________</p>

        <h3 style="color: #1B4332; margin-top: 30px;">CONTRATADA</h3>
        <p>Razão Social/Nome: ___________________________</p>
        <p>CNPJ/CPF: ___________________________</p>
        <p>Endereço: ___________________________</p>

        <h3 style="color: #1B4332; margin-top: 30px;">OBJETO DO CONTRATO</h3>
        <p>${contractData?.object || ''}</p>

        <h3 style="color: #1B4332; margin-top: 30px;">VIGÊNCIA</h3>
        <p>Início: ${contractData?.start_date || '___/___/______'}</p>
        <p>Término: ${contractData?.end_date || '___/___/______'}</p>

        <h3 style="color: #1B4332; margin-top: 30px;">VALOR E CONDIÇÕES DE PAGAMENTO</h3>
        <p>Valor Total: R$ ${contractData?.total_value?.toFixed(2) || '0,00'}</p>
        <p>Condições: ${contractData?.payment_terms || ''}</p>

        <h3 style="color: #1B4332; margin-top: 30px;">TERMOS E CONDIÇÕES</h3>
        <p>${contractData?.notes || 'Os termos e condições específicos serão descritos aqui.'}</p>

        <div style="margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
          <div style="border-top: 1px solid #000; padding-top: 20px;">
            <p style="margin: 0;">_____________________________</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">Assinatura do Contratante</p>
          </div>
          <div style="border-top: 1px solid #000; padding-top: 20px;">
            <p style="margin: 0;">_____________________________</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">Assinatura da Contratada</p>
          </div>
        </div>
      </div>
    `;
    setDocumentHtml(html);
  };

  const exportPDF = async () => {
    try {
      const element = document.getElementById('contract-preview');
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
      pdf.save(`contrato-${new Date().getTime()}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    }
  };

  return (
    <div className="space-y-6">
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selecionar Modelo</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Editor de Contrato</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prévia do Contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            id="contract-preview"
            className="border rounded-lg p-6 bg-white"
            dangerouslySetInnerHTML={{ __html: documentHtml }}
          />
        </CardContent>
      </Card>

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
          Salvar Contrato
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