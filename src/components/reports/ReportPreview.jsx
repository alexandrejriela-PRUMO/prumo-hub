import React from 'react';
import { Download, FileText, Table as TableIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportToPDF } from './exportPDF';
import { exportToCSV } from './exportCSV';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

/**
 * ResponsiveTable – shows a normal <table> on desktop and a stack of cards on mobile.
 */
function ResponsiveTable({ title, columns, rows, renderCell }) {
  if (!rows.length) return null;
  return (
    <div>
      <h3 className="font-semibold text-lg mb-3">{title}</h3>

      {/* Desktop table */}
      <div className="hidden sm:block border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="text-left p-3 text-sm font-semibold">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="p-3 text-sm">
                    {renderCell ? renderCell(col.key, row) : row[col.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="border rounded-xl p-4 bg-white shadow-sm space-y-2">
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between items-start gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide shrink-0">
                  {col.label}
                </span>
                <span className="text-sm text-gray-900 text-right">
                  {renderCell ? renderCell(col.key, row) : row[col.key] ?? '-'}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportPreview({ data, config, user }) {
  const handleExportPDF = async () => {
    try {
      await exportToPDF(data, config, user);
      toast.success('Relatório exportado em PDF!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    }
  };

  const handleExportCSV = () => {
    try {
      exportToCSV(data, config);
      toast.success('Relatório exportado em CSV!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
    }
  };

  const getTotalCount = () =>
    data.properties.length + data.licenses.length + data.alerts.length +
    data.documents.length + data.processes.length + data.invoices.length;

  const statusBadge = (status, map) => {
    const cls = map[status] || 'bg-gray-100 text-gray-700';
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm">
      <div className="p-4 sm:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{config.title || 'Relatório Personalizado'}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <TableIcon className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 font-medium">Total</p>
            <p className="text-3xl font-bold text-blue-900 mt-1">{getTotalCount()}</p>
          </div>
          {data.properties.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 font-medium">Propriedades</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{data.properties.length}</p>
            </div>
          )}
          {data.alerts.length > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium">Alertas</p>
              <p className="text-3xl font-bold text-red-900 mt-1">{data.alerts.length}</p>
            </div>
          )}
          {data.licenses.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-700 font-medium">Licenças</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{data.licenses.length}</p>
            </div>
          )}
        </div>

        {/* Propriedades */}
        <ResponsiveTable
          title="Propriedades"
          columns={[
            { key: 'property_name', label: 'Nome' },
            { key: 'city', label: 'Cidade' },
            { key: 'total_hectares', label: 'Hectares' },
            { key: 'main_activity', label: 'Atividade' },
          ]}
          rows={data.properties}
          renderCell={(key, row) => {
            if (key === 'city') return `${row.city}, ${row.state}`;
            return row[key] ?? '-';
          }}
        />

        {/* Licenças */}
        <ResponsiveTable
          title="Licenças Ambientais"
          columns={[
            { key: 'license_type', label: 'Tipo' },
            { key: 'license_number', label: 'Número' },
            { key: 'issue_date', label: 'Emissão' },
            { key: 'expiry_date', label: 'Validade' },
            { key: 'status', label: 'Status' },
          ]}
          rows={data.licenses}
          renderCell={(key, row) => {
            if (key === 'issue_date') return row.issue_date ? format(new Date(row.issue_date), 'dd/MM/yyyy') : '-';
            if (key === 'expiry_date') return row.expiry_date ? format(new Date(row.expiry_date), 'dd/MM/yyyy') : '-';
            if (key === 'status') return statusBadge(row.status, { Vigente: 'bg-green-100 text-green-700' });
            return row[key] ?? '-';
          }}
        />

        {/* Alertas */}
        <ResponsiveTable
          title="Alertas Ambientais"
          columns={[
            { key: 'title', label: 'Título' },
            { key: 'alert_type', label: 'Tipo' },
            { key: 'severity', label: 'Gravidade' },
            { key: 'detection_date', label: 'Data' },
            { key: 'status', label: 'Status' },
          ]}
          rows={data.alerts}
          renderCell={(key, row) => {
            if (key === 'detection_date') return format(new Date(row.detection_date), 'dd/MM/yyyy');
            if (key === 'severity') return statusBadge(row.severity, {
              Crítica: 'bg-red-100 text-red-700',
              Alta: 'bg-orange-100 text-orange-700',
              Média: 'bg-yellow-100 text-yellow-700',
              Baixa: 'bg-blue-100 text-blue-700',
            });
            if (key === 'status') return statusBadge(row.status, { Resolvido: 'bg-green-100 text-green-700' });
            return row[key] ?? '-';
          }}
        />

        {/* Documentos */}
        <ResponsiveTable
          title="Documentos"
          columns={[
            { key: 'document_name', label: 'Nome' },
            { key: 'document_type', label: 'Tipo' },
            { key: 'current_version', label: 'Versão' },
          ]}
          rows={data.documents}
        />
      </div>
    </div>
  );
}