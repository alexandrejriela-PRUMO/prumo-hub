import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Upload universal para Cloudflare R2.
 *
 * < 4MB  → base64 via r2UploadProxy (1 request, sem CORS)
 * >= 4MB → S3 Multipart Upload via r2UploadLarge (3 fases, qualquer tamanho)
 *           Cada part = ~5MB de dados binários (~6.7MB base64)
 */

const SMALL_THRESHOLD = 4 * 1024 * 1024;   // 4 MB
const PART_SIZE       = 5 * 1024 * 1024;   // 5 MB por part (mínimo S3 é 5MB exceto último)

export default function SupabaseFileUpload({ folder = 'uploads', accept, onUploadDone, label = 'Selecionar Arquivo' }) {
  const [status, setStatus]     = useState('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  const toBase64 = (bytes) => {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(binary);
  };

  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });

  // Upload pequeno: base64 via proxy (sem CORS)
  const uploadSmall = async (file) => {
    setProgress(20);
    const bytes = await readFile(file);
    setProgress(50);

    const res = await base44.functions.invoke('r2UploadProxy', {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      folder,
      fileBase64: toBase64(bytes),
    });

    if (!res.data?.filePath) throw new Error(res.data?.error || 'Erro no upload');
    setProgress(100);
    return res.data.filePath;
  };

  // Upload grande: S3 Multipart via r2UploadLarge (qualquer tamanho)
  const uploadLarge = async (file) => {
    setProgress(2);
    const bytes    = await readFile(file);
    const mimeType = file.type || 'application/octet-stream';
    const totalParts = Math.ceil(bytes.length / PART_SIZE);

    // 1. Inicia o multipart upload — recebe uploadId e filePath definitivo
    const initRes = await base44.functions.invoke('r2UploadLarge', {
      action: 'initiate',
      fileName: file.name,
      contentType: mimeType,
      folder,
    });
    if (initRes.data?.error) throw new Error(initRes.data.error);
    const { uploadId, filePath } = initRes.data;
    setProgress(5);

    // 2. Envia cada part
    const parts = [];
    for (let i = 0; i < totalParts; i++) {
      const start    = i * PART_SIZE;
      const chunk    = bytes.subarray(start, start + PART_SIZE);
      const partRes  = await base44.functions.invoke('r2UploadLarge', {
        action:      'uploadPart',
        filePath,
        uploadId,
        partNumber:  i + 1,
        chunkBase64: toBase64(chunk),
      });
      if (partRes.data?.error) throw new Error(partRes.data.error);
      parts.push({ partNumber: i + 1, etag: partRes.data.etag });
      setProgress(5 + Math.round(((i + 1) / totalParts) * 88));
    }

    // 3. Completa o multipart upload
    const completeRes = await base44.functions.invoke('r2UploadLarge', {
      action: 'complete',
      filePath,
      uploadId,
      parts,
    });
    if (completeRes.data?.error) throw new Error(completeRes.data.error);

    setProgress(100);
    return filePath;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      const filePath = file.size < SMALL_THRESHOLD
        ? await uploadSmall(file)
        : await uploadLarge(file);

      setStatus('success');
      onUploadDone?.(filePath, file.name);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      console.error('[FileUpload] Erro:', err.message);
      setStatus('error');
      setErrorMsg(err.message || 'Erro ao enviar arquivo');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const reset = () => {
    setStatus('idle');
    setProgress(0);
    setFileName('');
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {status === 'idle' && (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          {label}
        </Button>
      )}

      {status === 'uploading' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="truncate max-w-xs">{fileName}</span>
            <span className="ml-auto font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-slate-500">
            {progress < 5 ? 'Iniciando upload...' : progress < 95 ? `Enviando... ${progress}%` : 'Finalizando...'}
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{fileName}</span>
          <button onClick={reset} className="ml-auto text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{errorMsg || 'Erro no upload'}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}