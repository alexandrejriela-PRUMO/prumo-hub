/**
 * r2UploadLarge — Upload de arquivos grandes para R2 via S3 Multipart Upload.
 *
 * Fluxo:
 *   1. chunkIndex=0: inicia o multipart upload no R2, retorna uploadId
 *   2. chunkIndex=1..N-1: envia cada part, retorna ETag
 *   3. chunkIndex=totalChunks-1 (último): completa o multipart upload
 *
 * Frontend envia chunks de ~5MB em base64.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const R2_ACCOUNT_ID        = Deno.env.get('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID     = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME       = (Deno.env.get('R2_BUCKET_NAME') || '').trim().replace(/\s+/g, '-').toLowerCase();

// ── AWS4 Helpers ──────────────────────────────────────────────────────────────

async function hmacSha256(key, data) {
  const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)));
}

async function sha256Hex(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2,'0')).join('');
}

async function sha256HexBytes(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2,'0')).join('');
}

function toHex(b) { return [...b].map(x => x.toString(16).padStart(2,'0')).join(''); }

function buildAuthHeaders(method, bucketHost, canonicalUri, queryString, payloadHash, mimeType = null) {
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g,'').slice(0,15)+'Z';
  const dateStamp = amzDate.slice(0,8);
  return { amzDate, dateStamp, payloadHash, bucketHost, canonicalUri, queryString, method, mimeType };
}

async function signRequest({ method, bucketHost, canonicalUri, queryString, amzDate, dateStamp, payloadHash, extraHeaders = {} }) {
  const region  = 'auto';
  const service = 's3';
  const credScope = `${dateStamp}/${region}/${service}/aws4_request`;

  // Build canonical headers (sorted)
  const headers = { 'host': bucketHost, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, ...extraHeaders };
  const sortedKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedKeys.map(k => `${k}:${headers[k]}`).join('\n') + '\n';
  const signedHeaders    = sortedKeys.join(';');

  const canonicalReq = [method, canonicalUri, queryString || '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const reqHash      = await sha256Hex(canonicalReq);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credScope, reqHash].join('\n');

  const kDate = await hmacSha256(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kReg  = await hmacSha256(kDate, region);
  const kSvc  = await hmacSha256(kReg, service);
  const kSign = await hmacSha256(kSvc, 'aws4_request');
  const sig   = toHex(await hmacSha256(kSign, stringToSign));

  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
    signedHeaders,
    amzDate,
  };
}

function getBaseInfo(filePath) {
  const bucketHost   = `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = '/' + filePath.split('/').map(encodeURIComponent).join('/');
  return { bucketHost, canonicalUri };
}

// ── Multipart Upload helpers ──────────────────────────────────────────────────

async function initiateMultipartUpload(filePath, contentType) {
  const { bucketHost, canonicalUri } = getBaseInfo(filePath);
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g,'').slice(0,15)+'Z';
  const dateStamp = amzDate.slice(0,8);
  const payloadHash = await sha256Hex('');

  const { authorization } = await signRequest({
    method: 'POST', bucketHost, canonicalUri,
    queryString: 'uploads=',
    amzDate, dateStamp, payloadHash,
    extraHeaders: { 'content-type': contentType },
  });

  const url = `https://${bucketHost}${canonicalUri}?uploads`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Host': bucketHost,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorization,
    },
  });

  if (!resp.ok) throw new Error(`Initiate multipart falhou: ${resp.status} ${await resp.text()}`);

  const xml      = await resp.text();
  const uploadId = xml.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1];
  if (!uploadId) throw new Error('UploadId não encontrado na resposta');
  return uploadId;
}

async function uploadPart(filePath, uploadId, partNumber, partBytes) {
  const { bucketHost, canonicalUri } = getBaseInfo(filePath);
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g,'').slice(0,15)+'Z';
  const dateStamp = amzDate.slice(0,8);
  const payloadHash = await sha256HexBytes(partBytes);
  const qs = `partNumber=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`;

  const { authorization } = await signRequest({
    method: 'PUT', bucketHost, canonicalUri,
    queryString: qs,
    amzDate, dateStamp, payloadHash,
  });

  const url = `https://${bucketHost}${canonicalUri}?${qs}`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      'Host': bucketHost,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorization,
    },
    body: partBytes,
  });

  if (!resp.ok) throw new Error(`Upload part ${partNumber} falhou: ${resp.status} ${await resp.text()}`);
  const etag = resp.headers.get('etag') || resp.headers.get('ETag') || '';
  console.log(`[r2UploadLarge] Part ${partNumber} ETag: ${etag}`);
  return etag;
}

async function completeMultipartUpload(filePath, uploadId, parts) {
  const { bucketHost, canonicalUri } = getBaseInfo(filePath);
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g,'').slice(0,15)+'Z';
  const dateStamp = amzDate.slice(0,8);

  const body = `<CompleteMultipartUpload>${parts.map(p =>
    `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`
  ).join('')}</CompleteMultipartUpload>`;

  const bodyBytes   = new TextEncoder().encode(body);
  const payloadHash = await sha256HexBytes(bodyBytes);
  const qs          = `uploadId=${encodeURIComponent(uploadId)}`;

  const { authorization } = await signRequest({
    method: 'POST', bucketHost, canonicalUri,
    queryString: qs,
    amzDate, dateStamp, payloadHash,
    extraHeaders: { 'content-type': 'application/xml' },
  });

  const url = `https://${bucketHost}${canonicalUri}?${qs}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      'Host': bucketHost,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorization,
    },
    body: bodyBytes,
  });

  if (!resp.ok) throw new Error(`Complete multipart falhou: ${resp.status} ${await resp.text()}`);
  console.log('[r2UploadLarge] Multipart completo:', filePath);
}

// ── Armazenamento de estado em /tmp (dentro do mesmo isolate/invocação) ───────
// Para múltiplos chunks, o frontend controla o uploadId e ETags entre requests.

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user   = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { fileName, contentType, folder, action } = body;

    const safeFolder = (folder || 'uploads').replace(/[^a-zA-Z0-9_\-\/]/g, '_');
    const safeName   = (fileName || 'file').replace(/[^a-zA-Z0-9._\-]/g, '_');
    const mimeType   = contentType || 'application/octet-stream';
    const filePath   = body.filePath || `${safeFolder}/${user.email}/${Date.now()}_${safeName}`;

    // ── Ação: iniciar multipart ────────────────────────────────────────────────
    if (action === 'initiate') {
      const uploadId = await initiateMultipartUpload(filePath, mimeType);
      return Response.json({ uploadId, filePath });
    }

    // ── Ação: enviar uma part ──────────────────────────────────────────────────
    if (action === 'uploadPart') {
      const { uploadId, partNumber, chunkBase64 } = body;
      if (!uploadId || !chunkBase64 || partNumber == null) {
        return Response.json({ error: 'uploadId, partNumber e chunkBase64 são obrigatórios' }, { status: 400 });
      }
      const bin = atob(chunkBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const etag = await uploadPart(filePath, uploadId, partNumber, bytes);
      return Response.json({ etag, partNumber });
    }

    // ── Ação: completar multipart ──────────────────────────────────────────────
    if (action === 'complete') {
      const { uploadId, parts } = body;
      if (!uploadId || !parts) {
        return Response.json({ error: 'uploadId e parts são obrigatórios' }, { status: 400 });
      }
      await completeMultipartUpload(filePath, uploadId, parts);
      return Response.json({ filePath, fileName });
    }

    // ── Fallback: upload simples (1 chunk, compatibilidade) ───────────────────
    const { chunkBase64 } = body;
    if (!chunkBase64) return Response.json({ error: 'action ou chunkBase64 obrigatório' }, { status: 400 });

    const bin = atob(chunkBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    // Usa r2UploadProxy logic inline para arquivo pequeno
    const { bucketHost, canonicalUri } = getBaseInfo(filePath);
    const now       = new Date();
    const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g,'').slice(0,15)+'Z';
    const dateStamp = amzDate.slice(0,8);
    const payloadHash = await sha256HexBytes(bytes);

    const { authorization } = await signRequest({
      method: 'PUT', bucketHost, canonicalUri,
      queryString: '',
      amzDate, dateStamp, payloadHash,
      extraHeaders: { 'content-type': mimeType },
    });

    const url = `https://${bucketHost}${canonicalUri}`;
    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'Host': bucketHost,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authorization,
      },
      body: bytes,
    });

    if (!resp.ok) throw new Error(`Upload falhou: ${resp.status} ${await resp.text()}`);
    return Response.json({ filePath, fileName });

  } catch (err) {
    console.error('[r2UploadLarge] Erro:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});