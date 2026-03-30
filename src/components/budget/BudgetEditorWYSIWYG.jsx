import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Download, Mail, Image as ImageIcon, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const DEFAULT_BUDGET_HTML = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 32px; font-weight: bold;">ORÇAMENTO</h1>
    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Número: [Adicione aqui]</p>
  </div>

  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">DADOS DA EMPRESA</h2>
    <p style="margin: 5px 0;"><strong>[Nome da Empresa]</strong></p>
    <p style="margin: 5px 0; font-size: 14px;">CNPJ: [CNPJ]</p>
    <p style="margin: 5px 0; font-size: 14px;">Tel: [Telefone]</p>
    <p style="margin: 5px 0; font-size: 14px;">Email: [Email]</p>
  </div>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">DADOS DO CLIENTE</h2>
    <p style="margin: 5px 0;"><strong>[Nome do Cliente]</strong></p>
    <p style="margin: 5px 0; font-size: 14px;">CPF/CNPJ: [Documento]</p>
    <p style="margin: 5px 0; font-size: 14px;">Email: [Email do Cliente]</p>
    <p style="margin: 5px 0; font-size: 14px;">Telefone: [Telefone do Cliente]</p>
  </div>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">SERVIÇOS</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 2px solid #000;">
          <th style="text-align: left; padding: 10px; font-weight: bold;">Descrição</th>
          <th style="text-align: center; padding: 10px; font-weight: bold; width: 80px;">Qtd</th>
          <th style="text-align: right; padding: 10px; font-weight: bold; width: 120px;">Valor Unit.</th>
          <th style="text-align: right; padding: 10px; font-weight: bold; width: 120px;">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px;">[Serviço 1]</td>
          <td style="text-align: center; padding: 10px;">1</td>
          <td style="text-align: right; padding: 10px;">R$ 0,00</td>
          <td style="text-align: right; padding: 10px;">R$ 0,00</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="margin-bottom: 30px; text-align: right;">
    <p style="margin: 10px 0;"><strong>Subtotal:</strong> R$ 0,00</p>
    <p style="margin: 10px 0; font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px;">
      <strong>TOTAL:</strong> R$ 0,00
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

  <div style="margin-bottom: 30px; font-size: 14px;">
    <p style="margin: 10px 0;"><strong>Forma de Pagamento:</strong> [A combinar]</p>
    <p style="margin: 10px 0;"><strong>Prazo de Execução:</strong> [30 dias]</p>
    <p style="margin: 10px 0;"><strong>Validade:</strong> [30 dias]</p>
  </div>

  <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #ccc; text-align: center;">
    <div style="margin-bottom: 50px;">&nbsp;</div>
    <p style="margin: 0;"><strong>[Nome do Responsável]</strong></p>
    <p style="margin: 5px 0; font-size: 12px; color: #666;">[Cargo]</p>
  </div>
</div>
`;

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ align: [] }],
    ['blockquote', 'code-block'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }, { background: [] }],
    ['clean'],
  ],
};

export default function BudgetEditorWYSIWYG({ budgetData = {}, onSave, onSend }) {
  const [htmlContent, setHtmlContent] = useState(DEFAULT_BUDGET_HTML);
  const [logoBase64, setLogoBase64] = useState('');
  const [loadingLogo, setLoadingLogo] = useState(false);
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  // Carregar logo como base64 quando arquivo é selecionado
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        if (base64) {
          setLogoBase64(base64);
          toast.success('Logo carregada com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Erro ao carregar logo');
      console.error(error);
    } finally {
      setLoadingLogo(false);
    }
  };

  // Gerar HTML completo com logo incorporada
  const generateCompleteHTML = () => {
    let finalHTML = htmlContent;
    
    if (logoBase64) {
      const logoHTML = `<img src="${logoBase64}" style="max-height: 80px; margin-bottom: 20px;" alt="Logo Empresa">`;
      // Inserir logo no início do documento
      finalHTML = logoHTML + finalHTML;
    }

    return finalHTML;
  };

  // Exportar para PDF usando o HTML completo
  const exportPDF = async () => {
    try {
      const element = previewRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#fff',
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      pdf.save(`orcamento-${budgetData.budget_number || 'novo'}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
      console.error(error);
    }
  };

  const handleSave = () => {
    onSave({
      documentHtml: generateCompleteHTML(),
      logoBase64,
      rawHtml: htmlContent,
    });
  };

  const handleSend = () => {
    onSend({
      documentHtml: generateCompleteHTML(),
      logoBase64,
      rawHtml: htmlContent,
    });
  };

  const resetDocument = () => {
    setHtmlContent(DEFAULT_BUDGET_HTML);
    toast.success('Documento restaurado ao padrão');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editor de Orçamento</h1>
            <p className="text-sm text-gray-500 mt-1">Editor WYSIWYG - O que você vê é o que você envia</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingLogo}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              {loadingLogo ? 'Carregando...' : 'Logo'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              onClick={resetDocument}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Restaurar
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-sm text-gray-900">Editor</h2>
            </div>
            <div style={{ height: '800px' }} className="overflow-hidden">
              <ReactQuill
                value={htmlContent}
                onChange={setHtmlContent}
                modules={QUILL_MODULES}
                theme="snow"
                style={{ height: '100%' }}
              />
            </div>
          </div>

          {/* Preview - Usa o mesmo HTML do editor */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-sm text-gray-900">Prévia (PDF)</h2>
            </div>
            <div
              ref={previewRef}
              className="p-8 overflow-auto"
              style={{ height: '800px', backgroundColor: '#fff' }}
              dangerouslySetInnerHTML={{ __html: generateCompleteHTML() }}
            />
          </div>
        </div>
      </div>

      {/* Rodapé com Ações */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
        <div className="max-w-7xl mx-auto flex gap-3 justify-end">
          <Button onClick={exportPDF} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
          <Button onClick={handleSave} variant="outline" className="gap-2">
            Salvar Orçamento
          </Button>
          <Button onClick={handleSend} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Mail className="w-4 h-4" /> Enviar por Email
          </Button>
        </div>
      </div>

      {/* CSS para Quill e Preview */}
      <style>{`
        .ql-toolbar.ql-snow {
          border-left: none !important;
          border-right: none !important;
          border-top: none !important;
        }
        .ql-container.ql-snow {
          border: none !important;
        }
        .ql-editor {
          font-family: Arial, sans-serif;
          line-height: 1.6;
        }
        /* Alinhamento - Quill classes */
        .ql-align-center { text-align: center !important; }
        .ql-align-right { text-align: right !important; }
        .ql-align-justify { text-align: justify !important; }
        /* Garantir que styles inline também funcionem na preview */
        [style*="text-align"] { text-align: inherit; }
      `}</style>
    </div>
  );
}