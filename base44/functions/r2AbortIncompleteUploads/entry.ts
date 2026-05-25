/**
 * r2AbortIncompleteUploads — Lista e cancela todos os multipart uploads incompletos no R2.
 * Admin-only. Retorna quantos foram cancelados.
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
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
}

function toHex(b) { return [...b].map(x => x.toString(16).padStart(2, '0')).join(''); }

const BUCKET_HOST = `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

async function signedRequest(method, path, queryString, extraHeaders = {}) {
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const region    = 'auto';
  const service   = 's3';
  const credScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const payloadHash = await sha256Hex('');

  const headers = { 'host': BUCKET_HOST, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, ...extraHeaders };
  const sortedKeys       = Object.keys(headers).sort();
  const canonicalHeaders = sortedKeys.map(k => `${k}:${headers[k]}`).join('\n') + '\n';
  const signedHeaders    = sortedKeys.join(';');

  const canonicalReq = [method, path, queryString, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const reqHash      = await sha256Hex(canonicalReq);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credScope, reqHash].join('\n');

  const kDate = await hmacSha256(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kReg  = await hmacSha256(kDate, region);
  const kSvc  = await hmacSha256(kReg, service);
  const kSign = await hmacSha256(kSvc, 'aws4_request');
  const sig   = toHex(await hmacSha256(kSign, stringToSign));

  return {
    url: `https://${BUCKET_HOST}${path}${queryString ? '?' + queryString : ''}`,
    headers: {
      'Host': BUCKET_HOST,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
    },
  };
}

// ── List all in-progress multipart uploads ────────────────────────────────────

async function listAllMultipartUploads() {
  const uploads = [];
  let keyMarker       = '';
  let uploadIdMarker  = '';
  let isTruncated     = true;

  while (isTruncated) {
    const qs = new URLSearchParams({ uploads: '' });
    if (keyMarker)      qs.set('key-marker', keyMarker);
    if (uploadIdMarker) qs.set('upload-id-marker', uploadIdMarker);

    const { url, headers } = await signedRequest('GET', '/', qs.toString());
    const resp = await fetch(url, { headers });
    if (!resp.ok) throw new Error(`ListMultipartUploads falhou: ${resp.status} ${await resp.text()}`);

    const xml = await resp.text();

    // Parse uploads from XML
    const uploadMatches = xml.matchAll(/<Upload>([\s\S]*?)<\/Upload>/g);
    for (const match of uploadMatches) {
      const block    = match[1];
      const key      = block.match(/<Key>([^<]+)<\/Key>/)?.[1] || '';
      const uploadId = block.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1] || '';
      if (key && uploadId) uploads.push({ key, uploadId });
    }

    isTruncated    = xml.includes('<IsTruncated>true</IsTruncated>');
    keyMarker      = xml.match(/<NextKeyMarker>([^<]+)<\/NextKeyMarker>/)?.[1] || '';
    uploadIdMarker = xml.match(/<NextUploadIdMarker>([^<]+)<\/NextUploadIdMarker>/)?.[1] || '';

    if (!keyMarker && !uploadIdMarker) isTruncated = false;
  }

  return uploads;
}

// ── Abort a single multipart upload ──────────────────────────────────────────

async function abortMultipartUpload(key, uploadId) {
  const encodedKey = '/' + key.split('/').map(encodeURIComponent).join('/');
  const qs = `uploadId=${encodeURIComponent(uploadId)}`;
  const { url, headers } = await signedRequest('DELETE', encodedKey, qs);
  const resp = await fetch(url, { method: 'DELETE', headers });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AbortMultipartUpload falhou para ${key}: ${resp.status} ${txt}`);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user   = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    console.log('[r2AbortIncompleteUploads] Listando uploads incompletos...');
    const uploads = await listAllMultipartUploads();
    console.log(`[r2AbortIncompleteUploads] Encontrados: ${uploads.length}`);

    const errors = [];
    for (const { key, uploadId } of uploads) {
      try {
        await abortMultipartUpload(key, uploadId);
        console.log(`[r2AbortIncompleteUploads] Cancelado: ${key} (${uploadId.slice(0, 20)}...)`);
      } catch (err) {
        console.error(err.message);
        errors.push({ key, error: err.message });
      }
    }

    const cancelled = uploads.length - errors.length;
    return Response.json({
      total_found:     uploads.length,
      total_cancelled: cancelled,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err) {
    console.error('[r2AbortIncompleteUploads] Erro:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});