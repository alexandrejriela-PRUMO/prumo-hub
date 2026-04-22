import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';

// Lazy load ReactQuill to avoid duplicate React instance issue
const ReactQuill = lazy(() => import('react-quill'));
import { Button } from '@/components/ui/button';
import { Download, Mail, Image as ImageIcon, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function buildBudgetHtml(budgetData, consultorData) {
  const b = budgetData || {};
  const c = consultorData || {};
  const services = Array.isArray(b.services) ? b.services : [];
  const fees = Array.isArray(b.additional_fees) ? b.additional_fees : [];
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const blank = '___________________________';

  const clientName = b.client_name || blank;
  const clientEmail = b.client_email || '';
  const budgetNumber = b.budget_number || `ORC-${Date.now().toString().slice(-8)}`;
  const title = b.title || 'Orçamento de Serviços';
  const validityDays = b.validity_days || 30;
  const discount = parseFloat(b.discount_percentage) || 0;
  const travelCost = parseFloat(b.travel_cost) || 0;
  const fuelCost = parseFloat(b.fuel_cost) || 0;
  const notes = b.notes || '';

  // Dados do consultor (prestador)
  const consultorName = c.full_name || blank;
  const consultorEmail = c.email || blank;

  const servicesTotal = services.reduce((acc, s) => acc + (parseFloat(s.hours) * parseFloat(s.hourly_rate)), 0);
  const feesTotal = fees.reduce((acc, f) => acc + parseFloat(f.amount), 0);
  const subtotal = servicesTotal + travelCost + fuelCost + feesTotal;
  const discountValue = subtotal * (discount / 100);
  const total = subtotal - discountValue;

  const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const servicesRows = services.length > 0
    ? services.map(s => {
        const subtotalSvc = parseFloat(s.hours) * parseFloat(s.hourly_rate);
        return `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 8px;">${s.name}${s.description ? '<br><span style="font-size:12px;color:#666;">' + s.description + '</span>' : ''}</td>
          <td style="text-align:center; padding: 10px 8px;">${s.hours}h</td>
          <td style="text-align:right; padding: 10px 8px;">R$ ${fmt(s.hourly_rate)}/h</td>
          <td style="text-align:right; padding: 10px 8px; font-weight:500;">R$ ${fmt(subtotalSvc)}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="4" style="padding:10px;color:#999;text-align:center;">Nenhum serviço informado</td></tr>`;

  const extraRows = [
    travelCost > 0 ? `<tr><td colspan="3" style="padding:6px 8px;color:#555;">Deslocamento</td><td style="text-align:right;padding:6px 8px;">R$ ${fmt(travelCost)}</td></tr>` : '',
    fuelCost > 0 ? `<tr><td colspan="3" style="padding:6px 8px;color:#555;">Combustível</td><td style="text-align:right;padding:6px 8px;">R$ ${fmt(fuelCost)}</td></tr>` : '',
    ...fees.map(f => `<tr><td colspan="3" style="padding:6px 8px;color:#555;">${f.name}</td><td style="text-align:right;padding:6px 8px;">R$ ${fmt(f.amount)}</td></tr>`),
  ].join('');

  const discountRow = discount > 0
    ? `<tr><td colspan="3" style="padding:6px 8px;color:#dc2626;">Desconto (${discount}%)</td><td style="text-align:right;padding:6px 8px;color:#dc2626;">- R$ ${fmt(discountValue)}</td></tr>`
    : '';

  return `<div style="font-family: Calibri, Arial, sans-serif; line-height: 1.8; color: #333; max-width: 794px; margin: 0 auto;">
  <div style="text-align:center; margin-bottom:40px; padding-bottom:20px; border-bottom:3px solid #1B4332;">
    <h1 style="color:#1B4332; margin:0; font-size:28px; font-weight:bold;">ORÇAMENTO</h1>
    <p style="margin:6px 0 0 0; color:#666; font-size:14px;">${title}</p>
    <p style="margin:4px 0 0 0; color:#888; font-size:13px;">Nº ${budgetNumber} &nbsp;|&nbsp; Emitido em: ${dataHoje} &nbsp;|&nbsp; Válido por ${validityDays} dias</p>
  </div>

  <div style="margin-bottom:28px;">
    <h2 style="color:#1B4332; font-size:15px; margin:0 0 8px 0; text-transform:uppercase; letter-spacing:1px;">Cliente</h2>
    <p style="margin:4px 0; font-size:15px;"><strong>${clientName}</strong></p>
    ${clientEmail ? `<p style="margin:4px 0; font-size:13px; color:#555;">Email: ${clientEmail}</p>` : ''}
  </div>

  <div style="margin-bottom:28px;">
    <h2 style="color:#1B4332; font-size:15px; margin:0 0 10px 0; text-transform:uppercase; letter-spacing:1px;">Serviços</h2>
    <table style="width:100%; border-collapse:collapse; font-size:14px;">
      <thead>
        <tr style="background:#1B4332; color:#fff;">
          <th style="text-align:left; padding:10px 8px;">Descrição</th>
          <th style="text-align:center; padding:10px 8px; width:80px;">Horas</th>
          <th style="text-align:right; padding:10px 8px; width:120px;">Valor/Hora</th>
          <th style="text-align:right; padding:10px 8px; width:120px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${servicesRows}
        ${extraRows}
        ${discountRow}
      </tbody>
    </table>
  </div>

  <div style="margin-bottom:30px; text-align:right;">
    <p style="margin:8px 0; font-size:14px; color:#555;"><strong>Subtotal:</strong> R$ ${fmt(subtotal)}</p>
    ${discount > 0 ? `<p style="margin:8px 0; font-size:14px; color:#dc2626;"><strong>Desconto (${discount}%):</strong> - R$ ${fmt(discountValue)}</p>` : ''}
    <p style="margin:12px 0 0 0; font-size:20px; font-weight:bold; color:#1B4332; border-top:2px solid #1B4332; padding-top:12px;">TOTAL: R$ ${fmt(total)}</p>
  </div>

  ${notes ? `<div style="margin-bottom:28px; padding:16px; background:#f9fafb; border-left:4px solid #1B4332; border-radius:4px; font-size:13px;">
    <strong>Observações:</strong><br>${notes}
  </div>` : ''}

  <div style="margin-top:60px; padding-top:20px; border-top:1px solid #ccc; font-size:12px; color:#888; text-align:center;">
    <p>Este orçamento é válido por ${validityDays} dias a partir da data de emissão.</p>
    <p style="margin-top:8px;">Em caso de dúvidas, entre em contato pelo email: <strong>${consultorEmail}</strong></p>
  </div>

  <table style="margin-top:60px; width:100%; border-collapse:collapse;">
    <tr>
      <td style="width:50%; text-align:center; padding-right:20px;">
        <div style="border-top:1px solid #000; padding-top:16px; margin-bottom:5px;"></div>
        <p style="margin:0; font-size:13px;"><strong>${consultorName}</strong></p>
        <p style="margin:4px 0 0 0; font-size:12px; color:#666;">Prestador de Serviço</p>
        <p style="margin:4px 0 0 0; font-size:12px; color:#666;">Data: ___/___/_______</p>
      </td>
      <td style="width:50%; text-align:center; padding-left:20px;">
        <div style="border-top:1px solid #000; padding-top:16px; margin-bottom:5px;"></div>
        <p style="margin:0; font-size:13px;"><strong>${clientName}</strong></p>
        <p style="margin:4px 0 0 0; font-size:12px; color:#666;">Contratante</p>
        <p style="margin:4px 0 0 0; font-size:12px; color:#666;">Data: ___/___/_______</p>
      </td>
    </tr>
  </table>
</div>`;
}

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

export default function BudgetEditorWYSIWYG({ budgetData = {}, consultorData = null, onSave, onSend }) {
  const [htmlContent, setHtmlContent] = useState(() => buildBudgetHtml(budgetData, consultorData));
  const [logoBase64, setLogoBase64] = useState('');
  const [loadingLogo, setLoadingLogo] = useState(false);
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    // Load quill CSS dynamically
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/react-quill@2.0.0/dist/quill.snow.css';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

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
    setHtmlContent(buildBudgetHtml(budgetData, consultorData));
    toast.success('Documento regenerado com os dados do formulário');
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
              Regenerar do Formulário
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
              <Suspense fallback={<div className="p-4 text-gray-400 text-sm">Carregando editor...</div>}>
                <ReactQuill
                  value={htmlContent}
                  onChange={setHtmlContent}
                  modules={QUILL_MODULES}
                  theme="snow"
                  style={{ height: '100%' }}
                />
              </Suspense>
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