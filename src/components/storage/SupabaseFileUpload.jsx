import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Componente de upload para arquivos grandes via Supabase Storage.
 * 
 * Props:
 *   folder       - subpasta no bucket (ex: 'georreferenciamento', 'documentos')
 *   accept       - tipos aceitos (ex: '.tif,.pdf,.zip')
 *   onUploadDone - callback(filePath, fileName) chamado após upload bem-sucedido
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
      // 1. Pede URL pré-assinada ao backend
      const res = await base44.functions.invoke('supabaseGetUploadUrl', {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        folder,
      });

      if (!res.data?.uploadUrl) {
        throw new Error(res.data?.error || 'Falha ao obter URL de upload');
      }

      const { uploadUrl, filePath } = res.data;

      // 2. Faz upload direto para o Supabase via XHR para ter progresso real
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload falhou: ${xhr.status} ${xhr.responseText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Erro de rede durante o upload'));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

      setStatus('success');
      setProgress(100);
      onUploadDone?.(filePath, file.name);

      // Reset input
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      console.error('[SupabaseFileUpload] Erro:', err.message);
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
          <p className="text-xs text-slate-500">Enviando arquivo diretamente para o armazenamento seguro...</p>
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