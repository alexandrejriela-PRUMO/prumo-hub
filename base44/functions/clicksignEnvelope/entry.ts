import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Conta ClickSign CENTRALIZADA (PRUMO), não mais uma API Key por consultor.
// Configure via: base44 secrets set CLICKSIGN_API_TOKEN=xxxx
const CLICKSIGN_TOKEN = Deno.env.get('CLICKSIGN_API_TOKEN');
const CLICKSIGN_BASE = 'https://app.clicksign.com/api/v3'; // trocar para sandbox.clicksign.com em testes

async function cs(method, path, token, body) {
  const res = await fetch(`${CLICKSIGN_BASE}${path}`, {
    method,
    headers: {
      'Authorization': token,
      'Content-Type': 'application/vnd.api+json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data?.errors || data));
  return data;
}

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

/**
 * clicksignEnvelope — Envia contrato para assinatura via ClickSign API v3 (Envelope),
 * usando UMA conta centralizada da PRUMO (não mais uma conta por consultor).
 *
 * IMPORTANTE — pontos ainda não validados ao vivo (testar em sandbox antes de produção):
 * - Nome do campo de telefone no signatário (usando `phone_number`, mais comum na doc,
 *   mas não 100% confirmado para o endpoint de signers da v3)
 * - Comportamento exato quando `auth: 'whatsapp'` é usado sem plano compatível
 *
 * Recebe: { action: 'send_contract', contract_id, document_url, document_filename, signers }
 *   signers: [{ name, email, phone, delivery_channel: 'email'|'whatsapp', sign_as }]
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isConsultor = user.user_type === 'consultor' || user.user_type === 'equipe';
    if (!isConsultor) return Response.json({ error: 'Apenas consultores podem usar esta função.' }, { status: 403 });

    if (!CLICKSIGN_TOKEN) {
      return Response.json({ error: 'CLICKSIGN_API_TOKEN não configurado no ambiente.' }, { status: 500 });
    }

    const payload = await req.json();
    const { action } = payload;

    if (action !== 'send_contract') {
      return Response.json({ error: 'Ação não reconhecida.' }, { status: 400 });
    }

    const { contract_id, document_url, document_filename, signers } = payload;
    if (!document_url || !signers?.length) {
      return Response.json({ error: 'document_url e signers são obrigatórios.' }, { status: 400 });
    }

    const filename = document_filename || 'contrato.pdf';

    // 1. Criar envelope
    const envelopeName = `${filename} - ${user.email} - ${new Date().toISOString()}`;
    const envelopeData = await cs('POST', '/envelopes', CLICKSIGN_TOKEN, {
      data: { type: 'envelopes', attributes: { name: envelopeName } },
    });
    const envelopeId = envelopeData.data.id;

    // 2. Adicionar documento
    const pdfBase64 = await pdfToBase64(document_url);
    const docData = await cs('POST', `/envelopes/${envelopeId}/documents`, CLICKSIGN_TOKEN, {
      data: {
        type: 'documents',
        attributes: {
          filename,
          content_base64: `data:application/pdf;base64,${pdfBase64}`,
        },
      },
    });
    const documentId = docData.data.id;

    // 3. Adicionar signatários + requisitos (qualificação + autenticação)
    const signerResults = [];
    for (const signer of signers) {
      try {
        const wantsWhatsapp = signer.delivery_channel === 'whatsapp' && !!signer.phone;
        const authType = wantsWhatsapp ? 'whatsapp' : 'email';

        const signerAttrs = { name: signer.name, email: signer.email };
        if (wantsWhatsapp) {
          // ATENÇÃO: nome do campo ainda não confirmado 100% — validar em sandbox.
          signerAttrs.phone_number = signer.phone;
        }

        const signerData = await cs('POST', `/envelopes/${envelopeId}/signers`, CLICKSIGN_TOKEN, {
          data: { type: 'signers', attributes: signerAttrs },
        });
        const signerId = signerData.data.id;

        // Requisito de qualificação: signatário deve assinar
        await cs('POST', `/envelopes/${envelopeId}/requirements`, CLICKSIGN_TOKEN, {
          data: {
            type: 'requirements',
            attributes: { action: 'agree', role: signer.sign_as || 'sign' },
            relationships: {
              document: { data: { type: 'documents', id: documentId } },
              signer: { data: { type: 'signers', id: signerId } },
            },
          },
        });

        // Requisito de autenticação: token por email ou whatsapp
        await cs('POST', `/envelopes/${envelopeId}/requirements`, CLICKSIGN_TOKEN, {
          data: {
            type: 'requirements',
            attributes: { action: 'provide_evidence', auth: authType },
            relationships: {
              document: { data: { type: 'documents', id: documentId } },
              signer: { data: { type: 'signers', id: signerId } },
            },
          },
        });

        signerResults.push({
          name: signer.name,
          email: signer.email,
          phone: signer.phone || null,
          delivery_channel: authType,
          clicksign_signer_id: signerId,
          status: 'Pendente',
        });
      } catch (e) {
        signerResults.push({ name: signer.name, email: signer.email, status: 'Erro', error: e.message });
      }
    }

    // 4. Ativar envelope (draft -> running)
    await cs('PATCH', `/envelopes/${envelopeId}`, CLICKSIGN_TOKEN, {
      data: { id: envelopeId, type: 'envelopes', attributes: { status: 'running' } },
    });

    // 5. Disparar notificações
    await cs('POST', `/envelopes/${envelopeId}/notifications`, CLICKSIGN_TOKEN, {
      data: { type: 'notifications', attributes: {} },
    });

    // 6. Salvar registro de rastreamento
    const signature = await base44.entities.DigitalSignature.create({
      document_type: 'Contrato Cliente Consultor',
      clicksign_document_key: envelopeId, // agora é o ID do envelope, não mais de um "document" v2
      document_filename: filename,
      document_url,
      status: 'Aguardando Assinaturas',
      signers: signerResults,
      client_contract_id: contract_id,
      consultor_email: user.email,
    });

    return Response.json({ success: true, signature, envelopeId });
  } catch (error) {
    console.error('[clicksignEnvelope] Erro:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
