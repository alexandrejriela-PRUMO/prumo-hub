import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CLICKSIGN_BASE = 'https://app.clicksign.com/api/v2';

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

async function csPost(path, apiKey, body) {
  const res = await fetch(`${CLICKSIGN_BASE}${path}?access_token=${apiKey}`, {
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

    const isConsultor = user.user_type === 'consultor' || user.user_type === 'equipe';
    if (!isConsultor) return Response.json({ error: 'Apenas consultores podem usar esta função.' }, { status: 403 });

    const payload = await req.json();
    const { action } = payload;

    // ── Save API Key ───────────────────────────────────────────────────────────
    if (action === 'save_api_key') {
      const { api_key } = payload;
      if (!api_key) return Response.json({ error: 'api_key é obrigatório.' }, { status: 400 });
      await base44.auth.updateMe({ clicksign_api_key: api_key });
      return Response.json({ success: true });
    }

    // ── Send Contract ──────────────────────────────────────────────────────────
    if (action === 'send_contract') {
      const { contract_id, document_url, document_filename, signers } = payload;

      if (!user.clicksign_api_key) {
        return Response.json({
          error: 'Configure sua API Key da Clicksign em Configurações de Pagamento antes de usar esta função.'
        }, { status: 400 });
      }

      const apiKey = user.clicksign_api_key;
      const filename = document_filename || 'contrato.pdf';
      const path = `/${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}_${Date.now()}.pdf`;

      // 1. Upload document
      const pdfBase64 = await pdfToBase64(document_url);
      const docData = await csPost('/documents', apiKey, {
        document: {
          path,
          content_base64: `data:application/pdf;base64,${pdfBase64}`,
          auto_close: true,
          locale: 'pt-BR',
          sequence_enabled: false,
        }
      });
      const documentKey = docData.document.key;

      // 2. Create each signer, add to doc, notify
      const signerResults = [];
      for (const signer of signers) {
        let signerData, listData;
        try {
          signerData = await csPost('/signers', apiKey, {
            signer: {
              email: signer.email,
              name: signer.name,
              auth_type: 'email',
              has_documentation: false,
            }
          });

          listData = await csPost('/lists', apiKey, {
            list: {
              document_key: documentKey,
              signer_key: signerData.signer.key,
              sign_as: signer.sign_as || 'sign',
              refusable: true,
              message: `Por favor, assine o contrato: ${filename}`,
            }
          });

          await csPost('/notifications', apiKey, {
            request_signature_key: listData.list.request_signature_key,
            message: `Por favor, assine o contrato: ${filename}`,
          });

          signerResults.push({
            name: signer.name,
            email: signer.email,
            clicksign_signer_key: signerData.signer.key,
            clicksign_list_key: listData.list.key,
            status: 'Pendente',
          });
        } catch (e) {
          signerResults.push({ name: signer.name, email: signer.email, status: 'Erro', error: e.message });
        }
      }

      // 3. Save DigitalSignature record
      const signature = await base44.entities.DigitalSignature.create({
        document_type: 'Contrato Cliente Consultor',
        clicksign_document_key: documentKey,
        document_filename: filename,
        document_url,
        status: 'Aguardando Assinaturas',
        signers: signerResults,
        client_contract_id: contract_id,
        consultor_email: user.email,
      });

      return Response.json({ success: true, signature, documentKey });
    }

    return Response.json({ error: 'Ação não reconhecida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});