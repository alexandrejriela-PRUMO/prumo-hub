import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Loader } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PRADReportGenerator({ prad }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedSections, setSelectedSections] = useState({
    identification: true,
    diagnosis: true,
    objectives: true,
    methods: true,
    execution: true,
    monitoring: true,
    documents: true,
    alerts: true,
    timeline: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportFormat, setReportFormat] = useState('full');

  const sections = [
    { id: 'identification', label: 'Identificação da Área' },
    { id: 'diagnosis', label: 'Diagnóstico Ambiental' },
    { id: 'objectives', label: 'Objetivo da Recuperação' },
    { id: 'methods', label: 'Métodos de Recuperação' },
    { id: 'execution', label: 'Cronograma de Execução' },
    { id: 'monitoring', label: 'Monitoramento' },
    { id: 'documents', label: 'Documentos' },
    { id: 'alerts', label: 'Alertas e Riscos' },
    { id: 'timeline', label: 'Timeline do Processo' },
  ];

  const toggleSection = (id) => {
    setSelectedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 15;
      const margin = 15;
      const lineHeight = 5;

      // Função auxiliar para adicionar página
      const addNewPage = () => {
        doc.addPage();
        yPosition = margin;
      };

      // Função para verificar se precisa de nova página
      const checkPageSpace = (requiredSpace = 30) => {
        if (yPosition + requiredSpace > pageHeight - 10) {
          addNewPage();
        }
      };

      // Header
      const headerY = yPosition;
      doc.setFillColor(34, 197, 94); // Verde
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('RELATÓRIO PRAD', margin, 12);
      doc.setFontSize(10);
      doc.text(`Projeto: ${prad.project_name}`, margin, 20);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin, 26);
      
      doc.setTextColor(0, 0, 0);
      yPosition = 35;

      // Índice
      if (reportFormat === 'full') {
        doc.setFontSize(12);
        doc.text('ÍNDICE', margin, yPosition);
        yPosition += 8;
        doc.setFontSize(9);
        
        Object.entries(selectedSections).forEach(([key, selected], idx) => {
          if (selected) {
            const section = sections.find(s => s.id === key);
            doc.text(`${idx + 1}. ${section.label}`, margin + 5, yPosition);
            yPosition += 5;
          }
        });
        
        addNewPage();
        doc.text('1. IDENTIFICAÇÃO DA ÁREA', margin, yPosition);
        yPosition += 8;
      }

      // 1. IDENTIFICAÇÃO
      if (selectedSections.identification) {
        checkPageSpace(40);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('1. IDENTIFICAÇÃO DA ÁREA DEGRADADA', margin, yPosition);
        yPosition += 7;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        
        const idData = [
          ['Nome do Projeto', prad.project_name || '-'],
          ['Propriedade', prad.property_id || '-'],
          ['Responsável', prad.owner_email || '-'],
          ['Área Total (ha)', prad.area_identification?.total_area_ha || '-'],
          ['Talhão/Gleba', prad.area_identification?.plot_name || '-'],
          ['Tipo de Degradação', prad.area_identification?.degradation_type || '-'],
          ['Data do Diagnóstico', prad.area_identification?.diagnosis_date ? format(parseISO(prad.area_identification.diagnosis_date), 'dd/MM/yyyy') : '-'],
          ['Coordenadas', prad.area_identification?.coordinates || '-'],
        ];

        idData.forEach(([key, value]) => {
          doc.setFont(undefined, 'bold');
          doc.text(`${key}:`, margin, yPosition);
          doc.setFont(undefined, 'normal');
          const textWidth = pageWidth - margin * 2 - 60;
          const splitText = doc.splitTextToSize(String(value), textWidth);
          doc.text(splitText, margin + 60, yPosition);
          yPosition += Math.max(5, splitText.length * 4);
          checkPageSpace(10);
        });
      }

      // 2. DIAGNÓSTICO
      if (selectedSections.diagnosis) {
        checkPageSpace(50);
        yPosition += 5;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('2. DIAGNÓSTICO AMBIENTAL', margin, yPosition);
        yPosition += 7;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);

        if (prad.environmental_diagnosis) {
          const diagData = [
            ['Grau de Impacto', prad.environmental_diagnosis.impact_level || '-'],
            ['Descrição da Degradação', prad.environmental_diagnosis.degradation_description || '-'],
            ['Causa Provável', prad.environmental_diagnosis.probable_cause || '-'],
          ];

          diagData.forEach(([key, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(`${key}:`, margin, yPosition);
            doc.setFont(undefined, 'normal');
            const textWidth = pageWidth - margin * 2 - 50;
            const splitText = doc.splitTextToSize(String(value), textWidth);
            doc.text(splitText, margin + 50, yPosition);
            yPosition += Math.max(5, splitText.length * 4);
            checkPageSpace(10);
          });

          // Áreas Mapeadas
          if (prad.environmental_diagnosis.mapped_areas?.length > 0) {
            yPosition += 5;
            doc.setFont(undefined, 'bold');
            doc.text('Áreas Mapeadas:', margin, yPosition);
            yPosition += 6;

            prad.environmental_diagnosis.mapped_areas.forEach((area, idx) => {
              checkPageSpace(30);
              doc.setFont(undefined, 'bold');
              doc.setFontSize(9);
              doc.text(`${area.area_name} - ${area.area_hectares} ha`, margin + 5, yPosition);
              yPosition += 5;

              doc.setFont(undefined, 'normal');
              doc.setFontSize(9);
              
              if (area.vegetation_stages?.length > 0) {
                doc.text('Estágios de Vegetação:', margin + 10, yPosition);
                yPosition += 4;
                area.vegetation_stages.forEach(stage => {
                  doc.text(`• ${stage.stage_type}: ${stage.area_percentage}%`, margin + 15, yPosition);
                  yPosition += 3;
                });
                yPosition += 2;
              }

              if (area.soil_characterization && Object.keys(area.soil_characterization).length > 0) {
                doc.text('Caracterização do Solo:', margin + 10, yPosition);
                yPosition += 4;
                const soil = area.soil_characterization;
                if (soil.soil_type) doc.text(`• Tipo: ${soil.soil_type}`, margin + 15, yPosition), yPosition += 3;
                if (soil.ph) doc.text(`• pH: ${soil.ph}`, margin + 15, yPosition), yPosition += 3;
                if (soil.slope) doc.text(`• Declividade: ${soil.slope}%`, margin + 15, yPosition), yPosition += 3;
                if (soil.erosion_risk) doc.text(`• Risco de Erosão: ${soil.erosion_risk}`, margin + 15, yPosition), yPosition += 3;
              }

              yPosition += 3;
            });
          }
        }
      }

      // 3. OBJETIVO
      if (selectedSections.objectives) {
        checkPageSpace(40);
        yPosition += 5;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('3. OBJETIVO DA RECUPERAÇÃO', margin, yPosition);
        yPosition += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        
        if (prad.recovery_objective) {
          const objData = [
            ['Objetivo Principal', prad.recovery_objective.main_objective || '-'],
            ['Detalhes', prad.recovery_objective.objective_details || '-'],
            ['Exigências Legais', prad.recovery_objective.legal_requirements || '-'],
          ];

          objData.forEach(([key, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(`${key}:`, margin, yPosition);
            doc.setFont(undefined, 'normal');
            const textWidth = pageWidth - margin * 2 - 50;
            const splitText = doc.splitTextToSize(String(value), textWidth);
            doc.text(splitText, margin + 50, yPosition);
            yPosition += Math.max(5, splitText.length * 4);
            checkPageSpace(10);
          });
        }
      }

      // 4. MÉTODOS DE RECUPERAÇÃO
      if (selectedSections.methods) {
        checkPageSpace(30);
        yPosition += 5;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('4. MÉTODOS DE RECUPERAÇÃO', margin, yPosition);
        yPosition += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);

        if (prad.recovery_methods?.length > 0) {
          prad.recovery_methods.forEach(method => {
            doc.text(`• ${method}`, margin + 5, yPosition);
            yPosition += 5;
            checkPageSpace(5);
          });
        } else {
          doc.text('Não especificado', margin + 5, yPosition);
          yPosition += 5;
        }
      }

      // 5. CRONOGRAMA DE EXECUÇÃO
      if (selectedSections.execution && prad.execution_schedule?.length > 0) {
        checkPageSpace(50);
        yPosition += 5;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('5. CRONOGRAMA DE EXECUÇÃO', margin, yPosition);
        yPosition += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        const scheduleData = [['Etapa', 'Prazo', 'Status', 'Responsável']];
        prad.execution_schedule.forEach(stage => {
          scheduleData.push([
            stage.stage || '-',
            stage.deadline ? format(parseISO(stage.deadline), 'dd/MM/yyyy') : '-',
            stage.status || '-',
            stage.responsible || '-'
          ]);
        });

        doc.autoTable({
          head: [scheduleData[0]],
          body: scheduleData.slice(1),
          startY: yPosition,
          margin: margin,
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 40 }
          },
          didDrawPage: (data) => {
            yPosition = data.lastAutoTable.finalY + 5;
          }
        });
      }

      // 6. MONITORAMENTO
      if (selectedSections.monitoring) {
        checkPageSpace(40);
        yPosition += 5;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('6. MONITORAMENTO E INDICADORES', margin, yPosition);
        yPosition += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);

        if (prad.monitoring) {
          const monData = [
            ['Taxa de Sobrevivência', `${prad.monitoring.survival_rate || 0}%`],
            ['Cobertura Vegetal', `${prad.monitoring.vegetation_cover || 0}%`],
            ['Controle de Invasoras', prad.monitoring.invasive_control || '-'],
          ];

          monData.forEach(([key, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(`${key}:`, margin, yPosition);
            doc.setFont(undefined, 'normal');
            doc.text(String(value), margin + 70, yPosition);
            yPosition += 5;
          });

          if (prad.image_monitoring?.ndvi_evolution?.length > 0) {
            yPosition += 5;
            doc.setFont(undefined, 'bold');
            doc.text('Evolução NDVI:', margin, yPosition);
            yPosition += 5;
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            prad.image_monitoring.ndvi_evolution.slice(-5).forEach(record => {
              doc.text(`• ${format(parseISO(record.date), 'dd/MM/yyyy')}: ${record.ndvi}`, margin + 5, yPosition);
              yPosition += 4;
            });
          }
        }
      }

      // 7. DOCUMENTOS
      if (selectedSections.documents && prad.documents?.length > 0) {
        checkPageSpace(30);
        yPosition += 5;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('7. DOCUMENTOS ANEXADOS', margin, yPosition);
        yPosition += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        prad.documents.forEach(doc => {
          checkPageSpace(10);
          doc.setFont(undefined, 'bold');
          doc.text(`• ${doc.name}`, margin + 5, yPosition);
          yPosition += 4;
          doc.setFont(undefined, 'normal');
          doc.text(`Tipo: ${doc.type}`, margin + 10, yPosition);
          yPosition += 3;
          if (doc.observations) {
            doc.text(`Obs: ${doc.observations}`, margin + 10, yPosition);
            yPosition += 3;
          }
          yPosition += 2;
        });
      }

      // 8. ALERTAS E RISCOS
      if (selectedSections.alerts && prad.alerts_and_risks?.length > 0) {
        checkPageSpace(40);
        yPosition += 5;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('8. ALERTAS E RISCOS', margin, yPosition);
        yPosition += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        prad.alerts_and_risks.forEach(alert => {
          checkPageSpace(15);
          doc.setFont(undefined, 'bold');
          doc.text(`• ${alert.alert_type} (${alert.severity})`, margin + 5, yPosition);
          yPosition += 4;
          doc.setFont(undefined, 'normal');
          const descSplit = doc.splitTextToSize(alert.description || '', pageWidth - margin * 2 - 10);
          doc.text(descSplit, margin + 10, yPosition);
          yPosition += descSplit.length * 3 + 2;
          doc.text(`Status: ${alert.status}`, margin + 10, yPosition);
          yPosition += 4;
        });
      }

      // 9. TIMELINE
      if (selectedSections.timeline && prad.pipeline_status?.length > 0) {
        checkPageSpace(40);
        yPosition += 5;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('9. TIMELINE DO PROCESSO ADMINISTRATIVO', margin, yPosition);
        yPosition += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        prad.pipeline_status.forEach(stage => {
          checkPageSpace(10);
          doc.setFont(undefined, 'bold');
          doc.text(`${stage.stage_name}`, margin + 5, yPosition);
          doc.setFont(undefined, 'normal');
          doc.text(`Status: ${stage.current_status}`, margin + 10, yPosition + 3);
          if (stage.notes) {
            doc.text(`Obs: ${stage.notes}`, margin + 10, yPosition + 6);
            yPosition += 9;
          } else {
            yPosition += 6;
          }
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

      doc.save(`PRAD_${prad.project_name}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      setShowDialog(false);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <FileText className="w-4 h-4 mr-2" />
          Gerar Relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerar Relatório PRAD</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          <div>
            <label className="text-sm font-medium mb-3 block">Formato do Relatório</label>
            <Select value={reportFormat} onValueChange={setReportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Relatório Completo</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportFormat === 'custom' && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Selecione as seções:</label>
              {sections.map(section => (
                <div key={section.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={section.id}
                    checked={selectedSections[section.id]}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <label
                    htmlFor={section.id}
                    className="text-sm cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {section.label}
                  </label>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={generateReport}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}