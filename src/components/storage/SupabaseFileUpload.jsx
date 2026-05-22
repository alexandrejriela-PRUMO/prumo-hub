import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Componente de upload universal — envia arquivos para o Cloudflare R2.
 * Mantém a mesma interface de props de antes para compatibilidade total.
 *
 * Props:
 *   folder       - subpasta no bucket (ex: 'documentos', 'mapeamentos')
 *   accept       - tipos aceitos (ex: '.pdf,.zip,.tif')
 *   onUploadDone - callback(filePath, fileName) após upload bem-sucedido
 *   label        - texto do botão (opcional)
 */
export default function SupabaseFileUpload({ folder = 'uploads', accept, onUploadDone, label = 'Selecionar Arquivo' }) {
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
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
      setProgress(20);

      // Lê arquivo em chunks (máx 10MB por chunk)
      const chunkSize = 10 * 1024 * 1024;
      const chunks = Math.ceil(file.size / chunkSize);

      let uploadedBytes = 0;

      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('fileName', file.name);
        formData.append('contentType', file.type || 'application/octet-stream');
        formData.append('folder', folder);

        const uploadRes = await base44.functions.invoke('r2UploadProxy', formData, {
          skipContentType: true,
        });

        if (uploadRes.status !== 200 && !uploadRes.data?.filePath) {
          throw new Error(uploadRes.data?.error || 'Erro no upload');
        }

        uploadedBytes += (end - start);
        const percent = 20 + Math.round((uploadedBytes / file.size) * 75);
        setProgress(percent);

        // Se for o último chunk e temos filePath, sucesso
        if (i === chunks - 1) {
          setProgress(100);
          setStatus('success');
          onUploadDone?.(uploadRes.data.filePath, file.name);
          if (inputRef.current) inputRef.current.value = '';
          return;
        }
      }
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
          <p className="text-xs text-slate-500">Enviando para Cloudflare R2...</p>
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