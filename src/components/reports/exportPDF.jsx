import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const exportToPDF = async (data, config, user) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(22, 163, 74); // emerald-600
  doc.text(config.title || 'Relatório Personalizado', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado por: ${user.email}`, 14, 28);
  doc.text(`Data: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 33);
  
  let yPos = 45;

  // Properties
  if (data.properties.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Propriedades', 14, yPos);
    yPos += 5;

    const propertyRows = data.properties.map(p => [
      p.property_name,
      `${p.city}, ${p.state}`,
      p.total_hectares?.toString() || '-',
      p.main_activity || '-'
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Nome', 'Localização', 'Hectares', 'Atividade']],
      body: propertyRows,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 9 }
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Licenses
  if (data.licenses.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Licenças Ambientais', 14, yPos);
    yPos += 5;

    const licenseRows = data.licenses.map(l => [
      l.license_type,
      l.license_number || '-',
      l.issue_date ? format(new Date(l.issue_date), 'dd/MM/yyyy') : '-',
      l.expiry_date ? format(new Date(l.expiry_date), 'dd/MM/yyyy') : '-',
      l.status
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Tipo', 'Número', 'Emissão', 'Validade', 'Status']],
      body: licenseRows,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 9 }
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Alerts
  if (data.alerts.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Alertas Ambientais', 14, yPos);
    yPos += 5;

    const alertRows = data.alerts.map(a => [
      a.title,
      a.alert_type,
      a.severity,
      format(new Date(a.detection_date), 'dd/MM/yyyy'),
      a.status
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Título', 'Tipo', 'Gravidade', 'Data', 'Status']],
      body: alertRows,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 9 }
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Documents
  if (data.documents.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Documentos', 14, yPos);
    yPos += 5;

    const docRows = data.documents.map(d => [
      d.document_name,
      d.document_type,
      d.current_version?.toString() || '1'
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Nome', 'Tipo', 'Versão']],
      body: docRows,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 9 }
    });
  }

  // Save
  const fileName = `${config.title || 'relatorio'}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
  doc.save(fileName);
};