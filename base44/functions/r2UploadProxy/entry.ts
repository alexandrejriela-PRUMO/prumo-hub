import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME');

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

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generatePresignedPutUrl(filePath, contentType, expiresIn = 300) {
  const region = 'auto';
  const service = 's3';
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;

  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const encodedBucket = encodeURIComponent(R2_BUCKET_NAME);
  const canonicalUri = `/${encodedBucket}/${encodedPath}`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  });

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    queryParams.toString(),
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join('\n');

  const kDate = await hmacSha256(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  queryParams.set('X-Amz-Signature', signature);

  return `https://${host}${canonicalUri}?${queryParams.toString()}`;
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

    // Decodifica base64 para bytes
    const binaryString = atob(fileBase64);
    const fileBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      fileBytes[i] = binaryString.charCodeAt(i);
    }

    console.log('[r2UploadProxy] bucket:', JSON.stringify(R2_BUCKET_NAME), 'acct:', R2_ACCOUNT_ID?.slice(0,8));
    const safeFolder = (folder || 'uploads').replace(/[^a-zA-Z0-9_\-\/]/g, '_');
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_');
    const filePath = `${safeFolder}/${user.email}/${timestamp}_${safeName}`;
    const mimeType = contentType || 'application/octet-stream';

    // Gerar presigned PUT URL e fazer upload server-side (evita CORS)
    console.log('[r2UploadProxy] bucket:', JSON.stringify(R2_BUCKET_NAME), 'account:', R2_ACCOUNT_ID?.slice(0,8));
    const presignedUrl = await generatePresignedPutUrl(filePath, mimeType);
    console.log('[r2UploadProxy] presignedUrl:', presignedUrl?.slice(0, 100));

    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: fileBytes,
    });

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      throw new Error(`R2 upload falhou: ${uploadResponse.status} ${errText}`);
    }

    return Response.json({ filePath, fileName });
  } catch (err) {
    console.error('[r2UploadProxy] Erro:', err.message, err.stack?.slice(0,200));
    return Response.json({ error: err.message }, { status: 500 });
  }
});