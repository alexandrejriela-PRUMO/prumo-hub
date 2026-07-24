import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EVENT_LABELS = {
  licenca_vencendo: '📄 Licenças vencendo',
  condicionante_vencendo: '📋 Condicionantes de licença',
  documento_vencendo: '📁 Documentos com validade',
  novo_alerta_ambiental: '⚠️ Alertas ambientais',
  atualizacao_processo: '⚖️ Processos administrativos',
  atualizacao_prad: '🌱 PRAD',
  geo_irregular: '📍 Georreferenciamento irregular'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      property_name,
      viewer_email,
      viewer_name,
      viewer_whatsapp,
      consultor_name,
      notification_events,
      property_id
    } = body;

    if (!viewer_email || !property_name || !property_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const eventsList = (notification_events || [])
      .map((key) => EVENT_LABELS[key])
      .filter(Boolean);

    const eventsHtml = eventsList.length
      ? `<p><strong>O que você vai receber automaticamente:</strong></p><ul>${eventsList.map(e => `<li>${e}</li>`).join('')}</ul>`
      : '';

    const subject = `Você tem acesso ao PRUMO Hub — ${property_name}`;
    const htmlBody = `
      <p>Olá ${viewer_name || 'usuário'},</p>
      <p>${consultor_name || 'Seu consultor'} cadastrou você como visualizador da propriedade <strong>${property_name}</strong> no PRUMO Hub, plataforma de gestão rural e ambiental.</p>
      ${eventsHtml}
      <p>Esses alertas chegam por email e WhatsApp de forma automática, conforme configurado pelo seu consultor.</p>
      <p><strong>Você também tem acesso ao portal:</strong> <a href="https://hub.prumo.site">https://hub.prumo.site</a> para visualizar a propriedade, acompanhar status das licenças e fazer download de documentos disponibilizados pelo consultor.</p>
      <p>Qualquer dúvida, entre em contato com ${consultor_name || 'seu consultor'}.</p>
      <p>Equipe PRUMO Hub</p>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'PRUMO Hub',
      to: viewer_email,
      subject,
      body: htmlBody
    });
    console.log(`[ViewerInvite] Email enviado → ${viewer_email}`);

    if (viewer_whatsapp) {
      try {
        await fetch('https://prumohub.app.n8n.cloud/webhook/prumo-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: viewer_whatsapp,
            message: `Olá ${viewer_name || 'usuário'}! Você foi cadastrado como visualizador da propriedade ${property_name} no PRUMO Hub. Você receberá alertas automáticos por aqui. Acesse o portal: https://hub.prumo.site`
          })
        });
        console.log(`[ViewerInvite] WhatsApp enviado → ${viewer_whatsapp}`);
      } catch (e) {
        console.error('[ViewerInvite] Erro ao enviar WhatsApp para', viewer_whatsapp, ':', e.message);
      }
    }

    return Response.json({ success: true, message: 'Convite enviado com sucesso' });
  } catch (error) {
    console.error('[ViewerInvite] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
