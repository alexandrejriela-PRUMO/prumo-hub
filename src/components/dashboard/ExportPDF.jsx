import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ExportPDF({ user, property, licenses, documents, processes, alerts }) {
  const [exporting, setExporting] = useState(false);

  const exportToPDF = async () => {
    setExporting(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      // Header
      pdf.setFillColor(27, 67, 50); // emerald-900
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Santa Rute Engenharia Rural', margin, 20);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Relatório do Dashboard', margin, 30);

      // User Info
      let yPos = 55;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.text(`Cliente: ${user?.full_name || 'N/A'}`, margin, yPos);
      yPos += 6;
      pdf.text(`Email: ${user?.email || 'N/A'}`, margin, yPos);
      yPos += 6;
      pdf.text(`Data: ${format(new Date(), 'PPP', { locale: ptBR })}`, margin, yPos);
      yPos += 10;

      // Property Info
      if (property) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Propriedade', margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Nome: ${property.property_name}`, margin, yPos);
        yPos += 6;
        pdf.text(`Localização: ${property.city}/${property.state}`, margin, yPos);
        yPos += 6;
        pdf.text(`Área Total: ${property.total_hectares || 'N/A'} ha`, margin, yPos);
        yPos += 6;
        pdf.text(`APP: ${property.app_hectares || 'N/A'} ha`, margin, yPos);
        yPos += 6;
        pdf.text(`Reserva Legal: ${property.legal_reserve_hectares || 'N/A'} ha`, margin, yPos);
        yPos += 10;
      }

      // Metrics Summary
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resumo de Métricas', margin, yPos);
      yPos += 8;

      const validLicenses = licenses.filter(l => l.status === 'Vigente').length;
      const expiredLicenses = licenses.filter(l => l.status === 'Vencida').length;
      const activeProcesses = processes.filter(p => p.status === 'Em Andamento').length;
      const activeAlerts = alerts.filter(a => a.status === 'Ativo').length;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Draw metrics boxes
      const boxWidth = (pageWidth - 2 * margin - 10) / 2;
      const boxHeight = 15;
      
      // License box
      pdf.setFillColor(240, 253, 244);
      pdf.rect(margin, yPos, boxWidth, boxHeight, 'F');
      pdf.text(`Licenças Vigentes: ${validLicenses} / ${licenses.length}`, margin + 3, yPos + 10);
      
      // Documents box
      pdf.setFillColor(239, 246, 255);
      pdf.rect(margin + boxWidth + 10, yPos, boxWidth, boxHeight, 'F');
      pdf.text(`Documentos: ${documents.length}`, margin + boxWidth + 13, yPos + 10);
      
      yPos += boxHeight + 5;
      
      // Processes box
      pdf.setFillColor(255, 251, 235);
      pdf.rect(margin, yPos, boxWidth, boxHeight, 'F');
      pdf.text(`Processos Ativos: ${activeProcesses}`, margin + 3, yPos + 10);
      
      // Alerts box
      pdf.setFillColor(254, 242, 242);
      pdf.rect(margin + boxWidth + 10, yPos, boxWidth, boxHeight, 'F');
      pdf.text(`Alertas Ativos: ${activeAlerts}`, margin + boxWidth + 13, yPos + 10);
      
      yPos += boxHeight + 15;

      // Licenses Details
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = 20;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Licenças Ambientais', margin, yPos);
      yPos += 8;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      licenses.slice(0, 10).forEach((license, idx) => {
        if (yPos > pageHeight - 30) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.text(`${idx + 1}. ${license.license_type} - ${license.status}`, margin, yPos);
        yPos += 5;
        if (license.expiry_date) {
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`   Validade: ${format(new Date(license.expiry_date), 'dd/MM/yyyy')}`, margin, yPos);
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(9);
          yPos += 6;
        }
      });

      if (licenses.length > 10) {
        yPos += 5;
        pdf.setTextColor(100, 100, 100);
        pdf.text(`... e mais ${licenses.length - 10} licenças`, margin, yPos);
        pdf.setTextColor(0, 0, 0);
      }

      // Processes Section
      if (processes.length > 0) {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = 20;
        }

        yPos += 10;
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Processos', margin, yPos);
        yPos += 8;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        processes.slice(0, 5).forEach((process, idx) => {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
          }
          
          pdf.text(`${idx + 1}. ${process.process_type} - ${process.status}`, margin, yPos);
          yPos += 5;
          if (process.subject) {
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`   Assunto: ${process.subject.substring(0, 60)}${process.subject.length > 60 ? '...' : ''}`, margin, yPos);
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(9);
            yPos += 6;
          }
        });

        if (processes.length > 5) {
          yPos += 5;
          pdf.setTextColor(100, 100, 100);
          pdf.text(`... e mais ${processes.length - 5} processos`, margin, yPos);
          pdf.setTextColor(0, 0, 0);
        }
      }

      // Alerts Section
      if (alerts.length > 0) {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = 20;
        }

        yPos += 10;
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Alertas Ambientais', margin, yPos);
        yPos += 8;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        const activeAlertsData = alerts.filter(a => a.status === 'Ativo').slice(0, 5);
        activeAlertsData.forEach((alert, idx) => {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 20;
          }
          
          const severityColor = {
            'Crítica': [220, 38, 38],
            'Alta': [245, 158, 11],
            'Média': [234, 179, 8],
            'Baixa': [16, 185, 129]
          }[alert.severity] || [100, 100, 100];
          
          pdf.setTextColor(...severityColor);
          pdf.text(`${idx + 1}. [${alert.severity}] ${alert.alert_type}`, margin, yPos);
          pdf.setTextColor(0, 0, 0);
          yPos += 5;
          if (alert.title) {
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`   ${alert.title.substring(0, 60)}${alert.title.length > 60 ? '...' : ''}`, margin, yPos);
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(9);
            yPos += 6;
          }
        });

        if (alerts.filter(a => a.status === 'Ativo').length > 5) {
          yPos += 5;
          pdf.setTextColor(100, 100, 100);
          pdf.text(`... e mais ${alerts.filter(a => a.status === 'Ativo').length - 5} alertas ativos`, margin, yPos);
          pdf.setTextColor(0, 0, 0);
        }
      }

      // Footer on all pages
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        const footerY = pageHeight - 15;
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Santa Rute Engenharia Rural - Relatório gerado automaticamente', margin, footerY);
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 30, footerY);
      }

      // Save PDF
      const fileName = `Dashboard_${property?.property_name || 'SantaRute'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      onClick={exportToPDF}
      disabled={exporting}
      className="bg-emerald-600 hover:bg-emerald-700"
    >
      {exporting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </>
      )}
    </Button>
  );
}