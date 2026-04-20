import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { logId } = await req.json();

    if (!logId) {
      return Response.json({ error: 'logId is required' }, { status: 400 });
    }

    // Buscar log de aceite do contrato
    const logs = await base44.entities.TermsAcceptanceLog.list();
    const log = logs.find(l => l.id === logId);

    if (!log) {
      return Response.json({ error: 'Log not found' }, { status: 404 });
    }

    // Buscar conteúdo do contrato SaaS
    const contractTerms = await base44.entities.TermsOfUse.filter({ is_active: true }, '-version', 1);
    const contractContent = contractTerms && contractTerms.length > 0 ? contractTerms[0].content : '';
    
    // Gerar HTML do PDF com dados do contrato
    const acceptedDate = log.accepted_at ? new Date(log.accepted_at).toLocaleDateString('pt-BR') : '—';
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Contrato SaaS PRUMO HUB</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    .page-break { page-break-after: always; margin: 40px 0; }
    .header { text-align: center; border-bottom: 3px solid #1b4332; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #1b4332; margin: 0 0 5px 0; font-size: 20px; }
    .header p { color: #666; margin: 5px 0; font-size: 12px; }
    .section { margin-bottom: 25px; }
    .section h2 { color: #1b4332; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 12px; }
    .field { margin-bottom: 10px; font-size: 12px; }
    .label { font-weight: bold; color: #1b4332; display: inline-block; min-width: 150px; }
    .badge { display: inline-block; background: #d4edda; color: #155724; padding: 5px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #666; }
    .contract-content { margin-top: 30px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; line-height: 1.5; }
    .contract-content h2 { font-size: 13px; margin: 15px 0 8px 0; }
    .contract-content h3 { font-size: 12px; margin: 12px 0 6px 0; }
    .contract-content p { margin: 5px 0; }
    .contract-content ul { margin: 8px 0; padding-left: 20px; }
    .contract-content li { margin: 3px 0; }
    .signature-block { margin-top: 40px; display: flex; justify-content: space-around; }
    .signature-line { text-align: center; width: 45%; }
    .line { border-top: 1px solid #000; margin-top: 30px; margin-bottom: 5px; }
  </style>
</head>
<body>
  <!-- COMPROVANTE DE ASSINATURA -->
  <div class="header">
    <h1>COMPROVANTE DE ASSINATURA ELETRÔNICA</h1>
    <p>Contrato de Assinatura SaaS — PRUMO HUB</p>
    <div class="badge">✓ Documento Assinado Eletronicamente</div>
  </div>

  <div class="section">
    <h2>Dados do Assinante</h2>
    <div class="field"><span class="label">Nome:</span> ${log.user_name || '—'}</div>
    <div class="field"><span class="label">E-mail:</span> ${log.user_email || '—'}</div>
  </div>

  ${log.contractor_name ? `
  <div class="section">
    <h2>Dados do Contratante</h2>
    <div class="field"><span class="label">Nome/Empresa:</span> ${log.contractor_name}</div>
    ${log.contractor_document ? `<div class="field"><span class="label">CPF/CNPJ:</span> ${log.contractor_document}</div>` : ''}
    ${log.contractor_address ? `<div class="field"><span class="label">Endereço:</span> ${log.contractor_address}</div>` : ''}
    ${log.contractor_phone ? `<div class="field"><span class="label">Telefone:</span> ${log.contractor_phone}</div>` : ''}
    ${log.contractor_email ? `<div class="field"><span class="label">E-mail Contratante:</span> ${log.contractor_email}</div>` : ''}
  </div>
  ` : ''}

  <div class="section">
    <h2>Detalhes da Assinatura</h2>
    <div class="field"><span class="label">Data de Assinatura:</span> ${acceptedDate}</div>
    <div class="field"><span class="label">Versão do Contrato:</span> 1</div>
    <div class="field"><span class="label">Tipo de Assinatura:</span> Eletrônica (Aceite Digital)</div>
    ${log.user_agent ? `<div class="field"><span class="label">Navegador:</span> ${log.user_agent.substring(0, 80)}</div>` : ''}
  </div>

  <div class="signature-block">
    <div class="signature-line">
      <p>_______________________________</p>
      <p style="font-size: 11px;">Assinante</p>
      <p style="font-size: 10px;">Data: ${acceptedDate}</p>
    </div>
    <div class="signature-line">
      <p>_______________________________</p>
      <p style="font-size: 11px;">Plataforma PRUMO HUB</p>
      <p style="font-size: 10px;">Aceite Digital</p>
    </div>
  </div>

  <!-- PAGE BREAK E CONTRATO COMPLETO -->
  <div class="page-break"></div>

  <div class="header">
    <h1>CONTRATO DE ASSINATURA SAAS</h1>
    <p>PRUMO HUB — Santa Rute Engenharia LTDA</p>
  </div>

  <div class="contract-content">
    ${contractContent || '<p>Contrato não disponível. Verifique se uma versão está ativa no sistema.</p>'}
  </div>

  <div class="footer">
    <p>
      <strong>PRUMO HUB — Santa Rute Engenharia LTDA</strong><br />
      CNPJ: 62.807.412/0001-95<br />
      Rua José Antônio Saraiva, 340 — Pindorama — Três Passos/RS — CEP 98600-000<br />
      https://hub.prumo.site
    </p>
    <p style="margin-top: 20px; color: #999; font-size: 10px;">
      Este é um documento eletrônico válido gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
    </p>
  </div>
</body>
</html>
    `.trim();

    // Converter para base64 (formato simplificado para e-mail)
    return Response.json({ 
      success: true, 
      htmlContent,
      fileName: `Comprovante_SaaS_${log.user_email}_${new Date().getTime()}.pdf`
    });
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});