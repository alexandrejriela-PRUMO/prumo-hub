import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CLICKSIGN_BASE = 'https://app.clicksign.com/api/v2';
const API_KEY = Deno.env.get('CLICKSIGN_API_KEY');

async function pdfToBase64(url) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function csPost(path, body) {
  const res = await fetch(`${CLICKSIGN_BASE}${path}?access_token=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.errors?.[0] || JSON.stringify(data));
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, document_url, document_filename } = await req.json();

    if (action !== 'send_terms_of_use') {
      return Response.json({ error: 'Ação não reconhecida.' }, { status: 400 });
    }

    const filename = document_filename || 'termos_de_uso_prumo_hub.pdf';
    const path = `/termos_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;

    // 1. Upload document
    const pdfBase64 = await pdfToBase64(document_url);
    const docData = await csPost('/documents', {
      document: {
        path,
        content_base64: `data:application/pdf;base64,${pdfBase64}`,
        auto_close: true,
        locale: 'pt-BR',
        sequence_enabled: false,
      }
    });
    const documentKey = docData.document.key;

    // 2. Create signer (the user)
    const signerData = await csPost('/signers', {
      signer: {
        email: user.email,
        name: user.full_name || user.email,
        auth_type: 'email',
        has_documentation: false,
      }
    });
    const signerKey = signerData.signer.key;

    // 3. Associate signer to document
    const listData = await csPost('/lists', {
      list: {
        document_key: documentKey,
        signer_key: signerKey,
        sign_as: 'sign',
        refusable: false,
        message: 'Por favor, leia e assine os Termos de Uso da plataforma PRUMO Hub.',
      }
    });

    // 4. Notify
    await csPost('/notifications', {
      request_signature_key: listData.list.request_signature_key,
      message: 'Por favor, leia e assine os Termos de Uso da plataforma PRUMO Hub.',
    });

    // 5. Save record
    const signature = await base44.entities.DigitalSignature.create({
      document_type: 'Termos de Uso da Plataforma',
      clicksign_document_key: documentKey,
      document_filename: filename,
      document_url,
      status: 'Aguardando Assinaturas',
      signers: [{
        name: user.full_name || user.email,
        email: user.email,
        clicksign_signer_key: signerKey,
        status: 'Pendente',
      }],
      user_email: user.email,
    });

    return Response.json({ success: true, signature, documentKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});