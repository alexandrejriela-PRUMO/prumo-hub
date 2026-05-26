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

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generatePresignedGetUrl(filePath, expiresIn = 3600) {
  const region = 'auto';
  const service = 's3';
  // Virtual-hosted style: bucket no hostname
  const host = `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;

  const canonicalUri = '/' + filePath.split('/').map(encodeURIComponent).join('/');

  // Parâmetros em ordem canônica (alfabética)
  const queryEntries = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders', 'host'],
  ].sort((a, b) => a[0].localeCompare(b[0]));

  const canonicalQueryString = queryEntries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQueryString,
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

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

const ALLOWED_EXTENSIONS = new Set([
  'pdf','jpg','jpeg','png','gif','webp','svg',
  'doc','docx','xls','xlsx','csv','txt','zip',
  'kml','kmz','geojson','shp','dbf','prj','shx',
  'mp4','mp3','ogg','wav','tif','tiff'
]);

// OWASP A01 - Sanitiza filePath contra path traversal
function sanitizeFilePath(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  if (filePath.includes('..') || filePath.includes('//') || filePath.startsWith('/')) return null;
  if (!/^[a-zA-Z0-9_\-/.@]+$/.test(filePath)) return null;
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return null;
  if (filePath.length > 512) return null;
  return filePath;
}

// OWASP A04 - Limite máximo de expiração: 1 hora
const MAX_EXPIRES_IN = 3600;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    // OWASP A01 - Sanitiza filePath
    const filePath = sanitizeFilePath(body?.filePath);
    if (!filePath) return Response.json({ error: 'filePath inválido ou não permitido' }, { status: 400 });

    // OWASP A04 - Limita expiresIn para no máximo 1 hora
    const rawExpires = parseInt(body?.expiresIn, 10) || 3600;
    const expiresIn = Math.min(Math.max(rawExpires, 60), MAX_EXPIRES_IN);

    const signedUrl = await generatePresignedGetUrl(filePath, expiresIn);
    return Response.json({ signedUrl });
  } catch (error) {
    console.error('[r2GetSignedUrl] Erro:', error.message);
    return Response.json({ error: 'Erro ao gerar URL' }, { status: 500 });
  }
});