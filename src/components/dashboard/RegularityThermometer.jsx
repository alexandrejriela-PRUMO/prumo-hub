import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, AlertCircle, TrendingUp, FileCheck, FileText, MapPin, Scale, Leaf } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function RegularityThermometer({ property, licenses = [], documents = [], processes = [], georeferencing = [], prads = [] }) {
  const score = useMemo(() => {
    let totalScore = 0;
    const details = [];

    // ── 1. LICENÇAS (peso 35) ─────────────────────────────────────────────
    const licenseWeight = 35;
    if (licenses.length > 0) {
      const now = new Date();
      const expired = licenses.filter(lic => {
        if (!lic.expiry_date) return false;
        return new Date(lic.expiry_date) <= now && lic.status !== 'Em Análise' && lic.status !== 'Renovação';
      });
      const soonToExpire = licenses.filter(lic => {
        if (!lic.expiry_date) return false;
        const days = Math.floor((new Date(lic.expiry_date) - now) / (1000 * 60 * 60 * 24));
        return days > 0 && days <= 60;
      });
      const inRenewal = licenses.filter(lic => lic.status === 'Renovação' || lic.status === 'Em Análise');

      if (expired.length === 0 && soonToExpire.length === 0) {
        totalScore += licenseWeight;
        details.push({ category: 'Licenças', status: 'ok', message: 'Todas as licenças vigentes' });
      } else if (expired.length === 0 && soonToExpire.length > 0) {
        totalScore += licenseWeight * 0.65;
        details.push({ category: 'Licenças', status: 'warning', message: `${soonToExpire.length} licença(s) vencendo em até 60 dias` });
      } else if (inRenewal.length > 0 && expired.length <= inRenewal.length) {
        totalScore += licenseWeight * 0.7;
        details.push({ category: 'Licenças', status: 'warning', message: `${inRenewal.length} licença(s) em renovação/análise` });
      } else {
        totalScore += licenseWeight * 0.2;
        details.push({ category: 'Licenças', status: 'critical', message: `${expired.length} licença(s) vencida(s)` });
      }
    } else {
      details.push({ category: 'Licenças', status: 'critical', message: 'Nenhuma licença cadastrada' });
    }

    // ── 2. DOCUMENTOS (peso 25) ───────────────────────────────────────────
    const docWeight = 25;
    if (documents.length > 0) {
      const hasCAR = documents.some(d => d.document_type === 'CAR');
      const hasCCIR = documents.some(d => d.document_type === 'CCIR');
      const hasGeoDoc = documents.some(d => d.document_type === 'Georreferenciamento');
      const hasOutro = documents.some(d => d.document_type === 'Outro');

      let docScore = 0;
      const missing = [];
      if (hasCAR) docScore += docWeight * 0.40; else missing.push('CAR');
      if (hasCCIR) docScore += docWeight * 0.35; else missing.push('CCIR');
      if (hasGeoDoc || hasOutro) docScore += docWeight * 0.25;

      totalScore += docScore;

      if (missing.length === 0) {
        details.push({ category: 'Documentos', status: 'ok', message: 'Documentos essenciais em ordem' });
      } else {
        const severity = missing.length >= 2 ? 'critical' : 'warning';
        details.push({ category: 'Documentos', status: severity, message: `Faltam: ${missing.join(', ')}` });
      }
    } else {
      details.push({ category: 'Documentos', status: 'critical', message: 'Nenhum documento cadastrado' });
    }

    // ── 3. GEORREFERENCIAMENTO (peso 15) ──────────────────────────────────
    const geoWeight = 15;
    const regularGeo = georeferencing.find(g => g.status === 'Regular');
    const pendingGeo = georeferencing.find(g => g.status === 'Pendente' || g.status === 'Em Atualização');
    const irregularGeo = georeferencing.find(g => g.status === 'Irregular');

    if (regularGeo) {
      totalScore += geoWeight;
      details.push({ category: 'Georreferenciamento', status: 'ok', message: 'Georreferenciamento regular' });
    } else if (pendingGeo) {
      totalScore += geoWeight * 0.5;
      details.push({ category: 'Georreferenciamento', status: 'warning', message: `Georreferenciamento ${pendingGeo.status}` });
    } else if (irregularGeo) {
      totalScore += geoWeight * 0.1;
      details.push({ category: 'Georreferenciamento', status: 'critical', message: 'Georreferenciamento irregular' });
    } else if (property?.coordinates) {
      totalScore += geoWeight * 0.6;
      details.push({ category: 'Georreferenciamento', status: 'warning', message: 'Coordenadas cadastradas (sem certificação)' });
    } else {
      details.push({ category: 'Georreferenciamento', status: 'warning', message: 'Georreferenciamento não cadastrado' });
    }

    // ── 4. PROCESSOS (peso 15) ────────────────────────────────────────────
    const processWeight = 15;
    if (processes.length > 0) {
      const active = processes.filter(p => p.status === 'Em Andamento');
      const criminal = processes.filter(p => p.process_type === 'Criminal' && p.status === 'Em Andamento');
      if (criminal.length > 0) {
        totalScore += processWeight * 0.1;
        details.push({ category: 'Processos', status: 'critical', message: `${criminal.length} processo(s) criminal(is) ativo(s)` });
      } else if (active.length > 0) {
        totalScore += processWeight * 0.4;
        details.push({ category: 'Processos', status: 'warning', message: `${active.length} processo(s) administrativo(s)/civil(is) ativo(s)` });
      } else {
        totalScore += processWeight;
        details.push({ category: 'Processos', status: 'ok', message: 'Sem processos ativos' });
      }
    } else {
      totalScore += processWeight;
      details.push({ category: 'Processos', status: 'ok', message: 'Sem processos cadastrados' });
    }

    // ── 5. PRAD (peso 10) ─────────────────────────────────────────────────
    const pradWeight = 10;
    if (prads.length > 0) {
      const hasPending = prads.some(p => p.status === 'Pendente' || p.status === 'Não Iniciado');
      const hasInProgress = prads.some(p => p.status === 'Em Execução');
      const allConcluded = prads.every(p => p.status === 'Concluído' || p.status === 'Aprovado');

      if (allConcluded) {
        totalScore += pradWeight;
        details.push({ category: 'PRAD', status: 'ok', message: 'Todos os PRADs concluídos/aprovados' });
      } else if (hasInProgress) {
        totalScore += pradWeight * 0.6;
        details.push({ category: 'PRAD', status: 'warning', message: 'PRAD em execução' });
      } else if (hasPending) {
        totalScore += pradWeight * 0.2;
        details.push({ category: 'PRAD', status: 'critical', message: 'PRAD(s) pendente(s) ou não iniciado(s)' });
      }
    }
    // Se não há PRADs, não penaliza (nem bonifica)

    const maxScore = licenseWeight + docWeight + geoWeight + processWeight + (prads.length > 0 ? pradWeight : 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    return { percentage, details, totalScore, maxScore };
  }, [property, licenses, documents, processes, georeferencing, prads]);

  const getStatus = (pct) => {
    if (pct >= 80) return { color: 'green', label: 'Regular', icon: CheckCircle2, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', bar: '#22c55e' };
    if (pct >= 50) return { color: 'yellow', label: 'Atenção', icon: AlertTriangle, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', bar: '#eab308' };
    return { color: 'red', label: 'Crítico', icon: AlertCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: '#ef4444' };
  };

  const status = getStatus(score.percentage);
  const StatusIcon = status.icon;

  const categoryIcons = {
    'Licenças': FileCheck,
    'Documentos': FileText,
    'Georreferenciamento': MapPin,
    'Processos': Scale,
    'PRAD': Leaf,
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
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Crítico (0–49%)</span>
            <span>Atenção (50–79%)</span>
            <span>Regular (80–100%)</span>
          </div>
          <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)' }}>
            <div
              className="absolute top-0 right-0 h-full bg-white/30 rounded-full transition-all duration-700"
              style={{ width: `${100 - score.percentage}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 transition-all duration-700"
              style={{ left: `calc(${score.percentage}% - 8px)`, borderColor: status.bar }}
            />
          </div>
        </div>

        {/* Detalhes por Categoria */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Análise Detalhada</h3>
          {score.details.map((detail, idx) => {
            const Icon = categoryIcons[detail.category] || FileText;
            const ds = detail.status === 'ok'
              ? { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600', border: 'border-green-100' }
              : detail.status === 'warning'
              ? { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-600', border: 'border-yellow-100' }
              : { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600', border: 'border-red-100' };

            return (
              <div key={idx} className={`p-3 rounded-lg border ${ds.bg} ${ds.border}`}>
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${ds.icon}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">{detail.category}</div>
                    <div className={`text-xs ${ds.text}`}>{detail.message}</div>
                  </div>
                  {detail.status === 'ok'
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : detail.status === 'warning'
                    ? <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  }
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
                .map((d, idx) => <li key={idx}>{d.message}</li>)
              }
            </ul>
          </div>
        )}

        <Link to={createPageUrl('RegularityReport')}>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
            Ver Relatório Completo de Regularidade
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}