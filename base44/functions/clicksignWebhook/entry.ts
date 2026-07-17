import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    console.log(JSON.stringify(body));
    const base44 = createClientFromRequest(req);

    const event = body?.event;
    if (!event) return Response.json({ received: true });

    const eventName = event.name; // "sign", "refusal", "auto_close", "close", "cancel", "deadline"
    // API v3 (Envelope) pode enviar envelope.id; API v2 enviava document.key. Tenta ambos.
    const documentKey = event.data?.envelope?.id || event.data?.document?.key;
    if (!documentKey) return Response.json({ received: true });

    // Find the DigitalSignature record
    const signatures = await base44.asServiceRole.entities.DigitalSignature.filter({
      clicksign_document_key: documentKey
    });
    if (!signatures.length) return Response.json({ received: true });
    const signature = signatures[0];

    const history = [...(signature.webhook_payload_history || []), { received_at: new Date().toISOString(), event: eventName }];

    // Handle individual sign event
    if (eventName === 'sign') {
      const signerEmail = event.data?.signer?.email;
      const updatedSigners = (signature.signers || []).map(s =>
        s.email === signerEmail ? { ...s, status: 'Assinado', signed_at: event.timestamp } : s
      );
      await base44.asServiceRole.entities.DigitalSignature.update(signature.id, {
        signers: updatedSigners,
        webhook_payload_history: history,
      });
      return Response.json({ received: true });
    }

    // Handle document-level events
    let newStatus = signature.status;
    if (eventName === 'auto_close' || eventName === 'close') {
      newStatus = 'Assinado';
    } else if (eventName === 'refusal') {
      const signerEmail = event.data?.signer?.email;
      newStatus = 'Recusado';
      const updatedSigners = (signature.signers || []).map(s =>
        s.email === signerEmail ? { ...s, status: 'Recusado' } : s
      );
      await base44.asServiceRole.entities.DigitalSignature.update(signature.id, {
        status: newStatus,
        signers: updatedSigners,
        webhook_payload_history: history,
      });
      return Response.json({ received: true });
    } else if (eventName === 'cancel') {
      newStatus = 'Cancelado';
    } else if (eventName === 'deadline') {
      newStatus = 'Expirado';
    }

    await base44.asServiceRole.entities.DigitalSignature.update(signature.id, {
      status: newStatus,
      webhook_payload_history: history,
    });

    // If contract is fully signed → activate it
    if (newStatus === 'Assinado' && signature.client_contract_id) {
      await base44.asServiceRole.entities.ClientContract.update(signature.client_contract_id, {
        status: 'Ativo',
      });
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});