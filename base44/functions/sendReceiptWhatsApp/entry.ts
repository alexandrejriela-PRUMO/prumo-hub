import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@2.5.2';

const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = (Deno.env.get('R2_BUCKET_NAME') || '').trim().replace(/\s+/g, '-').toLowerCase();

/**
 * sendReceiptWhatsApp — Gera o PDF do recibo (jsPDF), sobe pro R2, gera um link
 * temporário assinado e dispara o envio via WhatsApp (n8n → Z-API send-document/pdf).
 *
 * Reaproveita os mesmos padrões de geração de PDF (generateAcceptanceProofPDF) e de
 * upload/assinatura R2 (r2UploadProxy / r2GetSignedUrl) já usados no restante do sistema.
 *
 * Recebe: { receipt_id, phone }
 * Retorna: { success, sent_to }
 */

// ─── Normalização de texto (acentuação → ASCII, compatível com Helvetica no jsPDF) ──
function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .replace(/[À-Å]/g, 'A').replace(/[à-å]/g, 'a')
    .replace(/[Ç]/g, 'C').replace(/[ç]/g, 'c')
    .replace(/[È-Ë]/g, 'E').replace(/[è-ë]/g, 'e')
    .replace(/[Ì-Ï]/g, 'I').replace(/[ì-ï]/g, 'i')
    .replace(/[Ñ]/g, 'N').replace(/[ñ]/g, 'n')
    .replace(/[Ò-ÖØ]/g, 'O').replace(/[ò-öø]/g, 'o')
    .replace(/[Ù-Ü]/g, 'U').replace(/[ù-ü]/g, 'u')
    .replace(/[ã]/g, 'a').replace(/[Ã]/g, 'A')
    .replace(/[õ]/g, 'o').replace(/[Õ]/g, 'O')
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x00-\x7F]/g, '?');
}
const n = (v) => (typeof v === 'string' ? normalizeText(v) : v);

// ─── Assinatura AWS SigV4 (compartilhada por upload PUT e link GET assinado) ────────
async function hmacSha256(key, data) {
  const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}
