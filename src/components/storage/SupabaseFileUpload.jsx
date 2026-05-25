import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Componente de upload universal — envia arquivos para o Cloudflare R2.
 * Mantém a mesma interface de props de antes para compatibilidade total.
 *
 * Estratégia de upload:
 *   - Arquivos < 10 MB: Base64 via r2UploadProxy (simples, sem CORS)
 *   - Arquivos >= 10 MB ou TIFF/TIF: URL pré-assinada PUT direto ao R2 (suporta qualquer tamanho)
 *
 * Props:
 *   folder       - subpasta no bucket (ex: 'documentos', 'mapeamentos')
 *   accept       - tipos aceitos (ex: '.pdf,.zip,.tif')
 *   onUploadDone - callback(filePath, fileName) após upload bem-sucedido
 *   label        - texto do botão (opcional)
 */

const LARGE_FILE_THRESHOLD = 4 * 1024 * 1024; // 4 MB (limite seguro para base64 no proxy)

const isTiffFile = (name) => {
  const lower = name.toLowerCase();
  return lower.endsWith('.tif') || lower.endsWith('.tiff');
};

export default function SupabaseFileUpload({ folder = 'uploads', accept, onUploadDone, label = 'Selecionar Arquivo' }) {
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  // Upload via Base64 proxy — adequado para arquivos pequenos (< 10 MB)
  const uploadViaBase64 = async (file) => {
    const fileBase64 = await fileToBase64(file);
    setProgress(40);

    const uploadRes = await base44.functions.invoke('r2UploadProxy', {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      folder,
      fileBase64,
    });

    if (!uploadRes.data?.filePath) {
      throw new Error(uploadRes.data?.error || 'Erro no upload');
    }

    setProgress(100);
    return uploadRes.data.filePath;
  };

  // Upload via URL pré-assinada — adequado para arquivos grandes e TIFF
  const uploadViaPresignedUrl = async (file) => {
    const urlRes = await base44.functions.invoke('r2GetUploadUrl', {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      folder,
    });

    const { uploadUrl, filePath } = urlRes.data || {};
    if (!uploadUrl || !filePath) {
      throw new Error(urlRes.data?.error || 'Erro ao obter URL de upload');
    }

    setProgress(10);

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // Reserva 10% inicial para obtenção da URL; progresso real vai de 10 a 100
          const uploadPercent = Math.round((event.loaded / event.total) * 90);
          setProgress(10 + uploadPercent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload falhou: HTTP ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error('Erro de rede durante o upload.'));
      xhr.send(file);
    });

    setProgress(100);
    return filePath;
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arrayBuffer = reader.result;
          if (!arrayBuffer) throw new Error('ArrayBuffer vazio');

          // Usa btoa direto com Uint8Array para melhor performance em arquivos grandes
          const bytes = new Uint8Array(arrayBuffer);
          const chunkSize = 8192;
          let binary = '';
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
          }
          resolve(btoa(binary));
        } catch (err) {
          reject(new Error('Erro ao converter: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.onabort = () => reject(new Error('Leitura abortada'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limite de 50MB para TIFs (base64 via proxy)
    const MAX_TIFF_SIZE = 50 * 1024 * 1024;
    if (isTiffFile(file.name) && file.size > MAX_TIFF_SIZE) {
      setFileName(file.name);
      setStatus('error');
      setErrorMsg(`Arquivo TIF muito grande (${(file.size / 1024 / 1024).toFixed(0)}MB). Máximo permitido: 50MB.`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setFileName(file.name);
    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      // Sempre usa proxy para evitar bloqueio CORS do PUT pré-assinado direto ao R2
      // URL pré-assinada só para arquivos não-TIFF muito grandes (>4MB)
      const useLargeUpload = !isTiffFile(file.name) && file.size >= LARGE_FILE_THRESHOLD;
      const filePath = useLargeUpload
        ? await uploadViaPresignedUrl(file)
        : await uploadViaBase64(file);

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
            {progress < 10 ? 'Preparando upload...' : 'Enviando para Cloudflare R2...'}
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