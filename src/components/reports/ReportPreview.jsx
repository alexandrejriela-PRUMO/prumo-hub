import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Table as TableIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportToPDF } from '../../utils/exportPDF';
import { exportToCSV } from '../../utils/exportCSV';
import { toast } from 'sonner';

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

  const getTotalCount = () => {
    return (
      data.properties.length +
      data.licenses.length +
      data.alerts.length +
      data.documents.length +
      data.processes.length +
      data.invoices.length
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {config.title || 'Relatório Personalizado'}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <TableIcon className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-700 font-medium">Total de Registros</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{getTotalCount()}</p>
            </CardContent>
          </Card>
          
          {data.properties.length > 0 && (
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <p className="text-sm text-green-700 font-medium">Propriedades</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{data.properties.length}</p>
              </CardContent>
            </Card>
          )}
          
          {data.alerts.length > 0 && (
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-4">
                <p className="text-sm text-red-700 font-medium">Alertas</p>
                <p className="text-3xl font-bold text-red-900 mt-1">{data.alerts.length}</p>
              </CardContent>
            </Card>
          )}
          
          {data.licenses.length > 0 && (
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <p className="text-sm text-purple-700 font-medium">Licenças</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{data.licenses.length}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Data Tables */}
        {data.properties.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3">Propriedades</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold">Nome</th>
                    <th className="text-left p-3 text-sm font-semibold">Cidade</th>
                    <th className="text-left p-3 text-sm font-semibold">Hectares</th>
                    <th className="text-left p-3 text-sm font-semibold">Atividade</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.properties.map((property, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3 text-sm">{property.property_name}</td>
                      <td className="p-3 text-sm">{property.city}, {property.state}</td>
                      <td className="p-3 text-sm">{property.total_hectares || '-'}</td>
                      <td className="p-3 text-sm">{property.main_activity || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.licenses.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3">Licenças Ambientais</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold">Tipo</th>
                    <th className="text-left p-3 text-sm font-semibold">Número</th>
                    <th className="text-left p-3 text-sm font-semibold">Emissão</th>
                    <th className="text-left p-3 text-sm font-semibold">Validade</th>
                    <th className="text-left p-3 text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.licenses.map((license, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3 text-sm">{license.license_type}</td>
                      <td className="p-3 text-sm">{license.license_number || '-'}</td>
                      <td className="p-3 text-sm">
                        {license.issue_date ? format(new Date(license.issue_date), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="p-3 text-sm">
                        {license.expiry_date ? format(new Date(license.expiry_date), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="p-3 text-sm">
                        <Badge variant={license.status === 'Vigente' ? 'default' : 'destructive'}>
                          {license.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.alerts.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3">Alertas Ambientais</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold">Título</th>
                    <th className="text-left p-3 text-sm font-semibold">Tipo</th>
                    <th className="text-left p-3 text-sm font-semibold">Gravidade</th>
                    <th className="text-left p-3 text-sm font-semibold">Data</th>
                    <th className="text-left p-3 text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.alerts.map((alert, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3 text-sm">{alert.title}</td>
                      <td className="p-3 text-sm">{alert.alert_type}</td>
                      <td className="p-3 text-sm">
                        <Badge className={
                          alert.severity === 'Crítica' ? 'bg-red-100 text-red-700' :
                          alert.severity === 'Alta' ? 'bg-orange-100 text-orange-700' :
                          alert.severity === 'Média' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }>
                          {alert.severity}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        {format(new Date(alert.detection_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="p-3 text-sm">
                        <Badge variant={alert.status === 'Resolvido' ? 'default' : 'outline'}>
                          {alert.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.documents.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3">Documentos</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold">Nome</th>
                    <th className="text-left p-3 text-sm font-semibold">Tipo</th>
                    <th className="text-left p-3 text-sm font-semibold">Versão</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.documents.map((doc, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3 text-sm">{doc.document_name}</td>
                      <td className="p-3 text-sm">{doc.document_type}</td>
                      <td className="p-3 text-sm">{doc.current_version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}