import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Loader } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';

export default function DashboardFullExport({ user }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateFullExport = async () => {
    setIsGenerating(true);
    try {
      // Fetch all data
      const [properties, licenses, documents, processes, prads, alerts, invoices, requests] = await Promise.all([
        base44.entities.Property.filter({ owner_email: user?.email }),
        base44.entities.License.filter({ owner_email: user?.email }),
        base44.entities.Document.filter({ owner_email: user?.email }),
        base44.entities.Process.filter({ client_email: user?.email }),
        base44.entities.PRAD.filter({ owner_email: user?.email }),
        base44.entities.EnvironmentalAlert.list(),
        base44.entities.Invoice.filter({ client_email: user?.email }),
        base44.entities.Request.filter({ client_email: user?.email })
      ]);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 15;
      const margin = 15;

      const addNewPage = () => {
        doc.addPage();
        yPosition = margin;
      };

      const checkPageSpace = (requiredSpace = 30) => {
        if (yPosition + requiredSpace > pageHeight - 10) {
          addNewPage();
        }
      };

      // Header
      doc.setFillColor(34, 197, 94);
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('RELATÓRIO COMPLETO - SANTA RUTE', margin, 12);
      doc.setFontSize(10);
      doc.text(`Usuário: ${user?.full_name} (${user?.email})`, margin, 20);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin, 26);
      
      doc.setTextColor(0, 0, 0);
      yPosition = 35;

      // RESUMO EXECUTIVO
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('RESUMO EXECUTIVO', margin, yPosition);
      yPosition += 10;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      
      const summaryData = [
        `Total de Propriedades: ${properties.length}`,
        `Total de Licenças: ${licenses.length}`,
        `Total de Documentos: ${documents.length}`,
        `Total de Processos: ${processes.length}`,
        `Total de PRADs: ${prads.length}`,
        `Total de Alertas Ambientais: ${alerts.length}`,
        `Total de Faturas: ${invoices.length}`,
        `Total de Requerimentos: ${requests.length}`,
        `Alertas Críticos: ${alerts.filter(a => a.severity === 'Crítica').length}`,
        `Licenças Vencidas: ${licenses.filter(l => l.status === 'Vencida').length}`
      ];

      summaryData.forEach(item => {
        doc.text(`• ${item}`, margin + 5, yPosition);
        yPosition += 5;
      });

      yPosition += 5;

      // PROPRIEDADES
      if (properties.length > 0) {
        checkPageSpace(40);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('1. PROPRIEDADES', margin, yPosition);
        yPosition += 8;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        properties.forEach((prop, idx) => {
          checkPageSpace(20);
          doc.setFont(undefined, 'bold');
          doc.text(`${idx + 1}. ${prop.property_name}`, margin + 5, yPosition);
          yPosition += 4;

          doc.setFont(undefined, 'normal');
          doc.text(`Localização: ${prop.city}/${prop.state}`, margin + 10, yPosition);
          yPosition += 3;
          doc.text(`Área Total: ${prop.total_hectares || '-'} ha`, margin + 10, yPosition);
          yPosition += 3;
          if (prop.main_activity) {
            doc.text(`Atividade: ${prop.main_activity}`, margin + 10, yPosition);
            yPosition += 3;
          }
          yPosition += 2;
        });
      }

      // LICENÇAS
      if (licenses.length > 0) {
        checkPageSpace(50);
        yPosition += 5;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('2. LICENÇAS AMBIENTAIS', margin, yPosition);
        yPosition += 8;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        licenses.forEach((lic, idx) => {
          checkPageSpace(15);
          doc.setFont(undefined, 'bold');
          doc.text(`${idx + 1}. ${lic.license_type} - Nº ${lic.license_number || '-'}`, margin + 5, yPosition);
          yPosition += 4;

          doc.setFont(undefined, 'normal');
          doc.text(`Status: ${lic.status}`, margin + 10, yPosition);
          yPosition += 3;
          if (lic.expiry_date) {
            doc.text(`Validade: ${format(new Date(lic.expiry_date), 'dd/MM/yyyy')}`, margin + 10, yPosition);
            yPosition += 3;
          }
          if (lic.activity_description) {
            const desc = doc.splitTextToSize(lic.activity_description, pageWidth - margin * 2 - 10);
            doc.text(`Atividade: ${desc[0]}`, margin + 10, yPosition);
            yPosition += 3;
          }
          yPosition += 1;
        });
      }

      // PROCESSOS
      if (processes.length > 0) {
        checkPageSpace(50);
        yPosition += 5;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('3. PROCESSOS', margin, yPosition);
        yPosition += 8;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        processes.forEach((proc, idx) => {
          checkPageSpace(15);
          doc.setFont(undefined, 'bold');
          doc.text(`${idx + 1}. ${proc.process_number}`, margin + 5, yPosition);
          yPosition += 4;

          doc.setFont(undefined, 'normal');
          doc.text(`Tipo: ${proc.process_type}`, margin + 10, yPosition);
          yPosition += 3;
          doc.text(`Assunto: ${proc.subject}`, margin + 10, yPosition);
          yPosition += 3;
          doc.text(`Status: ${proc.status}`, margin + 10, yPosition);
          yPosition += 3;
          yPosition += 1;
        });
      }

      // PRADs
      if (prads.length > 0) {
        checkPageSpace(50);
        yPosition += 5;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('4. PROJETOS PRAD', margin, yPosition);
        yPosition += 8;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        prads.forEach((prad, idx) => {
          checkPageSpace(20);
          doc.setFont(undefined, 'bold');
          doc.text(`${idx + 1}. ${prad.project_name}`, margin + 5, yPosition);
          yPosition += 4;

          doc.setFont(undefined, 'normal');
          if (prad.area_identification?.total_area_ha) {
            doc.text(`Área: ${prad.area_identification.total_area_ha} ha`, margin + 10, yPosition);
            yPosition += 3;
          }
          if (prad.area_identification?.degradation_type) {
            doc.text(`Tipo: ${prad.area_identification.degradation_type}`, margin + 10, yPosition);
            yPosition += 3;
          }
          doc.text(`Status: ${prad.status || '-'}`, margin + 10, yPosition);
          yPosition += 3;
          if (prad.monitoring) {
            doc.text(`Sobrevivência: ${prad.monitoring.survival_rate || 0}%`, margin + 10, yPosition);
            yPosition += 3;
          }
          yPosition += 1;
        });
      }

      // ALERTAS AMBIENTAIS
      if (alerts.length > 0) {
        checkPageSpace(50);
        yPosition += 5;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('5. ALERTAS AMBIENTAIS', margin, yPosition);
        yPosition += 8;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        alerts.slice(0, 20).forEach((alert, idx) => {
          checkPageSpace(15);
          doc.setFont(undefined, 'bold');
          doc.text(`${idx + 1}. ${alert.title}`, margin + 5, yPosition);
          yPosition += 4;

          doc.setFont(undefined, 'normal');
          doc.text(`Tipo: ${alert.alert_type} | Severidade: ${alert.severity}`, margin + 10, yPosition);
          yPosition += 3;
          doc.text(`Data: ${format(new Date(alert.detection_date), 'dd/MM/yyyy')}`, margin + 10, yPosition);
          yPosition += 3;
          yPosition += 1;
        });

        if (alerts.length > 20) {
          doc.text(`... e mais ${alerts.length - 20} alertas`, margin + 5, yPosition);
        }
      }

      // DOCUMENTOS
      if (documents.length > 0) {
        checkPageSpace(40);
        yPosition += 5;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('6. DOCUMENTOS', margin, yPosition);
        yPosition += 8;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        documents.forEach((doc_item, idx) => {
          checkPageSpace(10);
          doc.text(`${idx + 1}. ${doc_item.document_name} (${doc_item.document_type})`, margin + 5, yPosition);
          yPosition += 4;
        });
      }

      // FATURAS
      if (invoices.length > 0) {
        checkPageSpace(40);
        yPosition += 5;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('7. FATURAS/BOLETOS', margin, yPosition);
        yPosition += 8;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        const invoiceData = [['Data', 'Descrição', 'Valor', 'Status']];
        invoices.forEach(inv => {
          invoiceData.push([
            format(new Date(inv.created_date), 'dd/MM/yyyy'),
            inv.description || '-',
            `R$ ${inv.amount?.toFixed(2) || 0}`,
            inv.status
          ]);
        });

        doc.autoTable({
          head: [invoiceData[0]],
          body: invoiceData.slice(1),
          startY: yPosition,
          margin: margin,
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 70 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 }
          },
          didDrawPage: (data) => {
            yPosition = data.lastAutoTable.finalY + 5;
          }
        });
      }

      // REQUERIMENTOS
      if (requests.length > 0) {
        checkPageSpace(40);
        yPosition += 5;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('8. REQUERIMENTOS/CONSULTORIA', margin, yPosition);
        yPosition += 8;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        requests.forEach((req, idx) => {
          checkPageSpace(12);
          doc.setFont(undefined, 'bold');
          doc.text(`${idx + 1}. ${req.subject}`, margin + 5, yPosition);
          yPosition += 4;

          doc.setFont(undefined, 'normal');
          doc.text(`Categoria: ${req.category} | Status: ${req.status}`, margin + 10, yPosition);
          yPosition += 3;
          yPosition += 1;
        });
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      }

      doc.save(`Santa_Rute_Relatorio_Completo_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 w-full"
          size="lg"
        >
          <Download className="w-5 h-5 mr-2" />
          Exportar Dados Completos
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar Dados Completos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            Gere um relatório PDF completo com todas as suas informações no sistema Santa Rute, incluindo:
          </p>
          <ul className="text-sm text-gray-700 space-y-2 ml-4">
            <li>✓ Resumo executivo com totais</li>
            <li>✓ Detalhes de todas as propriedades</li>
            <li>✓ Licenças ambientais</li>
            <li>✓ Processos e autos</li>
            <li>✓ Projetos PRAD</li>
            <li>✓ Alertas ambientais</li>
            <li>✓ Documentos cadastrados</li>
            <li>✓ Faturas e boletos</li>
            <li>✓ Requerimentos de consultoria</li>
          </ul>
          <Button
            onClick={generateFullExport}
            disabled={isGenerating}
            className="w-full bg-emerald-600 hover:bg-emerald-700 mt-6"
          >
            {isGenerating ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Gerar e Baixar PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}