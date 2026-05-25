/**
 * r2UploadLarge — Upload de arquivos grandes para R2 via S3 Multipart Upload.
 *
 * Fluxo zero-memória (frontend usa file.slice() + fetch direto):
 *   1. action=initiate   → cria multipart upload, retorna uploadId + filePath
 *   2. action=getPartUrl → retorna URL pré-assinada para PUT de uma part
 *   3. Frontend faz fetch PUT diretamente para a URL pré-assinada com o Blob
 *   4. action=complete   → finaliza com lista de ETags
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

/**
 * Gera uma URL pré-assinada para PUT de uma part (expiração 1h).
 * O frontend faz o PUT diretamente com file.slice() — zero bytes na memória do servidor.
 */
async function getPresignedPartUrl(filePath, uploadId, partNumber, expiresIn = 3600) {
  const { bucketHost, canonicalUri } = getBaseInfo(filePath);
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g,'').slice(0,15)+'Z';
  const dateStamp = amzDate.slice(0,8);
  const region    = 'auto';
  const service   = 's3';
  const credScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS_KEY_ID}/${credScope}`;

  // Para presigned URLs o payload hash é sempre UNSIGNED-PAYLOAD
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const qs = new URLSearchParams({
    'X-Amz-Algorithm':  'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date':       amzDate,
    'X-Amz-Expires':    String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
    'partNumber': String(partNumber),
    'uploadId': uploadId,
  }).toString();

  const canonicalHeaders = `host:${bucketHost}\n`;
  const signedHeaders    = 'host';

  const canonicalReq = ['PUT', canonicalUri, qs, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const reqHash      = await sha256Hex(canonicalReq);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credScope, reqHash].join('\n');

  const kDate = await hmacSha256(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kReg  = await hmacSha256(kDate, region);
  const kSvc  = await hmacSha256(kReg, service);
  const kSign = await hmacSha256(kSvc, 'aws4_request');
  const sig   = toHex(await hmacSha256(kSign, stringToSign));

  return `https://${bucketHost}${canonicalUri}?${qs}&X-Amz-Signature=${sig}`;
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

    // ── Ação: URL pré-assinada para uma part (frontend faz PUT direto) ───────────
    if (action === 'getPartUrl') {
      const { uploadId, partNumber } = body;
      if (!uploadId || partNumber == null) {
        return Response.json({ error: 'uploadId e partNumber são obrigatórios' }, { status: 400 });
      }
      const url = await getPresignedPartUrl(filePath, uploadId, partNumber);
      return Response.json({ url, partNumber });
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

    return Response.json({ error: 'action inválida. Use: initiate, getPartUrl, complete' }, { status: 400 });

  } catch (err) {
    console.error('[r2UploadLarge] Erro:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});