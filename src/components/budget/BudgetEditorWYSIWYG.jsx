import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { Button } from '@/components/ui/button';
import { Download, Mail, Image as ImageIcon, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import SendEmailModal from '@/components/shared/SendEmailModal';

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
  const title = b.title || 'Orçamento de Serviços Ambientais';
  const validityDays = b.validity_days || 30;
  const discount = parseFloat(b.discount_percentage) || 0;
  const travelCost = parseFloat(b.travel_cost) || 0;
  const fuelCost = parseFloat(b.fuel_cost) || 0;
  const notes = b.notes || '';

  const consultorName = c.full_name || blank;
  const consultorEmail = c.email || blank;

  const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const servicesTotal = services.reduce((acc, s) => acc + ((parseFloat(s.hours) || 0) * (parseFloat(s.hourly_rate) || 0)), 0);
  const feesTotal = fees.reduce((acc, f) => acc + (parseFloat(f.amount) || 0), 0);
  const subtotal = servicesTotal + travelCost + fuelCost + feesTotal;
  const discountValue = subtotal * (discount / 100);
  const total = subtotal - discountValue;

  // Linhas dos serviços — layout limpo, sem texto grudado
  const servicesRows = services.length > 0
    ? services.map((s, idx) => {
        const hrs = parseFloat(s.hours) || 0;
        const rate = parseFloat(s.hourly_rate) || 0;
        const subtotalSvc = hrs * rate;
        const bg = idx % 2 === 0 ? '#f9fafb' : '#ffffff';
        return `
        <tr style="background:${bg}; border-bottom:1px solid #e5e7eb;">
          <td style="padding:12px 14px; font-size:13px; color:#111827;">
            <strong style="display:block; margin-bottom:2px;">${s.name || 'Serviço'}</strong>
            ${s.description ? `<span style="font-size:12px; color:#6b7280; line-height:1.5;">${s.description}</span>` : ''}
          </td>
          <td style="text-align:center; padding:12px 10px; font-size:13px; color:#374151; white-space:nowrap;">${hrs > 0 ? hrs + 'h' : '—'}</td>
          <td style="text-align:right; padding:12px 10px; font-size:13px; color:#374151; white-space:nowrap;">${rate > 0 ? 'R$ ' + fmt(rate) + '/h' : '—'}</td>
          <td style="text-align:right; padding:12px 14px; font-size:13px; font-weight:700; color:#1B4332; white-space:nowrap;">R$ ${fmt(subtotalSvc)}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="4" style="padding:16px; color:#9ca3af; text-align:center; font-style:italic;">Nenhum serviço informado</td></tr>`;

  // Linhas de custos extras (separadas com destaque visual diferente)
  const extraLines = [];
  if (travelCost > 0) extraLines.push({ label: 'Deslocamento', value: travelCost });
  if (fuelCost > 0) extraLines.push({ label: 'Combustível', value: fuelCost });
  fees.forEach(f => { if (parseFloat(f.amount) > 0) extraLines.push({ label: f.name, value: parseFloat(f.amount) }); });

  const extraRows = extraLines.map(ex => `
    <tr style="background:#fffbeb; border-bottom:1px solid #fde68a;">
      <td colspan="3" style="padding:10px 14px; font-size:13px; color:#92400e;">${ex.label}</td>
      <td style="text-align:right; padding:10px 14px; font-size:13px; font-weight:600; color:#92400e; white-space:nowrap;">R$ ${fmt(ex.value)}</td>
    </tr>`).join('');

  const discountRow = discount > 0 ? `
    <tr style="background:#fef2f2; border-bottom:1px solid #fecaca;">
      <td colspan="3" style="padding:10px 14px; font-size:13px; color:#dc2626; font-weight:600;">Desconto (${discount}%)</td>
      <td style="text-align:right; padding:10px 14px; font-size:13px; font-weight:700; color:#dc2626; white-space:nowrap;">- R$ ${fmt(discountValue)}</td>
    </tr>` : '';

  return `<div style="font-family: 'Segoe UI', Calibri, Arial, sans-serif; color:#1f2937; max-width:794px; margin:0 auto; line-height:1.6;">

  <!-- CABEÇALHO -->
  <div style="background:linear-gradient(135deg,#064e3b 0%,#1B4332 100%); color:#fff; padding:36px 40px 28px; margin-bottom:0;">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
      <div>
        <p style="margin:0 0 4px 0; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#6ee7b7; font-weight:600;">PRUMO HUB</p>
        <h1 style="margin:0; font-size:30px; font-weight:800; letter-spacing:-0.5px;">ORÇAMENTO</h1>
        <p style="margin:6px 0 0 0; font-size:14px; color:#a7f3d0;">${title}</p>
      </div>
      <div style="text-align:right; font-size:12px; color:#d1fae5; line-height:2;">
        <div><strong style="color:#fff;">Nº ${budgetNumber}</strong></div>
        <div>Emitido em: ${dataHoje}</div>
        <div>Válido por: <strong style="color:#fde68a;">${validityDays} dias</strong></div>
      </div>
    </div>
  </div>

  <!-- FAIXA VERDE CLARA -->
  <div style="background:#ecfdf5; border-left:4px solid #10b981; padding:0; margin-bottom:28px;">
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0;">
      <!-- Dados do Cliente -->
      <div style="padding:20px 24px; border-right:1px solid #d1fae5;">
        <p style="margin:0 0 8px 0; font-size:10px; text-transform:uppercase; letter-spacing:2px; font-weight:700; color:#065f46;">Cliente / Contratante</p>
        <p style="margin:0 0 4px 0; font-size:16px; font-weight:700; color:#111827;">${clientName}</p>
        ${clientEmail ? `<p style="margin:0; font-size:13px; color:#6b7280;">${clientEmail}</p>` : ''}
      </div>
      <!-- Dados do Consultor -->
      <div style="padding:20px 24px;">
        <p style="margin:0 0 8px 0; font-size:10px; text-transform:uppercase; letter-spacing:2px; font-weight:700; color:#065f46;">Prestador de Serviço</p>
        <p style="margin:0 0 4px 0; font-size:16px; font-weight:700; color:#111827;">${consultorName}</p>
        <p style="margin:0; font-size:13px; color:#6b7280;">${consultorEmail}</p>
      </div>
    </div>
  </div>

  <!-- TABELA DE SERVIÇOS -->
  <div style="margin-bottom:28px;">
    <p style="margin:0 0 12px 0; font-size:11px; text-transform:uppercase; letter-spacing:2px; font-weight:700; color:#064e3b; padding:0 4px;">Serviços Contratados</p>
    <table style="width:100%; border-collapse:collapse; font-size:13px; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <thead>
        <tr style="background:#1B4332; color:#fff;">
          <th style="text-align:left; padding:12px 14px; font-weight:600; font-size:12px; letter-spacing:0.5px;">Descrição do Serviço</th>
          <th style="text-align:center; padding:12px 10px; font-weight:600; font-size:12px; width:80px;">Horas</th>
          <th style="text-align:right; padding:12px 10px; font-weight:600; font-size:12px; width:130px;">Valor/Hora</th>
          <th style="text-align:right; padding:12px 14px; font-weight:600; font-size:12px; width:130px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${servicesRows}
        ${extraRows}
        ${discountRow}
      </tbody>
    </table>
  </div>

  <!-- TOTALIZADOR -->
  <div style="display:flex; justify-content:flex-end; margin-bottom:32px;">
    <div style="min-width:280px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden;">
      <div style="padding:12px 20px; display:flex; justify-content:space-between; border-bottom:1px solid #e5e7eb;">
        <span style="font-size:13px; color:#6b7280;">Subtotal dos Serviços</span>
        <span style="font-size:13px; font-weight:600; color:#374151;">R$ ${fmt(servicesTotal)}</span>
      </div>
      ${extraLines.length > 0 ? `<div style="padding:12px 20px; display:flex; justify-content:space-between; border-bottom:1px solid #e5e7eb;">
        <span style="font-size:13px; color:#6b7280;">Custos Adicionais</span>
        <span style="font-size:13px; font-weight:600; color:#374151;">R$ ${fmt(travelCost + fuelCost + feesTotal)}</span>
      </div>` : ''}
      ${discount > 0 ? `<div style="padding:12px 20px; display:flex; justify-content:space-between; border-bottom:1px solid #e5e7eb;">
        <span style="font-size:13px; color:#dc2626;">Desconto (${discount}%)</span>
        <span style="font-size:13px; font-weight:600; color:#dc2626;">- R$ ${fmt(discountValue)}</span>
      </div>` : ''}
      <div style="padding:16px 20px; display:flex; justify-content:space-between; background:#064e3b;">
        <span style="font-size:15px; font-weight:700; color:#fff;">TOTAL</span>
        <span style="font-size:18px; font-weight:800; color:#fde68a;">R$ ${fmt(total)}</span>
      </div>
    </div>
  </div>

  ${notes ? `<!-- OBSERVAÇÕES -->
  <div style="margin-bottom:28px; padding:16px 20px; background:#fffbeb; border:1px solid #fde68a; border-left:4px solid #f59e0b; border-radius:8px;">
    <p style="margin:0 0 8px 0; font-size:11px; text-transform:uppercase; font-weight:700; color:#92400e; letter-spacing:1px;">Observações</p>
    <p style="margin:0; font-size:13px; color:#78350f; line-height:1.7;">${notes}</p>
  </div>` : ''}

  <!-- RODAPÉ DE VALIDADE -->
  <div style="margin-bottom:40px; padding:14px 20px; background:#f0fdf4; border-radius:8px; text-align:center;">
    <p style="margin:0; font-size:13px; color:#065f46;">
      Este orçamento é válido por <strong>${validityDays} dias</strong> a partir da data de emissão (${dataHoje}).
      Em caso de dúvidas, entre em contato pelo email: <strong>${consultorEmail}</strong>
    </p>
  </div>

  <!-- ASSINATURAS -->
  <table style="width:100%; border-collapse:collapse; margin-top:20px;">
    <tr>
      <td style="width:48%; text-align:center; padding:0 16px 0 0;">
        <div style="border-top:2px solid #1B4332; padding-top:14px;">
          <p style="margin:0 0 2px 0; font-size:14px; font-weight:700; color:#111827;">${consultorName}</p>
          <p style="margin:0; font-size:12px; color:#6b7280;">Prestador de Serviço &nbsp;|&nbsp; Data: ___/___/_______</p>
        </div>
      </td>
      <td style="width:4%;"></td>
      <td style="width:48%; text-align:center; padding:0 0 0 16px;">
        <div style="border-top:2px solid #1B4332; padding-top:14px;">
          <p style="margin:0 0 2px 0; font-size:14px; font-weight:700; color:#111827;">${clientName}</p>
          <p style="margin:0; font-size:12px; color:#6b7280;">Contratante &nbsp;|&nbsp; Data: ___/___/_______</p>
        </div>
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
  const [htmlContent, setHtmlContent] = useState(() => budgetData.document_html || buildBudgetHtml(budgetData, consultorData));
  const [logoBase64, setLogoBase64] = useState('');
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
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

   const exportDocx = async () => {
     try {
       const htmlContent = generateCompleteHTML();
       const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

       const doc = new Document({
         sections: [{
           properties: {},
           children: [
             new Paragraph({
               text: 'ORÇAMENTO',
               bold: true,
               size: 28 * 2,
               spacing: { line: 360, before: 200, after: 200 },
             }),
             new Paragraph({
               text: textContent,
               spacing: { line: 280 },
             }),
           ],
         }],
       });

       const blob = await Packer.toBlob(doc);
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `orcamento-${budgetData.budget_number || 'novo'}.docx`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);

       toast.success('Orçamento exportado em DOCX com sucesso!');
     } catch (error) {
       toast.error('Erro ao exportar DOCX');
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

  const handleSendEmail = async ({ to, subject, message }) => {
    setIsSendingEmail(true);
    try {
      // Sempre salva antes de enviar para garantir que o backend tem o HTML mais recente
      toast.info('Salvando orçamento antes de enviar...');
      const saved = await onSave({
        documentHtml: generateCompleteHTML(),
        logoBase64,
        rawHtml: htmlContent,
        returnSaved: true,
      });
      const budgetId = saved?.id;

      if (!budgetId) {
        toast.error('Não foi possível salvar o orçamento. Tente salvar manualmente primeiro.');
        return;
      }

      // Não envia document_html no payload — o backend usa o que está salvo no banco
      const response = await base44.functions.invoke('sendBudgetEmail', {
        budget_id: budgetId,
        to,
        subject,
        message,
      });

      if (response.data?.error) throw new Error(response.data.error);

      toast.success('E-mail enviado com sucesso!');
      setShowEmailModal(false);
      if (onSend) onSend({ documentHtml: generateCompleteHTML(), logoBase64, rawHtml: htmlContent });
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      toast.error('Erro ao enviar e-mail: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsSendingEmail(false);
    }
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
            <Button onClick={exportDocx} variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> Download DOCX
            </Button>
            <Button onClick={handleSave} variant="outline" className="gap-2">
            Salvar Orçamento
          </Button>
          <Button onClick={() => setShowEmailModal(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Mail className="w-4 h-4" /> Enviar por E-mail
          </Button>
        </div>
      </div>

      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSend={handleSendEmail}
        isSending={isSendingEmail}
        defaultTo={budgetData?.client_email || ''}
        defaultSubject={`Orçamento ${budgetData?.budget_number || ''} - ${budgetData?.title || 'Serviços'}`}
        defaultMessage={`Prezado(a) ${budgetData?.client_name || 'Cliente'},\n\nSegue em anexo o orçamento referente aos serviços solicitados.\n\nQualquer dúvida, estou à disposição.\n\nAtenciosamente,\n${consultorData?.full_name || ''}`}
        documentLabel={`Orçamento Nº ${budgetData?.budget_number || ''}`}
      />

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