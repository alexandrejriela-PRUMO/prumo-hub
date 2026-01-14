import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const exportToPDF = async (data, config, user) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(22, 163, 74);
  doc.text(config.title || 'Relatório Personalizado', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado por: ${user.email}`, 14, 28);
  doc.text(`Data: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 14, 33);
  
  let yPos = 45;

  // Properties
  if (data.properties.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Propriedades', 14, yPos);
    yPos += 8;

    doc.setFontSize(9);
    data.properties.forEach((p, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${idx + 1}. ${p.property_name}`, 14, yPos);
      yPos += 5;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`   Local: ${p.city}, ${p.state}`, 14, yPos);
      yPos += 4;
      doc.text(`   Hectares: ${p.total_hectares || '-'} | Atividade: ${p.main_activity || '-'}`, 14, yPos);
      yPos += 7;
      doc.setFontSize(9);
      doc.setTextColor(0);
    });
    yPos += 5;
  }

  // Licenses
  if (data.licenses.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Licenças Ambientais', 14, yPos);
    yPos += 8;

    doc.setFontSize(9);
    data.licenses.forEach((l, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${idx + 1}. ${l.license_type} - ${l.license_number || 'S/N'}`, 14, yPos);
      yPos += 5;
      doc.setFontSize(8);
      doc.setTextColor(100);
      const issueDate = l.issue_date ? format(new Date(l.issue_date), 'dd/MM/yyyy') : '-';
      const expiryDate = l.expiry_date ? format(new Date(l.expiry_date), 'dd/MM/yyyy') : '-';
      doc.text(`   Emissão: ${issueDate} | Validade: ${expiryDate} | Status: ${l.status}`, 14, yPos);
      yPos += 7;
      doc.setFontSize(9);
      doc.setTextColor(0);
    });
    yPos += 5;
  }

  // Alerts
  if (data.alerts.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Alertas Ambientais', 14, yPos);
    yPos += 8;

    doc.setFontSize(9);
    data.alerts.forEach((a, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${idx + 1}. ${a.title}`, 14, yPos);
      yPos += 5;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`   Tipo: ${a.alert_type} | Gravidade: ${a.severity}`, 14, yPos);
      yPos += 4;
      doc.text(`   Data: ${format(new Date(a.detection_date), 'dd/MM/yyyy')} | Status: ${a.status}`, 14, yPos);
      yPos += 7;
      doc.setFontSize(9);
      doc.setTextColor(0);
    });
    yPos += 5;
  }

  // Documents
  if (data.documents.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Documentos', 14, yPos);
    yPos += 8;

    doc.setFontSize(9);
    data.documents.forEach((d, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${idx + 1}. ${d.document_name}`, 14, yPos);
      yPos += 5;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`   Tipo: ${d.document_type} | Versão: ${d.current_version || 1}`, 14, yPos);
      yPos += 7;
      doc.setFontSize(9);
      doc.setTextColor(0);
    });
  }

  const fileName = `${config.title || 'relatorio'}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
  doc.save(fileName);
};