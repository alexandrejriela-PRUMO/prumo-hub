import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ExternalLink, Eye } from 'lucide-react';

/**
 * Componente universal de download/visualização de arquivos.
 * Usa backend getFileSignedUrl que tenta R2 primeiro, depois Supabase (fallback para arquivos antigos).
 *
 * Props:
 *   filePath   - caminho do arquivo no storage ou URL legada https://
 *   label      - texto do botão
 *   expiresIn  - segundos de validade do link (padrão: 3600)
 *   asLink     - se true, renderiza como link inline
 *   mode       - 'download' | 'view'
 *   storage    - 'r2' | 'supabase' | undefined (auto-detect via backend)
 */
export default function SupabaseFileLink({ filePath, label = 'Baixar Arquivo', expiresIn = 3600, asLink = false, mode = 'download', storage }) {
  const [loading, setLoading] = useState(false);

  if (!filePath) return null;

  const getUrl = async () => {
    // URL absoluta legada — usa direto
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;

    const res = await base44.functions.invoke('getFileSignedUrl', { filePath, expiresIn, storage });
    const url = res?.data?.signedUrl;
    if (!url) throw new Error('Não foi possível gerar o link.');
    return url;
  };

  const handleView = async () => {
    setLoading(true);
    try {
      const url = await getUrl();
      window.open(url, '_blank');
    } catch (err) {
      console.error('[FileLink] Erro ao visualizar:', err);
      alert('Erro ao abrir arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const fileName = filePath.split('/').pop() || 'arquivo';
      const url = await getUrl();

      // Tenta fetch direto; se CORS bloquear, abre em nova aba
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('fetch failed');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = decodeURIComponent(fileName);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Fallback: abre em nova aba (funciona para Supabase e URLs públicas)
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('[FileLink] Erro ao baixar arquivo:', err);
      alert('Erro ao baixar arquivo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = mode === 'view' ? handleView : handleDownload;

  if (asLink) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        title={mode === 'view' ? 'Visualizar' : 'Baixar'}
        className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-900 hover:underline disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : mode === 'view' ? <Eye className="w-4 h-4" /> : <ExternalLink className="w-3 h-3" />}
        {label}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      title={mode === 'view' ? 'Visualizar' : 'Baixar'}
      className="gap-2"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'view' ? <Eye className="w-4 h-4" /> : <Download className="w-4 h-4" />}
      {label}
    </Button>
  );
}