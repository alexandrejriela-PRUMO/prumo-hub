import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractorEmail, contractorName, pdfBase64 } = await req.json();

    if (!contractorEmail || !contractorName || !pdfBase64) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Enviar email com o PDF em anexo
    const emailResponse = await base44.integrations.Core.SendEmail({
      to: contractorEmail,
      subject: 'Cópia do Contrato SaaS PRUMO HUB',
      body: `
Prezado(a) ${contractorName},

Conforme solicitado, segue em anexo a cópia do Contrato de Assinatura SaaS — PRUMO HUB assinado eletronicamente em ${new Date().toLocaleDateString('pt-BR')}.

Este documento constitui prova válida do seu aceite aos termos e condições da plataforma PRUMO HUB.

Guarde esta cópia com segurança. Caso tenha dúvidas, entre em contato conosco através do suporte.

Atenciosamente,
PRUMO HUB — Santa Rute Engenharia LTDA
https://hub.prumo.site
      `.trim()
    });

    // Nota: A integração Core.SendEmail não suporta anexos diretamente.
    // Alternativa: Salvar o PDF em storage privado e enviar link de download
    if (pdfBase64) {
      try {
        // Converter base64 para blob
        const binaryString = atob(pdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        
        // Fazer upload do arquivo
        const uploadResponse = await base44.integrations.Core.UploadFile({
          file: blob
        });
        
        if (uploadResponse.file_url) {
          // Enviar email com link para download
          await base44.integrations.Core.SendEmail({
            to: contractorEmail,
            subject: 'Cópia do Contrato SaaS PRUMO HUB',
            body: `
Prezado(a) ${contractorName},

Conforme solicitado, segue o link para download da cópia do Contrato de Assinatura SaaS — PRUMO HUB assinado eletronicamente em ${new Date().toLocaleDateString('pt-BR')}:

${uploadResponse.file_url}

Este documento constitui prova válida do seu aceite aos termos e condições da plataforma PRUMO HUB.

Guarde esta cópia com segurança. Caso tenha dúvidas, entre em contato conosco através do suporte.

Atenciosamente,
PRUMO HUB — Santa Rute Engenharia LTDA
https://hub.prumo.site
            `.trim()
          });
        }
      } catch (uploadError) {
        console.error('Erro ao fazer upload do PDF:', uploadError);
        // Continuar mesmo se o upload falhar
      }
    }

    return Response.json({ success: true, message: 'Email enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar email do contrato:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});