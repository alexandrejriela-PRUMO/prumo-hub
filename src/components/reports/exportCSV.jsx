import { format } from 'date-fns';

const downloadCSV = (content, filename) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const exportToCSV = (data, config) => {
  let csvContent = '';
  
  // Header
  csvContent += `Relatório: ${config.title || 'Personalizado'}\n`;
  csvContent += `Data de Geração: ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n\n`;

  // Properties
  if (data.properties.length > 0) {
    csvContent += 'PROPRIEDADES\n';
    csvContent += 'Nome,Localização,Hectares,Atividade\n';
    data.properties.forEach(p => {
      csvContent += [
        escapeCSV(p.property_name),
        escapeCSV(`${p.city}, ${p.state}`),
        escapeCSV(p.total_hectares),
        escapeCSV(p.main_activity)
      ].join(',') + '\n';
    });
    csvContent += '\n';
  }

  // Licenses
  if (data.licenses.length > 0) {
    csvContent += 'LICENÇAS AMBIENTAIS\n';
    csvContent += 'Tipo,Número,Emissão,Validade,Status\n';
    data.licenses.forEach(l => {
      csvContent += [
        escapeCSV(l.license_type),
        escapeCSV(l.license_number),
        escapeCSV(l.issue_date ? format(new Date(l.issue_date), 'dd/MM/yyyy') : ''),
        escapeCSV(l.expiry_date ? format(new Date(l.expiry_date), 'dd/MM/yyyy') : ''),
        escapeCSV(l.status)
      ].join(',') + '\n';
    });
    csvContent += '\n';
  }

  // Alerts
  if (data.alerts.length > 0) {
    csvContent += 'ALERTAS AMBIENTAIS\n';
    csvContent += 'Título,Tipo,Gravidade,Data,Status,Descrição\n';
    data.alerts.forEach(a => {
      csvContent += [
        escapeCSV(a.title),
        escapeCSV(a.alert_type),
        escapeCSV(a.severity),
        escapeCSV(format(new Date(a.detection_date), 'dd/MM/yyyy')),
        escapeCSV(a.status),
        escapeCSV(a.description)
      ].join(',') + '\n';
    });
    csvContent += '\n';
  }

  // Documents
  if (data.documents.length > 0) {
    csvContent += 'DOCUMENTOS\n';
    csvContent += 'Nome,Tipo,Versão\n';
    data.documents.forEach(d => {
      csvContent += [
        escapeCSV(d.document_name),
        escapeCSV(d.document_type),
        escapeCSV(d.current_version)
      ].join(',') + '\n';
    });
    csvContent += '\n';
  }

  // Processes
  if (data.processes.length > 0) {
    csvContent += 'PROCESSOS\n';
    csvContent += 'Tipo,Número,Assunto,Data,Status\n';
    data.processes.forEach(p => {
      csvContent += [
        escapeCSV(p.process_type),
        escapeCSV(p.process_number),
        escapeCSV(p.subject),
        escapeCSV(p.filing_date ? format(new Date(p.filing_date), 'dd/MM/yyyy') : ''),
        escapeCSV(p.status)
      ].join(',') + '\n';
    });
    csvContent += '\n';
  }

  // Invoices
  if (data.invoices.length > 0) {
    csvContent += 'FATURAS\n';
    csvContent += 'Descrição,Valor,Vencimento,Status\n';
    data.invoices.forEach(i => {
      csvContent += [
        escapeCSV(i.description),
        escapeCSV(i.amount),
        escapeCSV(i.due_date ? format(new Date(i.due_date), 'dd/MM/yyyy') : ''),
        escapeCSV(i.status)
      ].join(',') + '\n';
    });
  }

  const filename = `${config.title || 'relatorio'}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
  downloadCSV(csvContent, filename);
};