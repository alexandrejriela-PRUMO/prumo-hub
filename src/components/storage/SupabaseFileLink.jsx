import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ExternalLink } from 'lucide-react';

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

export default function SupabaseFileLink({ filePath, label = 'Baixar Arquivo', expiresIn = 3600, asLink = false }) {
  const [loading, setLoading] = useState(false);

  if (!filePath) return null;

  const handleClick = async () => {
    // Arquivos legados (base44, URLs externas): abre diretamente
    if (isLegacyUrl(filePath)) {
      window.open(filePath, '_blank');
      return;
    }
    // Arquivos novos no Supabase: gera URL assinada temporária
    setLoading(true);
    try {
      const res = await base44.functions.invoke('supabaseGetSignedUrl', { filePath, expiresIn });
      const signedUrl = res?.data?.signedUrl;
      if (!signedUrl) {
        console.error('[SupabaseFileLink] URL assinada não retornada:', res?.data);
        alert('Não foi possível gerar o link de download. Tente novamente.');
        return;
      }
      window.open(signedUrl, '_blank');
    } catch (err) {
      console.error('[SupabaseFileLink] Erro ao gerar URL assinada:', err);
      alert('Erro ao gerar link de download.');
    } finally {
      setLoading(false);
    }
  };

  if (asLink) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-900 hover:underline disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
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
      className="gap-2"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {label}
    </Button>
  );
}