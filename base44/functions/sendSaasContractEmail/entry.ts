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

    if (!pdfBase64) {
      return Response.json({ error: 'PDF is required' }, { status: 400 });
    }

    try {
      // Converter base64 para blob
      const binaryString = atob(pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      
      // Upload para storage privado (seguro e fidedigno)
      const uploadResponse = await base44.integrations.Core.UploadPrivateFile({
        file: blob
      });
      
      if (!uploadResponse.file_uri) {
        throw new Error('Failed to upload private file');
      }

      // Criar link assinado com validade de 30 dias
      const signedUrlResponse = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: uploadResponse.file_uri,
        expires_in: 2592000 // 30 dias em segundos
      });

      if (!signedUrlResponse.signed_url) {
        throw new Error('Failed to create signed URL');
      }

      // Enviar email com link assinado fidedigno
      const timestamp = new Date().toLocaleDateString('pt-BR');
      const emailBody = `
Prezado(a) ${contractorName},

Conforme solicitado, segue o link para download da cópia do Contrato de Assinatura SaaS — PRUMO HUB assinado eletronicamente em ${timestamp}:

${signedUrlResponse.signed_url}

Este documento constitui prova válida do seu aceite aos termos e condições da plataforma PRUMO HUB. O link permanecerá ativo por 30 dias.

Guarde esta cópia com segurança. Caso tenha dúvidas, entre em contato conosco através do suporte.

Atenciosamente,
PRUMO HUB — Santa Rute Engenharia LTDA
https://hub.prumo.site
      `.trim();

      await base44.integrations.Core.SendEmail({
        to: contractorEmail,
        subject: 'Cópia do Contrato SaaS PRUMO HUB - Link Assinado',
        body: emailBody,
        from_name: 'PRUMO HUB'
      });
    } catch (uploadError) {
      console.error('Erro ao fazer upload do PDF ou enviar email:', uploadError);
      return Response.json({ error: 'Failed to process contract PDF: ' + uploadError.message }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Email enviado com sucesso' });
  } catch (error) {
    console.error('Erro na função:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});