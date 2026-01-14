import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Award, Download, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

export default function EnvironmentalCertificate({ property, esgScore }) {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEligible = esgScore >= 70;
  const generatedDate = new Date().toLocaleDateString('pt-BR');

  const downloadCertificate = async () => {
    if (!isEligible) return;

    setLoading(true);
    try {
      const element = document.getElementById('certificate-content');
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');

      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`certificado-ambiental-${property?.property_name?.replace(/\s+/g, '-')}.pdf`);

      toast.success('Certificado baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar certificado:', error);
      toast.error('Erro ao gerar certificado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isEligible && (
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Award className="w-4 h-4 mr-2" />
          Certificado Ambiental
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <DialogTitle>Certificado de Boas Práticas Ambientais</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDialog(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Certificado */}
          <div
            id="certificate-content"
            className="w-full aspect-video bg-white border-4 border-amber-700 rounded-lg p-12 flex flex-col items-center justify-center space-y-6 relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-4 right-4 w-24 h-24 text-amber-700">🌳</div>
              <div className="absolute bottom-4 left-4 w-24 h-24 text-amber-700">♻️</div>
            </div>

            {/* Conteúdo */}
            <div className="relative z-10 text-center space-y-4">
              {/* Logo e Título */}
              <div className="space-y-2">
                <div className="text-5xl">🏆</div>
                <h1 className="text-4xl font-bold text-amber-700">
                  Certificado de Excelência
                </h1>
                <p className="text-amber-600 text-lg">
                  Boas Práticas Ambientais e Gestão Sustentável
                </p>
              </div>

              {/* Divisor */}
              <div className="w-32 h-1 bg-gradient-to-r from-amber-200 via-amber-700 to-amber-200 mx-auto"></div>

              {/* Texto Principal */}
              <div className="space-y-3">
                <p className="text-gray-700 text-sm">
                  Este certificado é conferido a
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {property?.property_name}
                </p>
                <p className="text-gray-700 text-sm">
                  Localizada em {property?.city}, {property?.state}
                </p>
              </div>

              {/* Texto Descritivo */}
              <div className="max-w-2xl text-center space-y-2">
                <p className="text-gray-700 text-sm leading-relaxed">
                  Por demonstrar excelência na gestão ambiental, com desempenho destacado no Termômetro de Regularidade Ambiental, 
                  implementação de práticas sustentáveis, e comprometimento com a proteção ambiental e conservação de recursos naturais.
                </p>
              </div>

              {/* Escore ESG */}
              <div className="flex gap-8 justify-center pt-2">
                <div className="text-center">
                  <p className="text-xs text-gray-600">Escore ESG</p>
                  <p className="text-3xl font-bold text-amber-700">{esgScore}</p>
                  <p className="text-xs text-gray-600">/ 100</p>
                </div>
              </div>

              {/* Assinatura e Data */}
              <div className="pt-4 space-y-1 border-t border-gray-300 w-full">
                <p className="text-xs text-gray-600">SANTA RUTE Engenharia Rural</p>
                <p className="text-xs text-gray-500">Emitido em {generatedDate}</p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Fechar
            </Button>
            <Button
              onClick={downloadCertificate}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {loading ? 'Gerando...' : 'Baixar Certificado'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}