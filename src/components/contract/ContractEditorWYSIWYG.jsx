import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, Save, Mail, Copy, ZoomIn, ZoomOut, Image as ImageIcon, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import SendEmailModal from '@/components/shared/SendEmailModal';

const ReactQuill = lazy(() => import('react-quill'));

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

function buildContractHtml(contractData) {
  const c = contractData || {};
  const parties = Array.isArray(c.parties) ? c.parties : [];
  const contratanteParty = parties.find(p => p.role === 'Contratante') || {};
  const contratadoParty = parties.find(p => p.role === 'Contratado') || {};
  const blank = '___________________________';
  const blankDate = '___/___/______';

  const tipoContrato = (c.contract_type || 'SERVIÇOS').toUpperCase();
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const nomeContratante = contratanteParty.name || c.client_name || blank;
  const docContratante = contratanteParty.document || blank;
  const endContratante = contratanteParty.address || blank;
  const emailContratante = c.client_email ? '<p style="margin: 8px 0;"><strong>E-mail:</strong> ' + c.client_email + '</p>' : '';
  const nomeContratada = contratadoParty.name || blank;
  const docContratada = contratadoParty.document || blank;
  const endContratada = contratadoParty.address || blank;
  const objeto = c.object || 'Descrição dos serviços ou acordo aqui.';
  const inicio = c.start_date || blankDate;
  const termino = c.end_date || blankDate;
  const valor = c.total_value ? Number(c.total_value).toFixed(2) : '0,00';
  const pagamento = c.payment_terms || 'Especificar condições';
  const notas = c.notes || 'Especificar termos e condições adicionais.';
  const nomeContratanteAssinatura = contratanteParty.name || 'Contratante';
  const nomeContratadaAssinatura = contratadoParty.name || 'Contratada';

  return '<div style="font-family: Calibri, Arial, sans-serif; line-height: 1.8; color: #333;">'
    + '<div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #1B4332;">'
    + '<h1 style="color: #1B4332; margin: 0; font-size: 28px; font-weight: bold;">CONTRATO DE ' + tipoContrato + '</h1>'
    + '<p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Data: ' + dataHoje + '</p>'
    + '</div>'
    + '<div style="margin-bottom: 30px;">'
    + '<h2 style="color: #1B4332; font-size: 16px; margin-top: 0;">1. CONTRATANTE</h2>'
    + '<p style="margin: 8px 0;"><strong>Razão Social/Nome:</strong> ' + nomeContratante + '</p>'
    + '<p style="margin: 8px 0;"><strong>CNPJ/CPF:</strong> ' + docContratante + '</p>'
    + '<p style="margin: 8px 0;"><strong>Endereço:</strong> ' + endContratante + '</p>'
    + emailContratante
    + '</div>'
    + '<div style="margin-bottom: 30px;">'
    + '<h2 style="color: #1B4332; font-size: 16px; margin-top: 0;">2. CONTRATADA</h2>'
    + '<p style="margin: 8px 0;"><strong>Razão Social/Nome:</strong> ' + nomeContratada + '</p>'
    + '<p style="margin: 8px 0;"><strong>CNPJ/CPF:</strong> ' + docContratada + '</p>'
    + '<p style="margin: 8px 0;"><strong>Endereço:</strong> ' + endContratada + '</p>'
    + '</div>'
    + '<div style="margin-bottom: 30px;">'
    + '<h2 style="color: #1B4332; font-size: 16px; margin-top: 0;">3. OBJETO DO CONTRATO</h2>'
    + '<p>' + objeto + '</p>'
    + '</div>'
    + '<div style="margin-bottom: 30px;">'
    + '<h2 style="color: #1B4332; font-size: 16px; margin-top: 0;">4. VIGÊNCIA</h2>'
    + '<p style="margin: 8px 0;"><strong>Início:</strong> ' + inicio + '</p>'
    + '<p style="margin: 8px 0;"><strong>Término:</strong> ' + termino + '</p>'
    + '</div>'
    + '<div style="margin-bottom: 30px;">'
    + '<h2 style="color: #1B4332; font-size: 16px; margin-top: 0;">5. VALOR E CONDIÇÕES DE PAGAMENTO</h2>'
    + '<p style="margin: 8px 0;"><strong>Valor Total:</strong> R$ ' + valor + '</p>'
    + '<p style="margin: 8px 0;"><strong>Condições de Pagamento:</strong> ' + pagamento + '</p>'
    + '</div>'
    + '<div style="margin-bottom: 30px;">'
    + '<h2 style="color: #1B4332; font-size: 16px; margin-top: 0;">6. TERMOS E CONDIÇÕES</h2>'
    + '<p>' + notas + '</p>'
    + '</div>'
    + '<div style="margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">'
    + '<div style="text-align: center;">'
    + '<div style="border-top: 1px solid #000; padding-top: 20px; margin-bottom: 5px;"></div>'
    + '<p style="margin: 0; font-size: 13px;"><strong>' + nomeContratanteAssinatura + '</strong></p>'
    + '<p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Data: ___/___/_______</p>'
    + '</div>'
    + '<div style="text-align: center;">'
    + '<div style="border-top: 1px solid #000; padding-top: 20px; margin-bottom: 5px;"></div>'
    + '<p style="margin: 0; font-size: 13px;"><strong>' + nomeContratadaAssinatura + '</strong></p>'
    + '<p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Data: ___/___/_______</p>'
    + '</div>'
    + '</div>'
    + '</div>';
}

