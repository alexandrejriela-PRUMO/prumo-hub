import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, AlertCircle, TrendingUp, FileCheck, FileText, MapPin, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function RegularityThermometer({ property, licenses, documents, processes, georeferencing = [] }) {
  const score = useMemo(() => {
    let totalScore = 0;
    let maxScore = 0;
    const details = [];

    // 1. Análise de Licenças (peso 40)
    const licenseWeight = 40;
    maxScore += licenseWeight;
    
    if (licenses && licenses.length > 0) {
      const now = new Date();
      const expiredLicenses = licenses.filter(lic => {
        if (!lic.expiry_date) return true;
        return new Date(lic.expiry_date) <= now;
      });
      const soonToExpire = licenses.filter(lic => {
        if (!lic.expiry_date) return false;
        const days = Math.floor((new Date(lic.expiry_date) - now) / (1000 * 60 * 60 * 24));
        return days > 0 && days <= 30;
      });

      if (expiredLicenses.length === 0) {
        if (soonToExpire.length === 0) {
          totalScore += licenseWeight;
          details.push({ category: 'Licenças', status: 'ok', message: 'Todas as licenças válidas' });
        } else {
          totalScore += licenseWeight * 0.7;
          details.push({ category: 'Licenças', status: 'warning', message: `${soonToExpire.length} licença(s) vencendo em breve` });
        }
      } else {
        totalScore += licenseWeight * 0.3;
        details.push({ category: 'Licenças', status: 'critical', message: `${expiredLicenses.length} licença(s) vencida(s)` });
      }
    } else {
      details.push({ category: 'Licenças', status: 'critical', message: 'Nenhuma licença cadastrada' });
    }

    // 2. Análise de Documentos (peso 30)
    const docWeight = 30;
    maxScore += docWeight;
    
    if (documents && documents.length > 0) {
      const hasCAR = documents.some(doc => doc.document_type === 'CAR');
      const hasCCIR = documents.some(doc => doc.document_type === 'CCIR');
      const hasGeoDoc = documents.some(doc => doc.document_type === 'Georreferenciamento');
      
      let docScore = 0;
      const missingDocs = [];
      
      if (hasCAR) docScore += docWeight * 0.4; else missingDocs.push('CAR');
      if (hasCCIR) docScore += docWeight * 0.3; else missingDocs.push('CCIR');
      if (hasGeoDoc) docScore += docWeight * 0.3; else missingDocs.push('Georreferenciamento');
      
      totalScore += docScore;
      
      if (missingDocs.length === 0) {
        details.push({ category: 'Documentos', status: 'ok', message: 'Todos os documentos em ordem' });
      } else {
        details.push({ category: 'Documentos', status: 'warning', message: `Faltam: ${missingDocs.join(', ')}` });
      }
    } else {
      details.push({ category: 'Documentos', status: 'critical', message: 'Nenhum documento cadastrado' });
    }

    // 3. Análise de Georreferenciamento (peso 15) — usa registros reais se disponíveis
    const geoWeight = 15;
    maxScore += geoWeight;
    
    const regularGeo = georeferencing.find(g => g.status === 'Regular');
    const hasAnyGeo = georeferencing.length > 0;
    
    if (regularGeo) {
      totalScore += geoWeight;
      details.push({ category: 'Georreferenciamento', status: 'ok', message: 'Georreferenciamento regular cadastrado' });
    } else if (hasAnyGeo) {
      const geo = georeferencing[0];
      totalScore += geoWeight * 0.67;
      details.push({ category: 'Georreferenciamento', status: 'warning', message: `Georreferenciamento ${geo.status || 'cadastrado'} (não regular)` });
    } else if (property?.coordinates) {
      totalScore += geoWeight;
      details.push({ category: 'Georreferenciamento', status: 'ok', message: 'Coordenadas cadastradas' });
    } else {
      details.push({ category: 'Georreferenciamento', status: 'warning', message: 'Georreferenciamento não cadastrado' });
    }

    // 4. Análise de Processos (peso 15)
    const processWeight = 15;
    maxScore += processWeight;
    
    if (processes && processes.length > 0) {
      const activeProcesses = processes.filter(p => p.status === 'Em Andamento');
      if (activeProcesses.length === 0) {
        totalScore += processWeight;
        details.push({ category: 'Processos', status: 'ok', message: 'Sem processos ativos' });
      } else {
        totalScore += processWeight * 0.5;
        details.push({ category: 'Processos', status: 'warning', message: `${activeProcesses.length} processo(s) ativo(s)` });
      }
    } else {
      totalScore += processWeight;
      details.push({ category: 'Processos', status: 'ok', message: 'Sem processos' });
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    return { percentage, details, totalScore, maxScore };
  }, [property, licenses, documents, processes, georeferencing]);

  const getStatus = (percentage) => {
    if (percentage >= 80) return { color: 'green', label: 'Regular', icon: CheckCircle2, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    if (percentage >= 50) return { color: 'yellow', label: 'Atenção', icon: AlertTriangle, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
    return { color: 'red', label: 'Crítico', icon: AlertCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  };

  const status = getStatus(score.percentage);
  const StatusIcon = status.icon;

  const categoryIcons = {
    'Licenças': FileCheck,
    'Documentos': FileText,
    'Georreferenciamento': MapPin,
    'Processos': Scale
  };

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            Termômetro de Regularidade
          </CardTitle>
          <Badge className={`${status.bg} ${status.text} border ${status.border} px-4 py-2 text-sm font-semibold`}>
            <StatusIcon className="w-4 h-4 mr-2" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pontuação Principal */}
        <div className="text-center py-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-200">
          <div className="text-6xl font-bold text-emerald-900 mb-2">
            {score.percentage}%
          </div>
          <p className="text-emerald-700 font-medium">Nível de Conformidade</p>
        </div>

        {/* Barra de Progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Crítico</span>
            <span>Atenção</span>
            <span>Regular</span>
          </div>
          <Progress 
            value={score.percentage} 
            className="h-4"
            style={{
              background: 'linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)'
            }}
          />
        </div>

        {/* Detalhes por Categoria */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Análise Detalhada</h3>
          {score.details.map((detail, idx) => {
            const Icon = categoryIcons[detail.category];
            const detailStatus = detail.status === 'ok' ? 
              { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600' } :
              detail.status === 'warning' ?
              { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-600' } :
              { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600' };

            return (
              <div key={idx} className={`p-3 rounded-lg border ${detailStatus.bg}`}>
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${detailStatus.icon}`} />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">{detail.category}</div>
                    <div className={`text-xs ${detailStatus.text}`}>{detail.message}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recomendações */}
        {score.percentage < 80 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Ações Recomendadas
            </h4>
            <ul className="text-sm text-amber-800 space-y-1 ml-6 list-disc">
              {score.details
                .filter(d => d.status !== 'ok')
                .map((d, idx) => (
                  <li key={idx}>{d.message}</li>
                ))
              }
            </ul>
          </div>
        )}

        {/* Botão para Relatório Completo */}
        <Link to={createPageUrl('RegularityReport')}>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
            Ver Relatório Completo de Regularidade
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}