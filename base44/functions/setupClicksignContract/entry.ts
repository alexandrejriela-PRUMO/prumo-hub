import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contract_data, document_html, signers } = await req.json();

    if (!contract_data || !document_html || !signers || signers.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const clicksignApiKey = Deno.env.get('CLICKSIGN_API_KEY');
    if (!clicksignApiKey) {
      return Response.json({ error: 'Clicksign not configured' }, { status: 500 });
    }

    // Criar documento no Clicksign
    const documentName = `Contrato-${contract_data.client_name}-${Date.now()}`;
    
    // Converter HTML para PDF base64
    // Para simplificar, aqui apenas criamos o documento no Clicksign
    const clicksignResponse = await fetch('https://app.clicksign.com/api/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clicksignApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document: {
          path: `/${documentName}`,
          content_base64: Buffer.from(document_html).toString('base64'),
          deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      })
    });

    if (!clicksignResponse.ok) {
      const error = await clicksignResponse.json();
      console.error('Clicksign error:', error);
      return Response.json({ error: 'Failed to create document on Clicksign' }, { status: 500 });
    }

    const clicksignData = await clicksignResponse.json();
    const documentKey = clicksignData.document.key;

    // Adicionar signatários
    const signersList = [];
    for (const signer of signers) {
      if (!signer.email || !signer.name) continue;

      const signerResponse = await fetch(`https://app.clicksign.com/api/v1/documents/${documentKey}/signers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clicksignApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signer: {
            email: signer.email,
            name: signer.name,
            order: signersList.length + 1,
            foreign: false,
            send_by_email: true,
            auth_mode: 'email',
            documentation: signer.cpf || '',
            has_documentation: !!signer.cpf,
            delivery_mode: 'email',
            handwritten_signature: false
          }
        })
      });

      if (signerResponse.ok) {
        const signerData = await signerResponse.json();
        signersList.push({
          name: signer.name,
          email: signer.email,
          clicksign_signer_key: signerData.signer.key,
          status: 'Pendente'
        });
      }
    }

    // Iniciar fluxo de assinatura
    const initResponse = await fetch(`https://app.clicksign.com/api/v1/documents/${documentKey}/start`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clicksignApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!initResponse.ok) {
      return Response.json({ error: 'Failed to start signature workflow' }, { status: 500 });
    }

    // Criar contrato no banco de dados
    const contractRecord = await base44.entities.ClientContract.create({
      consultor_email: user.email,
      client_email: contract_data.client_email,
      client_name: contract_data.client_name,
      property_id: contract_data.property_id || '',
      contract_type: contract_data.contract_type,
      object: contract_data.object,
      start_date: contract_data.start_date,
      end_date: contract_data.end_date,
      total_value: contract_data.total_value || 0,
      payment_terms: contract_data.payment_terms,
      status: 'Em Assinatura',
      document_html: document_html,
      clicksign_key: documentKey,
      signature_status: 'Pendente',
      signers: signersList,
      notes: contract_data.notes
    });

    return Response.json({
      success: true,
      message: 'Contrato enviado para assinatura digital',
      contract_id: contractRecord.id,
      clicksign_key: documentKey,
      signers: signersList
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});