export default function ContractEditorWYSIWYG({ 
  contractData, 
  templates = [], 
  onSave, 
  onSendToSign,
  onSaveTemplate 
}) {
  const [documentHtml, setDocumentHtml] = useState(() => contractData?.document_html || buildContractHtml(contractData));
  const [selectedTemplate, setSelectedTemplate] = useState(contractData?.template_id || '');
  const [templateName, setTemplateName] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [logoBase64, setLogoBase64] = useState('');
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const fileInputRef = useRef(null);

  // Inject quill CSS dynamically to avoid duplicate React instance from direct CSS import
  useEffect(() => {
    if (!document.getElementById('quill-css-contract')) {
      const link = document.createElement('link');
      link.id = 'quill-css-contract';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (!documentHtml && selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setDocumentHtml(template.html_template);
      }
    }
  }, [selectedTemplate, templates]);

  const generateDefaultContract = () => {
    setDocumentHtml(buildContractHtml(contractData));
  };



  const buildPdfFromHtml = async (htmlContent) => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;padding:40px;background:#fff;font-family:Calibri,Arial,sans-serif;line-height:1.8;color:#333;';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#fff', useCORS: true });
    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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
    return pdf;
  };

  const exportPDF = async () => {
    try {
      const pdf = await buildPdfFromHtml(generateCompleteHTML());
      pdf.save(`contrato-${Date.now()}.pdf`);
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

  const handleSendEmail = async ({ to, subject, message }) => {
    setIsSendingEmail(true);
    try {
      toast.info('Gerando PDF...');
      const pdf = await buildPdfFromHtml(generateCompleteHTML());
      const blob = pdf.output('blob');
      const fileName = `contrato-${contractData?.id || contractData?.client_name?.replace(/\s+/g,'-') || Date.now()}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      if (contractData?.id) {
        // Contrato já salvo: usa backend function (também atualiza status)
        await base44.functions.invoke('sendContractEmail', {
          contract_id: contractData.id,
          to,
          subject,
          message,
          pdf_url: file_url,
        });
      } else {
        // Contrato ainda não salvo: envia diretamente via SendEmail
        const customMessage = (message || '').replace(/\n/g, '<br>');
        const pdfLink = `<div style="margin:24px 0;text-align:center;"><a href="${file_url}" target="_blank" style="display:inline-block;background:#1B4332;color:#fff;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;">📄 Visualizar / Baixar Contrato (PDF)</a></div>`;
        await base44.integrations.Core.SendEmail({
          to,
          subject,
          body: `<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#1B4332;">${subject}</h2>
            <p>${customMessage}</p>
            ${pdfLink}
          </body></html>`,
        });
      }

      toast.success('E-mail enviado com sucesso!');
      setShowEmailModal(false);
    } catch (error) {
      toast.error('Erro ao enviar e-mail: ' + error.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

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

  const generateCompleteHTML = () => {
    let finalHTML = documentHtml;
    
    if (logoBase64) {
      const logoHTML = `<img src="${logoBase64}" style="max-height: 80px; margin-bottom: 20px;" alt="Logo Empresa">`;
      finalHTML = logoHTML + finalHTML;
    }

    return finalHTML;
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
            onClick={() => fileInputRef.current?.click()}
            disabled={loadingLogo}
            size="sm"
            variant="outline"
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
          <Suspense fallback={<div className="h-[500px] flex items-center justify-center text-gray-400">Carregando editor...</div>}>
            <ReactQuill
              value={documentHtml}
              onChange={setDocumentHtml}
              modules={modules}
              theme="snow"
              style={{ height: '500px', marginBottom: '40px' }}
            />
          </Suspense>
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
            dangerouslySetInnerHTML={{ __html: generateCompleteHTML() }}
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
          onClick={async () => {
            toast.info('Gerando PDF...');
            let pdfUrl = null;
            try {
              const pdf = await buildPdfFromHtml(generateCompleteHTML());
              const blob = pdf.output('blob');
              const file = new File([blob], `contrato-${Date.now()}.pdf`, { type: 'application/pdf' });
              const result = await base44.integrations.Core.UploadFile({ file });
              pdfUrl = result.file_url;
            } catch (e) {
              console.error('Erro ao gerar PDF para upload:', e);
            }
            onSave({ documentHtml: generateCompleteHTML(), selectedTemplate, pdfUrl, logoBase64 });
          }}
          variant="outline"
          className="gap-2"
        >
          <Save className="w-4 h-4" /> Salvar Contrato
        </Button>
        <Button
          onClick={() => setShowEmailModal(true)}
          variant="outline"
          className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          <Mail className="w-4 h-4" /> Enviar por E-mail
        </Button>
        <Button
          onClick={() => onSendToSign({ documentHtml: generateCompleteHTML(), selectedTemplate, logoBase64 })}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
        >
          <Mail className="w-4 h-4" /> Enviar para Assinatura
        </Button>
      </div>

      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSend={handleSendEmail}
        isSending={isSendingEmail}
        defaultTo={contractData?.client_email || ''}
        defaultSubject={`Contrato - ${contractData?.contract_type || 'Serviços'} | ${contractData?.client_name || ''}`}
        defaultMessage={`Prezado(a) ${contractData?.client_name || 'Cliente'},\n\nSegue em anexo o contrato para sua apreciação.\n\nQualquer dúvida, estou à disposição.\n\nAtenciosamente.`}
        documentLabel={`${contractData?.contract_type || 'Contrato'} — ${contractData?.client_name || ''}`}
      />
    </div>
  );
}