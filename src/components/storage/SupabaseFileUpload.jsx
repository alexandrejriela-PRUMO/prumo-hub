import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Upload universal para Cloudflare R2 — zero memória para arquivos grandes.
 *
 * Qualquer tamanho → S3 Multipart Upload via presigned URLs:
 *   1. backend: initiate      → uploadId + filePath
 *   2. backend: getPartUrl    → URL pré-assinada por part
 *   3. fetch PUT direto       → file.slice(start, end) como body (Blob, zero cópia)
 *   4. backend: complete      → finaliza com ETags
 *
 * O arquivo NUNCA é carregado inteiro na memória do browser.
 */

const PART_SIZE = 50 * 1024 * 1024; // 50 MB por part — bom balanço entre requests e memória

export default function SupabaseFileUpload({ folder = 'uploads', accept, onUploadDone, label = 'Selecionar Arquivo' }) {
  const [status, setStatus]     = useState('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      const mimeType   = file.type || 'application/octet-stream';
      const totalParts = Math.ceil(file.size / PART_SIZE);

      // 1. Iniciar multipart upload
      const initRes = await base44.functions.invoke('r2UploadLarge', {
        action:      'initiate',
        fileName:    file.name,
        contentType: mimeType,
        folder,
      });
      if (initRes.data?.error) throw new Error(initRes.data.error);
      const { uploadId, filePath } = initRes.data;
      setProgress(2);

      // 2. Enviar cada part via presigned URL + file.slice() — zero memória
      const parts = [];
      for (let i = 0; i < totalParts; i++) {
        const start = i * PART_SIZE;
        const end   = Math.min(start + PART_SIZE, file.size);
        const blob  = file.slice(start, end); // Blob — o browser não lê o conteúdo ainda

        // Obter URL pré-assinada para esta part
        const urlRes = await base44.functions.invoke('r2UploadLarge', {
          action:     'getPartUrl',
          filePath,
          uploadId,
          partNumber: i + 1,
        });
        if (urlRes.data?.error) throw new Error(urlRes.data.error);
        const { url } = urlRes.data;

        // PUT direto no R2 — browser transmite o Blob em streaming, sem ler tudo na RAM
        const resp = await fetch(url, {
          method:  'PUT',
          body:    blob,
          headers: { 'Content-Type': mimeType },
        });
        if (!resp.ok) throw new Error(`Part ${i + 1} falhou: ${resp.status}`);

        const etag = resp.headers.get('etag') || resp.headers.get('ETag') || '';
        parts.push({ partNumber: i + 1, etag });
        setProgress(2 + Math.round(((i + 1) / totalParts) * 95));
      }

      // 3. Completar multipart upload
      const completeRes = await base44.functions.invoke('r2UploadLarge', {
        action: 'complete',
        filePath,
        uploadId,
        parts,
      });
      if (completeRes.data?.error) throw new Error(completeRes.data.error);

      setProgress(100);
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
            {progress < 5 ? 'Iniciando upload...' : progress < 97 ? `Enviando... ${progress}%` : 'Finalizando...'}
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