import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Upload de arquivos TIFF diretamente para o Cloudflare R2 (bucket privado).
 * 
 * Props:
 *   folder         - subpasta no bucket (padrão: 'tiffs')
 *   label          - texto do botão
 *   onUploadDone(filePath, fileName) - callback ao concluir; filePath é o caminho no R2
 */
export default function R2TiffUpload({ folder = 'tiffs', label = 'Upload TIFF (R2)', onUploadDone }) {
  const [status, setStatus] = useState('idle'); // idle | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.tif') && !ext.endsWith('.tiff')) {
      setErrorMsg('Apenas arquivos .tif / .tiff são aceitos.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    // 1. Solicita URL pré-assinada (PUT) do backend
    const res = await base44.functions.invoke('r2GetUploadUrl', {
      fileName: file.name,
      contentType: file.type || 'image/tiff',
      folder,
    });

    const { uploadUrl, filePath } = res.data || {};
    if (!uploadUrl || !filePath) {
      setErrorMsg('Erro ao obter URL de upload.');
      setStatus('error');
      return;
    }

    // 2. Upload direto para o R2 via XHR (rastreia progresso)
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'image/tiff');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload falhou: ${xhr.status} ${xhr.responseText}`));
      };

      xhr.onerror = () => reject(new Error('Erro de rede durante o upload.'));
      xhr.send(file);
    }).then(() => {
      setStatus('done');
      setProgress(100);
      // Passa filePath (caminho no R2) — download será via signed URL
      onUploadDone?.(filePath, file.name);
    }).catch((err) => {
      setErrorMsg(err.message);
      setStatus('error');
    });

    if (inputRef.current) inputRef.current.value = '';
  };

  const reset = () => { setStatus('idle'); setProgress(0); setErrorMsg(''); };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept=".tif,.tiff"
        className="hidden"
        onChange={handleFile}
      />

      {status === 'idle' && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2 border-dashed border-blue-300 text-blue-700 hover:bg-blue-50"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-4 h-4" />
          {label}
        </Button>
      )}

      {status === 'uploading' && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Enviando para R2... {progress}%</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4" />
          <span>TIFF enviado!</span>
          <button onClick={reset} className="ml-auto text-xs text-gray-500 hover:underline">Novo upload</button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={reset} className="text-xs text-gray-500 hover:underline">Tentar novamente</button>
        </div>
      )}
    </div>
  );
}