import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = (Deno.env.get('R2_BUCKET_NAME') || '').trim().replace(/\s+/g, '-').toLowerCase();

async function hmacSha256(key, data) {
  const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
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

// Usa Authorization header (não presigned URL) para evitar problema de bucket name com espaço
async function uploadToR2(filePath, fileBytes, contentType) {
  const region = 'auto';
  const service = 's3';
  // Virtual-hosted style: bucket no hostname (evita problema de espaço no path)
  const bucketHost = `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = '/' + filePath.split('/').map(encodeURIComponent).join('/');

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const payloadHash = await sha256HexBytes(fileBytes);

  const canonicalHeaders = `content-type:${contentType}\nhost:${bucketHost}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join('\n');

  const kDate = await hmacSha256(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const url = `https://${bucketHost}${canonicalUri}`;

  console.log('[r2UploadProxy] PUT url:', url.slice(0, 120));

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Host': bucketHost,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorization,
    },
    body: fileBytes,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`R2 upload falhou: ${response.status} ${errText}`);
  }

  return url.split('?')[0];
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { fileName, contentType, folder, fileBase64 } = await req.json();

    if (!fileName || !fileBase64) {
      return Response.json({ error: 'fileName e fileBase64 são obrigatórios' }, { status: 400 });
    }

    const binaryString = atob(fileBase64);
    const fileBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      fileBytes[i] = binaryString.charCodeAt(i);
    }

    const safeFolder = (folder || 'uploads').replace(/[^a-zA-Z0-9_\-\/]/g, '_');
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_');
    const filePath = `${safeFolder}/${user.email}/${timestamp}_${safeName}`;
    const mimeType = contentType || 'application/octet-stream';

    console.log('[r2UploadProxy] bucket:', JSON.stringify(R2_BUCKET_NAME), 'account:', R2_ACCOUNT_ID?.slice(0, 8));

    await uploadToR2(filePath, fileBytes, mimeType);

    return Response.json({ filePath, fileName });
  } catch (err) {
    console.error('[r2UploadProxy] Erro:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});