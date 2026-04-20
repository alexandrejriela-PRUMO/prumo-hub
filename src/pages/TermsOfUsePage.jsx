import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, CheckCircle } from 'lucide-react';

export default function TermsOfUsePage({ onAccepted }) {
  const [terms, setTerms] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await base44.entities.TermsOfUse.filter({ is_active: true }, '-version', 1);
        if (all && all.length > 0) {
          setTerms(all[0]);
        }
      } catch (e) {
        console.error('Erro ao carregar termos:', e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleAccept = async () => {
    if (!accepted || !terms) return;
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const now = new Date().toISOString();

      await Promise.all([
        base44.auth.updateMe({
          accepted_terms_version: terms.version,
          accepted_terms_date: now,
        }),
        base44.entities.TermsAcceptanceLog.create({
          user_email: user.email,
          user_name: user.full_name || '',
          terms_version: terms.version,
          accepted_at: now,
          user_agent: navigator.userAgent,
        }),
      ]);

      // Generate and download PDF proof
      try {
        const pdfResponse = await base44.functions.invoke('generateAcceptanceProofPDF', {
          type: 'terms',
        });
        if (pdfResponse.data && typeof pdfResponse.data === 'string') {
          const link = document.createElement('a');
          link.href = `data:application/pdf;base64,${btoa(pdfResponse.data)}`;
          link.download = `Comprovante_Termos_${user.email}_${new Date().getTime()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (pdfError) {
        console.warn('Aviso: PDF não gerado, mas aceite foi registrado:', pdfError);
      }

      if (onAccepted) onAccepted();
    } catch (e) {
      console.error('Erro ao salvar aceite:', e);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 to-emerald-900">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 px-8 py-6 flex items-center gap-4">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
            alt="PRUMO Hub"
            className="h-12 w-auto object-contain"
          />
          <div>
            <h1 className="text-white text-xl font-bold">Termos de Uso</h1>
            {terms && (
              <p className="text-emerald-200 text-sm">Versão {terms.version} — {terms.published_at || 'Vigente'}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {terms ? (
            <ScrollArea className="h-96 border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: terms.content }}
              />
            </ScrollArea>
          ) : (
            <div className="h-96 border border-gray-200 rounded-xl p-6 bg-gray-50 flex flex-col items-center justify-center text-center gap-3">
              <FileText className="w-12 h-12 text-gray-300" />
              <p className="text-gray-500 font-medium">Nenhum termo de uso encontrado.</p>
              <p className="text-gray-400 text-sm">Entre em contato com o suporte.</p>
            </div>
          )}

          {/* Checkbox */}
          <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <Checkbox
              id="accept-terms"
              checked={accepted}
              onCheckedChange={setAccepted}
              className="mt-0.5"
            />
            <label htmlFor="accept-terms" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
              Li e concordo com os <strong>Termos de Uso</strong> da plataforma PRUMO Hub. Compreendo que o uso do serviço está sujeito às condições descritas acima.
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => base44.auth.logout()}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Sair
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!accepted || saving || !terms}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Aceitar e Continuar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}