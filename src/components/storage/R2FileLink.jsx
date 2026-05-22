import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, Loader2 } from 'lucide-react';

/**
 * Link de download para arquivos privados no Cloudflare R2.
 * Gera uma signed URL temporária via backend e faz download.
 * 
 * Props:
 *   filePath  - caminho do arquivo no bucket R2
 *   fileName  - nome para salvar o arquivo
 *   label     - texto do link (opcional)
 *   asLink    - se true, renderiza como link de texto; caso contrário, como badge
 */
export default function R2FileLink({ filePath, fileName, label, asLink = true }) {
  const [loading, setLoading] = useState(false);

  if (!filePath) return null;

  const displayName = label || fileName || filePath.split('/').pop();

  const handleDownload = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('r2GetSignedUrl', { filePath, expiresIn: 300 });
    const signedUrl = res?.data?.signedUrl;
    if (!signedUrl) { alert('Erro ao gerar link de download.'); setLoading(false); return; }

    const response = await fetch(signedUrl);
    if (!response.ok) { alert('Erro ao baixar arquivo.'); setLoading(false); return; }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = decodeURIComponent(fileName || filePath.split('/').pop());
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    setLoading(false);
  };

  if (asLink) {
    return (
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 hover:underline disabled:opacity-50"
        title="Baixar TIFF"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        {displayName}
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-100 disabled:opacity-50"
      title="Baixar TIFF do R2"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
      {displayName}
    </button>
  );
}