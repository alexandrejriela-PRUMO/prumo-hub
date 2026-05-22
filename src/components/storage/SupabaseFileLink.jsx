import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ExternalLink, Eye } from 'lucide-react';

/**
 * Componente universal de download/visualização de arquivos armazenados no Cloudflare R2.
 * Mantém a mesma interface de props de antes para compatibilidade total.
 * Arquivos com URL https:// legadas são abertos diretamente (sem assinatura).
 *
 * Props:
 *   filePath   - caminho do arquivo no bucket R2 (ou URL legada https://)
 *   label      - texto do botão
 *   expiresIn  - segundos de validade do link (padrão: 3600)
 *   asLink     - se true, renderiza como link inline
 *   mode       - 'download' | 'view'
 */
function isLegacyUrl(filePath) {
  return filePath && (filePath.startsWith('http://') || filePath.startsWith('https://'));
}

export default function SupabaseFileLink({ filePath, label = 'Baixar Arquivo', expiresIn = 3600, asLink = false, mode = 'download' }) {
  const [loading, setLoading] = useState(false);

  if (!filePath) return null;

  const getSignedUrl = async () => {
    if (isLegacyUrl(filePath)) return filePath;
    const res = await base44.functions.invoke('r2GetSignedUrl', { filePath, expiresIn });
    const url = res?.data?.signedUrl;
    if (!url) throw new Error('Não foi possível gerar o link.');
    return url;
  };

  const handleView = async () => {
    setLoading(true);
    try {
      const url = await getSignedUrl();
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
      const signedUrl = await getSignedUrl();

      if (isLegacyUrl(filePath)) {
        window.open(signedUrl, '_blank');
        return;
      }

      const response = await fetch(signedUrl);
      if (!response.ok) { alert('Erro ao baixar arquivo.'); return; }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = decodeURIComponent(fileName);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
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