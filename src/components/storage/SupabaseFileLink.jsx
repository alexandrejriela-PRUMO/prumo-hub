import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ExternalLink, Eye } from 'lucide-react';

/**
 * Componente para gerar e abrir um link assinado temporário de um arquivo no Supabase Storage.
 * 
 * Props:
 *   filePath   - caminho do arquivo no bucket (retornado pelo upload)
 *   label      - texto do botão (opcional)
 *   expiresIn  - segundos de validade do link (padrão: 3600 = 1h)
 *   asLink     - se true, renderiza como link em vez de botão
 */
// Detecta se é URL legada do base44 ou URL externa (não é um path relativo do Supabase)
function isLegacyUrl(filePath) {
  return filePath && (filePath.startsWith('http://') || filePath.startsWith('https://'));
}

export default function SupabaseFileLink({ filePath, label = 'Baixar Arquivo', expiresIn = 3600, asLink = false, mode = 'download' }) {
  const [loading, setLoading] = useState(false);

  if (!filePath) return null;

  // Obtém URL assinada e abre para visualização em nova aba
  const handleView = async () => {
    setLoading(true);
    try {
      if (isLegacyUrl(filePath)) {
        window.open(filePath, '_blank');
        return;
      }
      const res = await base44.functions.invoke('supabaseGetSignedUrl', { filePath, expiresIn });
      const url = res?.data?.signedUrl;
      if (!url) { alert('Não foi possível gerar o link. Tente novamente.'); return; }
      window.open(url, '_blank');
    } catch (err) {
      console.error('[SupabaseFileLink] Erro ao visualizar:', err);
      alert('Erro ao abrir arquivo.');
    } finally {
      setLoading(false);
    }
  };

  // Faz download via proxy do backend
  const handleDownload = async () => {
    setLoading(true);
    try {
      const fileName = filePath.split('/').pop() || 'arquivo';
      if (isLegacyUrl(filePath)) {
        window.open(filePath, '_blank');
        return;
      }
      const res = await base44.functions.invoke('supabaseDownloadFile', { filePath });
      const blob = new Blob([res.data], { type: 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('[SupabaseFileLink] Erro ao baixar arquivo:', err);
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