async function sha256Hex(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function sha256HexBytes(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function uploadToR2(filePath, fileBytes, contentType) {
  const region = 'auto', service = 's3';
  const bucketHost = `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = '/' + filePath.split('/').map(encodeURIComponent).join('/');
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const payloadHash = await sha256HexBytes(fileBytes);
  const canonicalHeaders = `content-type:${contentType}\nhost:${bucketHost}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join('\n');
  const kDate = await hmacSha256(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(await hmacSha256(kSigning, stringToSign));
  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const url = `https://${bucketHost}${canonicalUri}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, 'Host': bucketHost, 'x-amz-date': amzDate, 'x-amz-content-sha256': payloadHash, 'Authorization': authorization },
    body: fileBytes,
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`R2 upload falhou: ${response.status} ${errText}`);
  }
  return url.split('?')[0];
}

async function generatePresignedGetUrl(filePath, expiresIn = 3600) {
  const region = 'auto', service = 's3';
  const host = `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;
  const canonicalUri = '/' + filePath.split('/').map(encodeURIComponent).join('/');

  const queryEntries = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders', 'host'],
  ].sort((a, b) => a[0].localeCompare(b[0]));
  const canonicalQueryString = queryEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

  const canonicalRequest = ['GET', canonicalUri, canonicalQueryString, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join('\n');
  const kDate = await hmacSha256(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

// ─── Busca a logo do consultor e converte para data URI (base64) ────────────────────
async function fetchLogoAsDataUri(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const contentType = res.headers.get('content-type') || '';
    const format = contentType.includes('png') ? 'PNG' : (contentType.includes('jpeg') || contentType.includes('jpg')) ? 'JPEG' : 'PNG';
    return { dataUri: `data:image/${format.toLowerCase()};base64,${base64}`, format };
  } catch (e) {
    console.warn('[sendReceiptWhatsApp] Erro ao buscar logo:', e.message);
    return null;
  }
}

// ─── Geração do PDF do recibo (jsPDF) ────────────────────────────────────────────────
function buildReceiptPDF(receipt, logoData) {
  const doc = new jsPDF({ compress: false });
  doc.setFont('Helvetica');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d);
    return isNaN(dt) ? '-' : dt.toLocaleDateString('pt-BR');
  };

  // Logo do consultor (se configurada) — altura máxima de 20mm, sem distorcer proporção
  if (logoData) {
    try {
      const props = doc.getImageProperties(logoData.dataUri);
      const ratio = props.width / props.height;
      let logoHeight = 20;
      let logoWidth = logoHeight * ratio;
      if (logoWidth > contentWidth) {
        logoWidth = contentWidth;
        logoHeight = logoWidth / ratio;
      }
      doc.addImage(logoData.dataUri, logoData.format, margin, y, logoWidth, logoHeight);
      y += logoHeight + 6;
    } catch (e) {
      console.warn('[sendReceiptWhatsApp] Erro ao inserir logo no PDF:', e.message);
    }
  }

  // Header
  doc.setFontSize(16);
  doc.setTextColor(27, 67, 50);
  doc.text('RECIBO', margin, y);
  doc.setFontSize(10);
  doc.text(n(receipt.receipt_number || ''), pageWidth - margin, y, { align: 'right' });
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Santa Rute Engenharia Rural | CNPJ: 62.807.412/0001-95', margin, y);
  y += 5;
  doc.setLineWidth(0.5);
  doc.setDrawColor(27, 67, 50);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Dados do cliente
  doc.setFontSize(10);
  doc.setTextColor(27, 67, 50);
  doc.text(n(receipt.title || 'Recibo de Honorários'), margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const infoLines = [
    n(`Cliente: ${receipt.client_name || '-'}`),
    ...(receipt.client_cpf_cnpj ? [n(`CPF/CNPJ: ${receipt.client_cpf_cnpj}`)] : []),
    ...(receipt.property_name ? [n(`Propriedade: ${receipt.property_name}`)] : []),
    n(`Data do Pagamento: ${fmtDate(receipt.payment_date)}`),
    ...(receipt.payment_method ? [n(`Forma de Pagamento: ${receipt.payment_method}`)] : []),
  ];
  doc.text(infoLines, margin, y);
  y += infoLines.length * 5 + 8;

  // Tabela de serviços
  doc.setFontSize(10);
  doc.setTextColor(27, 67, 50);
  doc.text('SERVIÇOS PRESTADOS', margin, y);
  y += 3;
  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(9);
  const services = Array.isArray(receipt.services) ? receipt.services : [];
  for (const s of services) {
    const label = n(s.name || 'Serviço');
    const desc = s.description ? doc.splitTextToSize(n(s.description), contentWidth - 40) : [];
    doc.setTextColor(40, 40, 40);
    doc.text(label, margin, y);
    doc.text(fmt(s.amount), pageWidth - margin, y, { align: 'right' });
    y += 5;
    if (desc.length) {
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(8);
      doc.text(desc, margin, y);
      y += desc.length * 4 + 2;
      doc.setFontSize(9);
    }
  }
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Total
  doc.setFontSize(12);
  doc.setTextColor(27, 67, 50);
  doc.text('TOTAL', margin, y);
  doc.text(fmt(receipt.total_amount), pageWidth - margin, y, { align: 'right' });
  y += 12;

  if (receipt.notes) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const noteLines = doc.splitTextToSize(n(`Observações: ${receipt.notes}`), contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 8;
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(n(`Recibo gerado em ${new Date().toLocaleString('pt-BR')} | hub.prumo.site`), margin, pageHeight - 8);

  return doc.output('arraybuffer');
}

// ─── Log de envio (não deve derrubar a resposta principal em caso de falha) ─────────
async function logWhatsAppSend(base44, data) {
  try {
    await base44.asServiceRole.entities.WhatsAppSendLog.create(data);
  } catch (e) {
    console.error('[sendReceiptWhatsApp] Erro ao gravar WhatsAppSendLog:', e.message);
  }
}

Deno.serve(async (req) => {
  let base44, receipt_id, phone, consultorEmail, receipt, sendMessage, fileName;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let customMessage;
    ({ receipt_id, phone, message: customMessage } = await req.json());
    if (!receipt_id) return Response.json({ error: 'receipt_id é obrigatório' }, { status: 400 });
    if (!phone) return Response.json({ error: 'phone é obrigatório' }, { status: 400 });

    // Determinar o email efetivo do consultor (mesma lógica de sendReceiptEmail)
    consultorEmail = user.email;
    if (user.role !== 'admin') {
      const memberships = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email, status: 'Ativo',
      });
      if (memberships.length > 0) consultorEmail = memberships[0].primary_user_email;
    }

    const receipts = await base44.asServiceRole.entities.Receipt.filter({ id: receipt_id });
    receipt = receipts[0];
    if (!receipt) return Response.json({ error: 'Recibo não encontrado' }, { status: 404 });
    if (receipt.consultor_email !== consultorEmail && user.role !== 'admin') {
      return Response.json({ error: 'Sem permissão para este recibo' }, { status: 403 });
    }

    // Buscar logo do consultor (dono do recibo, não necessariamente o usuário logado)
    let logoData = null;
    try {
      // Usa receipt.consultor_email (dono real do recibo), não o email resolvido do
      // requisitante, já que admins podem enviar em nome de qualquer consultor.
      const consultorUsers = await base44.asServiceRole.entities.User.filter({ email: receipt.consultor_email });
      const logoUrl = consultorUsers[0]?.logo_url;
      if (logoUrl) logoData = await fetchLogoAsDataUri(logoUrl);
    } catch (e) {
      console.warn('[sendReceiptWhatsApp] Erro ao buscar logo do consultor:', e.message);
    }

    // 1) Gerar PDF
    const pdfBuffer = buildReceiptPDF(receipt, logoData);
    const pdfBytes = new Uint8Array(pdfBuffer);

    // 2) Upload pro R2
    const safeNumber = (receipt.receipt_number || receipt_id).replace(/[^a-zA-Z0-9_\-]/g, '_');
    fileName = `Recibo_${safeNumber}.pdf`;
    const filePath = `recibos/${consultorEmail}/${Date.now()}_${fileName}`;
    await uploadToR2(filePath, pdfBytes, 'application/pdf');

    // 3) Link assinado temporário (1h — suficiente para a Z-API baixar e encaminhar)
    const signedUrl = await generatePresignedGetUrl(filePath, 3600);

    // 4) Montar mensagem e disparar via n8n → Z-API
    const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const defaultMessage = `Olá ${receipt.client_name || ''}, segue o recibo${receipt.receipt_number ? ` Nº ${receipt.receipt_number}` : ''} referente a "${receipt.title || 'Honorários'}", no valor de R$ ${fmt(receipt.total_amount)}.`;
    sendMessage = customMessage || defaultMessage;

    const waResponse = await fetch('https://n8n-2ud7.srv1837546.hstgr.cloud/webhook/prumo-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        document_url: signedUrl,
        file_name: fileName,
        message: sendMessage,
      }),
    });
    if (!waResponse.ok) {
      const errText = await waResponse.text();
      throw new Error(`Falha ao acionar webhook WhatsApp: ${waResponse.status} ${errText}`);
    }
    const waJson = await waResponse.json().catch(() => null);
    const zapiMessageId = waJson?.messageId || null;

    // 5) Atualizar status do recibo
    await base44.asServiceRole.entities.Receipt.update(receipt_id, {
      status: 'Enviado',
      sent_at: new Date().toISOString(),
    });

    await logWhatsAppSend(base44, {
      doc_type: 'receipt',
      doc_id: receipt_id,
      doc_number: receipt.receipt_number || '',
      consultor_email: consultorEmail,
      client_name: receipt.client_name || '',
      channel: 'whatsapp',
      to_phone: phone,
      message: sendMessage,
      file_name: fileName,
      zapi_message_id: zapiMessageId,
      sent_at: new Date().toISOString(),
      status: 'sent',
    });

    return Response.json({ success: true, sent_to: phone });
  } catch (error) {
    console.error('[sendReceiptWhatsApp] Erro:', error.message);
    if (base44 && receipt_id && phone && consultorEmail) {
      await logWhatsAppSend(base44, {
        doc_type: 'receipt',
        doc_id: receipt_id,
        doc_number: receipt?.receipt_number || '',
        consultor_email: consultorEmail,
        client_name: receipt?.client_name || '',
        channel: 'whatsapp',
        to_phone: phone,
        message: sendMessage || '',
        file_name: fileName || '',
        sent_at: new Date().toISOString(),
        status: 'error',
        error_message: error.message,
      });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
