import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, AlertCircle, TrendingUp, FileCheck, FileText, MapPin, Scale, Leaf, TreePine, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// ── Pesos por categoria ───────────────────────────────────────────────────────
// Licença: 40 | CAR: 20 | Documentos: 5 | Geo: 5 | Processos: 20 | PRAD: 10
// Total base = 90 sem PRAD, 100 com PRAD

export default function RegularityThermometer({ property, licenses = [], documents = [], processes = [], georeferencing = [], prads = [], carManagements = [] }) {
  const score = useMemo(() => {
    let totalScore = 0;
    const details = [];

    // ── 1. LICENÇAS AMBIENTAIS (peso 40) ──────────────────────────────────
    const licenseWeight = 40;
    const isento = licenses.some(lic =>
      lic.license_type === 'Dispensa de Licenciamento' || (lic.license_type || '').toLowerCase().includes('isento') || (lic.license_type || '').toLowerCase().includes('dispensa')
    );

    if (isento) {
      // Isento: 30 de 40 (muito positivo, mas não pleno pois não há licença vigente)
      totalScore += 30;
      details.push({ category: 'Licenças', status: 'ok', message: 'Imóvel isento de licenciamento — pontuação base aplicada', score: 30, max: licenseWeight });
    } else if (licenses.length > 0) {
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
        details.push({ category: 'Licenças', status: 'ok', message: 'Todas as licenças vigentes', score: licenseWeight, max: licenseWeight });
      } else if (expired.length === 0 && soonToExpire.length > 0) {
        const pts = Math.round(licenseWeight * 0.65);
        totalScore += pts;
        details.push({ category: 'Licenças', status: 'warning', message: `${soonToExpire.length} licença(s) vencendo em até 60 dias`, score: pts, max: licenseWeight });
      } else if (inRenewal.length > 0 && expired.length <= inRenewal.length) {
        const pts = Math.round(licenseWeight * 0.7);
        totalScore += pts;
        details.push({ category: 'Licenças', status: 'warning', message: `${inRenewal.length} licença(s) em renovação/análise`, score: pts, max: licenseWeight });
      } else {
        const pts = Math.round(licenseWeight * 0.2);
        totalScore += pts;
        details.push({ category: 'Licenças', status: 'critical', message: `${expired.length} licença(s) vencida(s)`, score: pts, max: licenseWeight });
      }
    } else {
      details.push({ category: 'Licenças', status: 'critical', message: 'Nenhuma licença cadastrada', score: 0, max: licenseWeight });
    }

    // ── 2. CAR — Cadastro Ambiental Rural (peso 20) ───────────────────────
    const carWeight = 20;
    const activeCARs = carManagements.filter(c => c.car_number && c.car_number.trim() !== '');
    const hasCAR = activeCARs.length > 0;
    const carNeedsRectification = activeCARs.some(c =>
      c.car_status === 'Necessita retificação' || c.car_status === 'Com inconsistências' || c.car_status === 'Cancelado'
    );
    const carFullyValid = activeCARs.length > 0 && activeCARs.every(c =>
      c.car_status === 'Validado'
    );
    const carInAnalysis = activeCARs.length > 0 && activeCARs.every(c =>
      c.car_status === 'Validado' || c.car_status === 'Em análise pelo órgão ambiental' || c.car_status === 'Pendente de análise'
    );

    if (!hasCAR) {
      details.push({ category: 'CAR', status: 'critical', message: 'CAR não cadastrado — regularize pelo módulo Gestão do CAR', score: 0, max: carWeight });
    } else if (carNeedsRectification) {
      const pts = 10;
      totalScore += pts;
      details.push({ category: 'CAR', status: 'critical', message: 'CAR necessita retificação ou possui inconsistências', score: pts, max: carWeight });
    } else if (carFullyValid) {
      totalScore += carWeight;
      details.push({ category: 'CAR', status: 'ok', message: `CAR validado pelo órgão ambiental ✓ (${activeCARs.length} CAR${activeCARs.length > 1 ? 's' : ''})`, score: carWeight, max: carWeight });
    } else if (carInAnalysis) {
      const pts = Math.round(carWeight * 0.8);
      totalScore += pts;
      details.push({ category: 'CAR', status: 'ok', message: `CAR em análise/pendente — situação regular (${activeCARs.length} CAR${activeCARs.length > 1 ? 's' : ''})`, score: pts, max: carWeight });
    } else {
      const pts = Math.round(carWeight * 0.6);
      totalScore += pts;
      details.push({ category: 'CAR', status: 'warning', message: `CAR cadastrado — verifique o status (${activeCARs.length} CAR${activeCARs.length > 1 ? 's' : ''})`, score: pts, max: carWeight });
    }

    // ── 3. DOCUMENTOS CADASTRAIS — CCIR + ITR (peso 5) ───────────────────
    const docWeight = 5;
    const hasCCIR = documents.some(d => d.document_type === 'CCIR');
    const hasITR = documents.some(d => d.document_type === 'ITR');

    let docScore = 0;
    const docMissing = [];
    if (hasCCIR) docScore += 3; else docMissing.push('CCIR');
    if (hasITR) docScore += 2; else docMissing.push('ITR anual');
    totalScore += docScore;

    if (docMissing.length === 0) {
      details.push({ category: 'Documentos (CCIR/ITR)', status: 'ok', message: 'CCIR e ITR cadastrados', score: docScore, max: docWeight });
    } else if (docMissing.length === 1) {
      details.push({ category: 'Documentos (CCIR/ITR)', status: 'warning', message: `Falta: ${docMissing[0]}`, score: docScore, max: docWeight });
    } else {
      details.push({ category: 'Documentos (CCIR/ITR)', status: 'warning', message: 'CCIR e ITR não cadastrados', score: docScore, max: docWeight });
    }

    // ── 4. GEORREFERENCIAMENTO (peso 5) ───────────────────────────────────
    const geoWeight = 5;
    const regularGeo = georeferencing.find(g => g.status === 'Regular');
    const pendingGeo = georeferencing.find(g => g.status === 'Pendente' || g.status === 'Em Atualização');
    const irregularGeo = georeferencing.find(g => g.status === 'Irregular');

    if (regularGeo) {
      totalScore += geoWeight;
      details.push({ category: 'Georreferenciamento', status: 'ok', message: 'Georreferenciamento regular', score: geoWeight, max: geoWeight });
    } else if (pendingGeo) {
      const pts = 2;
      totalScore += pts;
      details.push({ category: 'Georreferenciamento', status: 'warning', message: `Georreferenciamento ${pendingGeo.status}`, score: pts, max: geoWeight });
    } else if (irregularGeo) {
      const pts = 1;
      totalScore += pts;
      details.push({ category: 'Georreferenciamento', status: 'warning', message: 'Georreferenciamento irregular', score: pts, max: geoWeight });
    } else {
      details.push({ category: 'Georreferenciamento', status: 'warning', message: 'Sem georreferenciamento cadastrado', score: 0, max: geoWeight });
    }

    // ── 5. PROCESSOS (peso 20) ─────────────────────────────────────────────
    const processWeight = 20;
    const RESOLVED_STATUSES = ['Suspenso', 'Arquivado', 'Finalizado'];
    const activeProcesses = processes.filter(p => p.status === 'Em Andamento');
    const resolvedProcesses = processes.filter(p => RESOLVED_STATUSES.includes(p.status));
    const criminalActive = activeProcesses.filter(p => p.process_type === 'Criminal');
    const adminCivilActive = activeProcesses.filter(p => p.process_type !== 'Criminal');

    // Verificar se há TAC firmado ou inquérito civil resolvido
    const CIVIL_RESOLVED = ['TAC firmado', 'Indenização paga', 'Acordo regular'];
    const civilResolved = processes.filter(p =>
      p.process_type === 'Civil' && CIVIL_RESOLVED.includes(p.civil_inquiry_resolution)
    );

    let processScore = processWeight;
    const processMessages = [];

    if (processes.length === 0) {
      processMessages.push('Sem processos registrados');
    } else if (activeProcesses.length === 0) {
      processMessages.push(`${resolvedProcesses.length} processo(s) — todos encerrados/suspensos`);
    } else if (criminalActive.length > 0) {
      processScore = Math.round(processWeight * 0.05);
      processMessages.push(`${criminalActive.length} processo(s) criminal(is) em andamento`);
      if (adminCivilActive.length > 0) processMessages.push(`${adminCivilActive.length} proc. administrativo(s)/civil(is) em andamento`);
    } else {
      // Processos admin/civil ativos — verificar TAC e multa paga
      const withTAC = adminCivilActive.filter(p => p.civil_inquiry_resolution && CIVIL_RESOLVED.includes(p.civil_inquiry_resolution));
      const withFinePaid = adminCivilActive.filter(p => p.fine_paid === true);
      const withEmbargo = adminCivilActive.filter(p => p.has_embargo === true && p.embargo_respected !== false);
      const pending = adminCivilActive.filter(p =>
        !p.fine_paid &&
        !(p.civil_inquiry_resolution && CIVIL_RESOLVED.includes(p.civil_inquiry_resolution))
      );

      if (pending.length === 0) {
        // Todos resolvidos (TAC / multa paga)
        processScore = Math.round(processWeight * 0.75);
        processMessages.push(`${adminCivilActive.length} proc. em andamento — regularizados (TAC/multa paga)`);
      } else {
        processScore = Math.round(processWeight * 0.35);
        processMessages.push(`${pending.length} proc. administrativo(s)/civil(is) em andamento`);
      }
      if (withTAC.length > 0) processMessages.push(`✓ ${withTAC.length} com TAC firmado`);
      if (withFinePaid.length > 0) processMessages.push(`✓ ${withFinePaid.length} com multa paga`);
      if (resolvedProcesses.length > 0) processMessages.push(`✓ ${resolvedProcesses.length} encerrado(s)`);
    }

    processScore = Math.max(0, Math.round(processScore));
    totalScore += processScore;

    const hasProblem = criminalActive.length > 0 || adminCivilActive.some(p =>
      !p.fine_paid && !(p.civil_inquiry_resolution && CIVIL_RESOLVED.includes(p.civil_inquiry_resolution))
    );
    const processStatus = !hasProblem ? 'ok' : criminalActive.length > 0 ? 'critical' : 'warning';

    details.push({
      category: 'Processos',
      status: processStatus,
      message: processMessages.join(' | '),
      score: processScore,
      max: processWeight
    });

    // ── 6. EMBARGO (penalidade direta sobre o total) ───────────────────────
    const adminWithEmbargo = processes.filter(p => p.process_type === 'Administrativo' && p.has_embargo === true);
    const embargoNotRespected = adminWithEmbargo.filter(p => p.embargo_respected === false);
    if (embargoNotRespected.length > 0) {
      const penalty = 10 * embargoNotRespected.length;
      totalScore = Math.max(0, totalScore - penalty);
      details.push({ category: 'Embargo', status: 'critical', message: `${embargoNotRespected.length} embargo(s) NÃO respeitado(s) — risco grave (-${penalty} pts)`, score: -penalty, max: 0 });
    } else if (adminWithEmbargo.length > 0) {
      details.push({ category: 'Embargo', status: 'ok', message: `${adminWithEmbargo.length} embargo(s) sendo respeitado(s) ✓`, score: 0, max: 0 });
    }

    // ── 7. PRAD (peso 10) ─────────────────────────────────────────────────
    const pradWeight = 10;
    if (prads.length > 0) {
      const hasPending = prads.some(p => p.status === 'Pendente' || p.status === 'Não Iniciado');
      const hasInProgress = prads.some(p => p.status === 'Em Execução');
      const allConcluded = prads.every(p => p.status === 'Concluído' || p.status === 'Aprovado');
      const hasInElaboration = prads.some(p =>
        (p.status || '').toLowerCase().includes('elabor')
      );

      if (allConcluded) {
        totalScore += pradWeight;
        details.push({ category: 'PRAD', status: 'ok', message: 'Todos os PRADs concluídos/aprovados', score: pradWeight, max: pradWeight });
      } else if (hasInElaboration) {
        const pts = Math.round(pradWeight * 0.75);
        totalScore += pts;
        details.push({ category: 'PRAD', status: 'ok', message: 'PRAD em elaboração — situação proativa ✓', score: pts, max: pradWeight });
      } else if (hasInProgress) {
        const pts = Math.round(pradWeight * 0.6);
        totalScore += pts;
        details.push({ category: 'PRAD', status: 'warning', message: 'PRAD em execução', score: pts, max: pradWeight });
      } else if (hasPending) {
        const pts = Math.round(pradWeight * 0.2);
        totalScore += pts;
        details.push({ category: 'PRAD', status: 'critical', message: 'PRAD(s) pendente(s) ou não iniciado(s)', score: pts, max: pradWeight });
      }
    }

    const maxScore = 40 + 20 + 5 + 5 + 20 + (prads.length > 0 ? pradWeight : 0);
    const percentage = maxScore > 0 ? Math.min(100, Math.round((totalScore / maxScore) * 100)) : 0;

    return { percentage, details, totalScore, maxScore };
  }, [property, licenses, documents, processes, georeferencing, prads, carManagements]);

  const getStatus = (pct) => {
    if (pct >= 80) return { color: 'green', label: 'Regular', icon: CheckCircle2, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', bar: '#22c55e' };
    if (pct >= 50) return { color: 'yellow', label: 'Atenção', icon: AlertTriangle, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', bar: '#eab308' };
    return { color: 'red', label: 'Crítico', icon: AlertCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: '#ef4444' };
  };

  const status = getStatus(score.percentage);
  const StatusIcon = status.icon;

  const categoryIcons = {
    'Licenças': FileCheck,
    'CAR': TreePine,
    'Documentos (CCIR/ITR)': FileText,
    'Georreferenciamento': MapPin,
    'Processos': Scale,
    'Embargo': ShieldAlert,
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
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Análise Detalhada</h3>
          {score.details.map((detail, idx) => {
            const Icon = categoryIcons[detail.category] || FileText;
            const isEmbargo = detail.category === 'Embargo';
            const ds = detail.status === 'ok'
              ? { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600', border: 'border-green-200' }
              : detail.status === 'warning'
              ? { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-600', border: 'border-yellow-200' }
              : { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600', border: 'border-red-200' };

            const scoreLabel = isEmbargo
              ? (detail.score < 0 ? <span className="text-xs font-bold text-red-700">{detail.score} pts</span> : null)
              : detail.max > 0
              ? <span className="text-xs font-semibold tabular-nums whitespace-nowrap" style={{ color: detail.score === detail.max ? '#16a34a' : detail.score >= detail.max * 0.5 ? '#ca8a04' : '#dc2626' }}>{detail.score}/{detail.max}</span>
              : null;

            return (
              <div key={idx} className={`px-3 py-2.5 rounded-lg border ${ds.bg} ${ds.border}`}>
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${ds.icon}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-gray-900">{detail.category}</span>
                      {scoreLabel}
                    </div>
                    <div className={`text-xs mt-0.5 ${ds.text}`}>{detail.message}</div>
                    {detail.max > 0 && !isEmbargo && (
                      <div className="mt-1.5 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(0, Math.min(100, (detail.score / detail.max) * 100))}%`,
                            backgroundColor: detail.score === detail.max ? '#22c55e' : detail.score >= detail.max * 0.5 ? '#eab308' : '#ef4444'
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {detail.status === 'ok'
                      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                      : detail.status === 'warning'
                      ? <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      : <AlertCircle className="w-4 h-4 text-red-500" />
                    }
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