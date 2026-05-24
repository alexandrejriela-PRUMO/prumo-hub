import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Loader, FileText, Shield, AlertTriangle, Scale, Leaf, MapPin, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardFullExport({ user, selectedProperty, licenses = [], documents = [], processes = [], alerts = [], prads = [] }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateFullExport = async () => {
    if (!selectedProperty) {
      alert('Selecione uma propriedade antes de exportar.');
      return;
    }

    setIsGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 15;
      const M = 15;

      const newPage = () => { doc.addPage(); y = M; };
      const checkSpace = (n = 30) => { if (y + n > pageHeight - 12) newPage(); };

      const sectionTitle = (text) => {
        checkSpace(16);
        doc.setFillColor(22, 101, 52);
        doc.roundedRect(M, y, pageWidth - M * 2, 8, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(text, M + 4, y + 5.5);
        doc.setTextColor(0, 0, 0);
        y += 12;
      };

      const field = (label, value, indent = 0) => {
        checkSpace(6);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text(`${label}:`, M + indent, y);
        doc.setFont(undefined, 'normal');
        const val = String(value || '—');
        const lines = doc.splitTextToSize(val, pageWidth - M * 2 - indent - 30);
        doc.text(lines, M + indent + 28, y);
        y += Math.max(5, lines.length * 4.5);
      };

      const statusDot = (status) => {
        const map = {
          'Vigente': [16, 185, 129], 'Ativo': [16, 185, 129], 'Em Andamento': [59, 130, 246],
          'Vencida': [239, 68, 68], 'A Vencer': [245, 158, 11], 'Em Execução': [59, 130, 246],
          'Planejamento': [139, 92, 246], 'Suspenso': [107, 114, 128],
          'Aberto': [239, 68, 68], 'Resolvido': [16, 185, 129],
        };
        return map[status] || [107, 114, 128];
      };

      // ── CAPA ────────────────────────────────────────────────────────────────
      doc.setFillColor(22, 101, 52);
      doc.rect(0, 0, pageWidth, 50, 'F');
      doc.setFillColor(201, 162, 39);
      doc.rect(0, 50, pageWidth, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('PRUMO HUB', M, 16);
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text('Relatório Completo de Propriedade', M, 23);
      doc.setFontSize(9);
      doc.text(`Propriedade: ${selectedProperty.property_name}`, M, 31);
      doc.text(`Usuário: ${user?.full_name || ''} (${user?.email || ''})`, M, 37);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, M, 43);

      doc.setTextColor(0, 0, 0);
      y = 60;

      // ── DADOS DA PROPRIEDADE ────────────────────────────────────────────────
      sectionTitle('1. DADOS DA PROPRIEDADE');
      field('Nome', selectedProperty.property_name);
      field('Tipo', selectedProperty.property_type === 'rural' ? 'Rural' : 'Urbano');
      field('Localização', `${selectedProperty.city || '—'}/${selectedProperty.state || '—'}`);
      if (selectedProperty.total_hectares) field('Área Total', `${selectedProperty.total_hectares} hectares`);
      if (selectedProperty.app_hectares) field('Área APP', `${selectedProperty.app_hectares} hectares`);
      if (selectedProperty.legal_reserve_hectares) field('Reserva Legal', `${selectedProperty.legal_reserve_hectares} hectares`);
      if (selectedProperty.main_activity) field('Atividade Principal', selectedProperty.main_activity);
      if (selectedProperty.owner_names) field('Proprietário(s)', selectedProperty.owner_names);
      if (selectedProperty.car_numbers?.length) field('CAR(s)', selectedProperty.car_numbers.join(', '));
      if (selectedProperty.registration_numbers) field('Matrícula(s)', selectedProperty.registration_numbers);
      y += 3;

      // ── RESUMO EXECUTIVO ────────────────────────────────────────────────────
      sectionTitle('2. RESUMO EXECUTIVO');
      const vencidas = licenses.filter(l => l.status === 'Vencida').length;
      const aVencer = licenses.filter(l => l.status === 'A Vencer').length;
      const procAtivos = processes.filter(p => p.status === 'Em Andamento').length;
      const alertasAbertos = alerts.filter(a => a.status === 'Aberto' || a.status === 'Em Análise').length;
      const alertasCriticos = alerts.filter(a => a.severity === 'Crítica' || a.severity === 'Alta').length;
      const pradsEmExec = prads.filter(p => p.status === 'Em Execução').length;

      const summary = [
        [`Licenças / Documentos Técnicos`, licenses.length],
        [`Licenças Vencidas`, vencidas, vencidas > 0],
        [`Licenças a Vencer (em breve)`, aVencer, aVencer > 0],
        [`Processos Registrados`, processes.length],
        [`Processos em Andamento`, procAtivos, procAtivos > 0],
        [`Alertas Ambientais`, alerts.length],
        [`Alertas Críticos/Altos`, alertasCriticos, alertasCriticos > 0],
        [`Projetos PRAD`, prads.length],
        [`PRADs em Execução`, pradsEmExec],
        [`Documentos`, documents.length],
      ];

      summary.forEach(([label, val, warn]) => {
        checkSpace(6);
        const rgb = warn ? [220, 38, 38] : [22, 101, 52];
        doc.setFillColor(...rgb);
        doc.circle(M + 3, y - 1, 1.5, 'F');
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(warn ? 200 : 0, 0, 0);
        doc.text(`${label}: ${val}`, M + 7, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      });
      y += 3;

      // ── LICENÇAS ────────────────────────────────────────────────────────────
      if (licenses.length > 0) {
        sectionTitle(`3. LICENÇAS E DOCUMENTOS TÉCNICOS (${licenses.length})`);
        licenses.forEach((lic, i) => {
          checkSpace(20);
          const rgb = statusDot(lic.status);
          doc.setFillColor(...rgb);
          doc.roundedRect(M, y, pageWidth - M * 2, 6, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.text(`${i + 1}. ${lic.license_type}${lic.license_number ? ` — Nº ${lic.license_number}` : ''}`, M + 3, y + 4.3);
          doc.setTextColor(0, 0, 0);
          y += 8;

          doc.setFont(undefined, 'normal');
          doc.setFontSize(8.5);
          const statusLabel = lic.status || 'Sem status';
          doc.text(`Status: ${statusLabel}`, M + 5, y); y += 4;
          if (lic.issue_date) { doc.text(`Emissão: ${format(new Date(lic.issue_date), 'dd/MM/yyyy')}`, M + 5, y); y += 4; }
          if (lic.expiry_date) {
            const days = differenceInDays(new Date(lic.expiry_date), new Date());
            const expiryStr = `${format(new Date(lic.expiry_date), 'dd/MM/yyyy')}${days >= 0 ? ` (${days} dias restantes)` : ' (VENCIDA)'}`;
            doc.text(`Validade: ${expiryStr}`, M + 5, y); y += 4;
          }
          if (lic.environmental_agency) { doc.text(`Órgão: ${lic.environmental_agency}`, M + 5, y); y += 4; }
          if (lic.activity_description) {
            const lines = doc.splitTextToSize(`Atividade: ${lic.activity_description}`, pageWidth - M * 2 - 10);
            doc.text(lines, M + 5, y); y += lines.length * 4;
          }
          if (lic.conditions?.length) { doc.text(`Condicionantes: ${lic.conditions.length}`, M + 5, y); y += 4; }
          y += 2;
        });
      }

      // ── PROCESSOS ────────────────────────────────────────────────────────────
      if (processes.length > 0) {
        sectionTitle(`4. PROCESSOS (${processes.length})`);
        processes.forEach((proc, i) => {
          checkSpace(22);
          const rgb = statusDot(proc.status);
          doc.setFillColor(...rgb);
          doc.roundedRect(M, y, pageWidth - M * 2, 6, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.text(`${i + 1}. ${proc.process_number || 'Sem número'}`, M + 3, y + 4.3);
          doc.setTextColor(0, 0, 0);
          y += 8;

          doc.setFont(undefined, 'normal');
          doc.setFontSize(8.5);
          doc.text(`Tipo: ${proc.process_type}`, M + 5, y); y += 4;
          const subjLines = doc.splitTextToSize(`Assunto: ${proc.subject}`, pageWidth - M * 2 - 10);
          doc.text(subjLines, M + 5, y); y += subjLines.length * 4;
          doc.text(`Status: ${proc.status}`, M + 5, y); y += 4;
          if (proc.fine_value) { doc.text(`Multa: R$ ${proc.fine_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, M + 5, y); y += 4; }
          if (proc.has_embargo) { doc.text(`Embargo: ${proc.embargo_respected ? 'Sendo respeitado' : 'NÃO RESPEITADO'}`, M + 5, y); y += 4; }
          if (proc.filing_date) { doc.text(`Propositura: ${format(new Date(proc.filing_date), 'dd/MM/yyyy')}`, M + 5, y); y += 4; }
          y += 2;
        });
      }

      // ── PRADS ────────────────────────────────────────────────────────────────
      if (prads.length > 0) {
        sectionTitle(`5. PROJETOS PRAD — RECUPERAÇÃO DE ÁREA (${prads.length})`);
        prads.forEach((prad, i) => {
          checkSpace(22);
          const rgb = statusDot(prad.status);
          doc.setFillColor(...rgb);
          doc.roundedRect(M, y, pageWidth - M * 2, 6, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.text(`${i + 1}. ${prad.project_name}`, M + 3, y + 4.3);
          doc.setTextColor(0, 0, 0);
          y += 8;

          doc.setFont(undefined, 'normal');
          doc.setFontSize(8.5);
          doc.text(`Status: ${prad.status || '—'}`, M + 5, y); y += 4;
          if (prad.area_identification?.total_area_ha) { doc.text(`Área: ${prad.area_identification.total_area_ha} hectares`, M + 5, y); y += 4; }
          if (prad.area_identification?.degradation_type) { doc.text(`Tipo de degradação: ${prad.area_identification.degradation_type}`, M + 5, y); y += 4; }
          if (prad.recovery_objective?.main_objective) { doc.text(`Objetivo: ${prad.recovery_objective.main_objective}`, M + 5, y); y += 4; }
          if (prad.monitoring?.survival_rate != null) { doc.text(`Taxa de sobrevivência: ${prad.monitoring.survival_rate}%`, M + 5, y); y += 4; }
          if (prad.annual_reports?.length) { doc.text(`Relatórios anuais: ${prad.annual_reports.length} registrado(s)`, M + 5, y); y += 4; }
          y += 2;
        });
      }

      // ── ALERTAS AMBIENTAIS ────────────────────────────────────────────────────
      if (alerts.length > 0) {
        sectionTitle(`6. ALERTAS AMBIENTAIS (${alerts.length})`);
        const sevColor = { 'Crítica': [220, 38, 38], 'Alta': [239, 68, 68], 'Média': [245, 158, 11], 'Baixa': [107, 114, 128] };
        alerts.forEach((alert, i) => {
          checkSpace(20);
          const rgb = sevColor[alert.severity] || [107, 114, 128];
          doc.setFillColor(...rgb);
          doc.roundedRect(M, y, pageWidth - M * 2, 6, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.text(`${i + 1}. ${alert.title} [${alert.severity}]`, M + 3, y + 4.3);
          doc.setTextColor(0, 0, 0);
          y += 8;

          doc.setFont(undefined, 'normal');
          doc.setFontSize(8.5);
          doc.text(`Tipo: ${alert.alert_type} | Status: ${alert.status}`, M + 5, y); y += 4;
          if (alert.detection_date) { doc.text(`Data: ${format(new Date(alert.detection_date), 'dd/MM/yyyy')}`, M + 5, y); y += 4; }
          if (alert.affected_area_hectares) { doc.text(`Área afetada: ${alert.affected_area_hectares} ha`, M + 5, y); y += 4; }
          if (alert.description) {
            const lines = doc.splitTextToSize(`Descrição: ${alert.description}`, pageWidth - M * 2 - 10);
            doc.text(lines.slice(0, 2), M + 5, y); y += Math.min(lines.length, 2) * 4;
          }
          y += 2;
        });
      }

      // ── DOCUMENTOS ────────────────────────────────────────────────────────────
      if (documents.length > 0) {
        sectionTitle(`7. DOCUMENTOS (${documents.length})`);
        documents.forEach((d, i) => {
          checkSpace(8);
          doc.setFontSize(8.5);
          doc.setFont(undefined, 'normal');
          doc.text(`${i + 1}. ${d.document_name || d.name || '—'} (${d.document_type || d.type || '—'})`, M + 3, y);
          y += 5;
        });
        y += 3;
      }

      // ── RODAPÉ ────────────────────────────────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${p} de ${totalPages}  •  PRUMO Hub  •  ${selectedProperty.property_name}  •  ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      }

      const safeName = selectedProperty.property_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`PRUMO_Relatorio_${safeName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const hasData = licenses.length + processes.length + alerts.length + prads.length + documents.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 w-full" size="lg">
          <Download className="w-5 h-5 mr-2" />
          Exportar Dados Completos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Exportar Relatório da Propriedade
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {selectedProperty ? (
            <>
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-emerald-800 truncate">{selectedProperty.property_name}</p>
              </div>
              <p className="text-sm text-gray-600">O relatório incluirá <strong>exclusivamente</strong> os dados desta propriedade:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { icon: Shield, label: 'Licenças / Docs. Técnicos', count: licenses.length },
                  { icon: Scale, label: 'Processos', count: processes.length },
                  { icon: AlertTriangle, label: 'Alertas Ambientais', count: alerts.length },
                  { icon: Leaf, label: 'Projetos PRAD', count: prads.length },
                  { icon: FileText, label: 'Documentos', count: documents.length },
                ].map(({ icon: Icon, label, count }) => (
                  <div key={label} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <Icon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs text-gray-600 flex-1">{label}</span>
                    <span className="text-xs font-bold text-gray-800">{count}</span>
                  </div>
                ))}
              </div>
              {hasData === 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Nenhum dado encontrado para esta propriedade.
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Selecione uma propriedade no dashboard antes de exportar.
            </div>
          )}
          <Button
            onClick={generateFullExport}
            disabled={isGenerating || !selectedProperty}
            className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2"
          >
            {isGenerating ? (
              <><Loader className="w-4 h-4 mr-2 animate-spin" />Gerando PDF...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" />Gerar e Baixar PDF</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}