import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportToCSV(alerts, filename = 'alertas-relatorio') {
  if (alerts.length === 0) {
    alert('Nenhum dado para exportar');
    return;
  }

  // Prepare CSV headers
  const headers = ['Data', 'Título/Tipo', 'Tipo de Alerta', 'Gravidade', 'Área (ha)', 'Status', 'Descrição'];

  // Prepare CSV rows
  const rows = alerts.map(alert => [
    new Date(alert.alertDate).toLocaleDateString('pt-BR'),
    alert.title || alert.type || '-',
    alert.alertCategory === 'climate' ? 'Climático' : 'Ambiental',
    alert.severity || '-',
    (alert.affected_area_hectares || 0).toFixed(2),
    alert.status || 'Aberto',
    (alert.description || alert.message || '-').substring(0, 50)
  ]);

  // Create CSV content
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(alerts, severityChart, typeChart, filename = 'alertas-relatorio') {
  if (alerts.length === 0) {
    alert('Nenhum dado para exportar');
    return;
  }

  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(27, 67, 50); // Emerald color
  doc.text('Relatório de Alertas Ambientais e Climáticos', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  // Summary Section
  doc.setFontSize(12);
  doc.setTextColor(27, 67, 50);
  doc.text('Resumo', 20, yPosition);

  yPosition += 10;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const totalArea = alerts.reduce((sum, a) => sum + (a.affected_area_hectares || 0), 0);
  const criticalCount = alerts.filter(a => a.severity === 'Crítica').length;
  const openCount = alerts.filter(a => a.status === 'Aberto').length;

  const summaryData = [
    ['Total de Alertas', alerts.length.toString()],
    ['Críticos', criticalCount.toString()],
    ['Área Total Afetada (ha)', totalArea.toFixed(2)],
    ['Em Aberto', openCount.toString()]
  ];

  doc.autoTable({
    startY: yPosition,
    head: [['Métrica', 'Valor']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [27, 67, 50], textColor: 255 },
    alternateRowStyles: { fillColor: [230, 245, 240] }
  });

  yPosition = doc.lastAutoTable.finalY + 15;

  // Alerts Table
  doc.setFontSize(12);
  doc.setTextColor(27, 67, 50);
  doc.text('Detalhes dos Alertas', 20, yPosition);

  yPosition += 10;

  const tableData = alerts.slice(0, 30).map(alert => [
    new Date(alert.alertDate).toLocaleDateString('pt-BR'),
    (alert.title || alert.type || '-').substring(0, 25),
    alert.severity || '-',
    (alert.affected_area_hectares || 0).toFixed(2),
    alert.status || 'Aberto',
    (alert.description || alert.message || '-').substring(0, 20)
  ]);

  doc.autoTable({
    startY: yPosition,
    head: [['Data', 'Tipo', 'Gravidade', 'Área (ha)', 'Status', 'Descrição']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [27, 67, 50], textColor: 255 },
    alternateRowStyles: { fillColor: [230, 245, 240] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 }
    }
  });

  if (alerts.length > 30) {
    doc.text(`... e mais ${alerts.length - 30} alertas (veja o arquivo CSV para a lista completa)`, 20, doc.lastAutoTable.finalY + 10);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Página 1 de 1`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Download
  doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
}