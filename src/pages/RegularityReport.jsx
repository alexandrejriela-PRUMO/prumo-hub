import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  FileCheck, 
  FileText, 
  MapPin, 
  Scale, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Download,
  Calendar,
  User,
  MapPinned,
  ChevronLeft,
  TreePine,
  Leaf
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import moment from 'moment';

import { useEffectiveUser } from '../hooks/useEffectiveUser';

export default function RegularityReport() {
  const { effectiveEmail, userType, isEquipeProdutor, loading: effectiveLoading } = useEffectiveUser();
  const [user, setUser] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // equipe de produtor usa fluxo de produtor (owner_email), não consultor
  const isConsultorFamily = userType === 'consultor' || (userType === 'equipe' && !isEquipeProdutor);
  const isClientConsultor = userType === 'client_consultor' || user?.user_type === 'client_consultor';

  const { data: allPropertiesForClient = [] } = useQuery({
    queryKey: ['all-properties-for-client-regularity'],
    queryFn: () => base44.entities.Property.list('-created_date', 500),
    enabled: !!user?.email && isClientConsultor,
  });

  const clientConsultorProperties = isClientConsultor
    ? allPropertiesForClient.filter(prop => {
        if (!prop.authorized_users) return false;
        try {
          const au = Array.isArray(prop.authorized_users) ? prop.authorized_users : JSON.parse(prop.authorized_users);
          return Array.isArray(au) && au.some(u => u.email === user?.email);
        } catch { return false; }
      })
    : [];

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', effectiveEmail, userType, isEquipeProdutor],
    queryFn: () => isConsultorFamily
      ? base44.entities.Property.filter({ consultor_email: effectiveEmail })
      : base44.entities.Property.filter({ owner_email: effectiveEmail }),
    enabled: !!effectiveEmail && !isClientConsultor
  });

  const effectiveProperties = isClientConsultor ? clientConsultorProperties : properties;

  const propertyIdsForLicenses = effectiveProperties.map(p => p.id);

  const { data: licenses = [] } = useQuery({
    queryKey: ['licenses', user?.email, propertyIdsForLicenses.join(',')],
    queryFn: async () => {
      if ((isConsultorFamily || isClientConsultor) && propertyIdsForLicenses.length > 0) {
        const results = await Promise.all(
          propertyIdsForLicenses.map(pid => base44.entities.License.filter({ property_id: pid }))
        );
        return results.flat();
      }
      return base44.entities.License.filter({ owner_email: effectiveEmail });
    },
    enabled: !!effectiveEmail && ((isConsultorFamily || isClientConsultor) ? effectiveProperties.length > 0 : true)
  });

  const propertyIds = effectiveProperties.map(p => p.id);

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', user?.email, propertyIds.join(',')],
    queryFn: async () => {
      if ((isConsultorFamily || isClientConsultor) && propertyIds.length > 0) {
        const results = await Promise.all(
          propertyIds.map(pid => Promise.all([
            base44.entities.Document.filter({ property_id: pid }),
            base44.entities.UnifiedDocument.filter({ entity_id: pid })
          ]))
        );
        return results.flat(2);
      }
      const propIds = effectiveProperties.map(p => p.id);
      const [docs, ...unifiedResults] = await Promise.all([
        base44.entities.Document.filter({ owner_email: effectiveEmail }),
        ...propIds.map(pid => base44.entities.UnifiedDocument.filter({ entity_id: pid }))
      ]);
      return [...docs, ...unifiedResults.flat()];
    },
    enabled: !!effectiveEmail && ((isConsultorFamily || isClientConsultor) ? effectiveProperties.length > 0 : true)
  });

  const { data: georeferencing = [] } = useQuery({
    queryKey: ['georeferencing', user?.email, propertyIds.join(',')],
    queryFn: async () => {
      if ((isConsultorFamily || isClientConsultor) && propertyIds.length > 0) {
        const results = await Promise.all(
          propertyIds.map(pid => base44.entities.Georeferencing.filter({ property_id: pid }))
        );
        return results.flat();
      }
      return base44.entities.Georeferencing.filter({ owner_email: effectiveEmail });
    },
    enabled: !!effectiveEmail && ((isConsultorFamily || isClientConsultor) ? effectiveProperties.length > 0 : true)
  });

  const { data: environmentalAlerts = [] } = useQuery({
    queryKey: ['envAlerts', user?.email, propertyIds.join(',')],
    queryFn: async () => {
      if ((isConsultorFamily || isClientConsultor) && propertyIds.length > 0) {
        const results = await Promise.all(
          propertyIds.map(pid => base44.entities.EnvironmentalAlert.filter({ property_id: pid }))
        );
        return results.flat();
      }
      return base44.entities.EnvironmentalAlert.filter({ property_id: { $in: propertyIds } });
    },
    enabled: !!effectiveEmail && ((isConsultorFamily || isClientConsultor) ? effectiveProperties.length > 0 : true)
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes', user?.email, propertyIds.join(',')],
    queryFn: async () => {
      if ((isConsultorFamily || isClientConsultor) && propertyIds.length > 0) {
        const results = await Promise.all(
          propertyIds.map(pid => base44.entities.Process.filter({ property_id: pid }))
        );
        return results.flat();
      }
      return base44.entities.Process.filter({ client_email: effectiveEmail });
    },
    enabled: !!effectiveEmail && ((isConsultorFamily || isClientConsultor) ? effectiveProperties.length > 0 : true)
  });

  const { data: carManagements = [] } = useQuery({
    queryKey: ['carManagements', user?.email, propertyIds.join(',')],
    queryFn: async () => {
      if ((isConsultorFamily || isClientConsultor) && propertyIds.length > 0) {
        const results = await Promise.all(
          propertyIds.map(pid => base44.entities.CARManagement.filter({ property_id: pid }))
        );
        return results.flat();
      }
      return base44.entities.CARManagement.filter({ owner_email: effectiveEmail });
    },
    enabled: !!effectiveEmail && ((isConsultorFamily || isClientConsultor) ? effectiveProperties.length > 0 : true)
  });

  const { data: prads = [] } = useQuery({
    queryKey: ['prads', user?.email, propertyIds.join(',')],
    queryFn: async () => {
      if ((isConsultorFamily || isClientConsultor) && propertyIds.length > 0) {
        const results = await Promise.all(
          propertyIds.map(pid => base44.entities.PRAD.filter({ property_id: pid }))
        );
        return results.flat();
      }
      return base44.entities.PRAD.filter({ owner_email: effectiveEmail });
    },
    enabled: !!effectiveEmail && ((isConsultorFamily || isClientConsultor) ? effectiveProperties.length > 0 : true)
  });

  useEffect(() => {
    if (effectiveProperties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(effectiveProperties[0].id);
    }
  }, [effectiveProperties, selectedPropertyId]);

  const selectedProperty = effectiveProperties.find(p => p.id === selectedPropertyId);
  const propertyLicenses = licenses.filter(l => l.property_id === selectedPropertyId);
  const propertyDocuments = documents.filter(d =>
    d.property_id === selectedPropertyId || d.entity_id === selectedPropertyId
  );
  const propertyCarManagements = carManagements.filter(c => c.property_id === selectedPropertyId);
  const propertyPrads = prads.filter(p => p.property_id === selectedPropertyId);
  const propertyProcesses = (isConsultorFamily || isClientConsultor)
    ? processes.filter(p => p.property_id === selectedPropertyId)
    : processes;
  const propertyGeo = georeferencing.filter(g => g.property_id === selectedPropertyId);
  const propertyAlerts = environmentalAlerts.filter(a => a.property_id === selectedPropertyId);

  // ── Pesos alinhados com o Termômetro ─────────────────────────────────────
  // Licença: 40 | CAR: 20 | Docs(CCIR+ITR): 5 | Geo: 5 | Processos: 20 | PRAD: 10
  const calculateDetailedScore = () => {
    const categories = [];
    let totalScore = 0;

    // ── 1. LICENÇAS (40pts) ───────────────────────────────────────────────
    const isento = propertyLicenses.some(l =>
      l.license_type === 'Dispensa de Licenciamento' ||
      (l.license_type || '').toLowerCase().includes('dispensa') ||
      (l.license_type || '').toLowerCase().includes('isento')
    );
    let licScore = 0; let licStatus = 'critical'; const licDetails = [];
    if (isento) {
      licScore = 30; licStatus = 'ok';
      licDetails.push('✓ Imóvel isento de licenciamento — 30/40 pontos aplicados');
    } else if (propertyLicenses.length > 0) {
      const now = new Date();
      const expired = propertyLicenses.filter(l => l.expiry_date && new Date(l.expiry_date) <= now && l.status !== 'Em Análise' && l.status !== 'Renovação');
      const inRenewal = propertyLicenses.filter(l => l.status === 'Em Análise' || l.status === 'Renovação');
      const expiringSoon = propertyLicenses.filter(l => {
        if (!l.expiry_date) return false;
        const days = Math.floor((new Date(l.expiry_date) - now) / (1000 * 60 * 60 * 24));
        return days > 0 && days <= 60;
      });
      if (expired.length === 0 && expiringSoon.length === 0) {
        licScore = 40; licStatus = 'ok';
        licDetails.push(`✓ Todas as ${propertyLicenses.length} licença(s) vigentes`);
      } else if (expired.length === 0 && inRenewal.length > 0) {
        licScore = Math.round(40 * 0.7); licStatus = 'warning';
        licDetails.push(`⚠ ${inRenewal.length} licença(s) em renovação/análise`);
      } else if (expired.length === 0 && expiringSoon.length > 0) {
        licScore = Math.round(40 * 0.65); licStatus = 'warning';
        licDetails.push(`⚠ ${expiringSoon.length} licença(s) vencendo em até 60 dias`);
      } else {
        licScore = Math.round(40 * 0.2); licStatus = 'critical';
        licDetails.push(`✗ ${expired.length} licença(s) vencida(s)`);
        if (inRenewal.length > 0) licDetails.push(`⚠ ${inRenewal.length} em renovação`);
      }
    } else {
      licDetails.push('✗ Nenhuma licença cadastrada');
      licDetails.push('💡 Se isento, cadastre uma "Dispensa de Licenciamento"');
    }
    categories.push({ name: 'Licenças Ambientais', icon: FileCheck, weight: 40, score: licScore, status: licStatus, details: licDetails });
    totalScore += licScore;

    // ── 2. CAR (20pts) ────────────────────────────────────────────────────
    const activeCARs = propertyCarManagements.filter(c => c.car_number && c.car_number.trim() !== '');
    let carScore = 0; let carStatus = 'critical'; const carDetails = [];
    if (activeCARs.length === 0) {
      carDetails.push('✗ CAR não cadastrado no módulo Gestão do CAR');
    } else {
      const carNeedsRect = activeCARs.some(c => c.car_status === 'Necessita retificação' || c.car_status === 'Com inconsistências' || c.car_status === 'Cancelado');
      const carFullyValid = activeCARs.every(c => c.car_status === 'Validado');
      const carInAnalysis = activeCARs.every(c => ['Validado','Em análise pelo órgão ambiental','Pendente de análise'].includes(c.car_status));
      if (carNeedsRect) {
        carScore = 10; carStatus = 'critical';
        carDetails.push(`✗ CAR necessita retificação/possui inconsistências`);
        activeCARs.forEach(c => carDetails.push(`  • ${c.car_number} — ${c.car_status}`));
      } else if (carFullyValid) {
        carScore = 20; carStatus = 'ok';
        carDetails.push(`✓ CAR validado pelo órgão ambiental (${activeCARs.length} CAR${activeCARs.length > 1 ? 's' : ''})`);
        activeCARs.forEach(c => carDetails.push(`  • ${c.car_number} — ${c.car_status}`));
      } else if (carInAnalysis) {
        carScore = Math.round(20 * 0.8); carStatus = 'ok';
        carDetails.push(`✓ CAR em análise/pendente — situação regular`);
        activeCARs.forEach(c => carDetails.push(`  • ${c.car_number} — ${c.car_status}`));
      } else {
        carScore = Math.round(20 * 0.6); carStatus = 'warning';
        carDetails.push(`⚠ CAR cadastrado — verifique o status`);
        activeCARs.forEach(c => carDetails.push(`  • ${c.car_number} — ${c.car_status || 'status não definido'}`));
      }
    }
    categories.push({ name: 'CAR — Cadastro Ambiental Rural', icon: TreePine, weight: 20, score: carScore, status: carStatus, details: carDetails });
    totalScore += carScore;

    // ── 3. DOCUMENTOS CCIR + ITR (5pts) ──────────────────────────────────
    const hasCCIR = propertyDocuments.some(d => d.document_type === 'CCIR');
    const hasITR = propertyDocuments.some(d => d.document_type === 'ITR');
    let docScore = 0; const docDetails = [];
    if (hasCCIR) { docScore += 3; docDetails.push('✓ CCIR cadastrado'); } else { docDetails.push('⚠ CCIR não cadastrado'); }
    if (hasITR) { docScore += 2; docDetails.push('✓ ITR anual cadastrado'); } else { docDetails.push('⚠ ITR anual não cadastrado'); }
    const docStatus = docScore === 5 ? 'ok' : docScore > 0 ? 'warning' : 'warning';
    categories.push({ name: 'Documentos Cadastrais (CCIR/ITR)', icon: FileText, weight: 5, score: docScore, status: docStatus, details: docDetails });
    totalScore += docScore;

    // ── 4. GEORREFERENCIAMENTO (5pts) ─────────────────────────────────────
    const regularGeo = propertyGeo.find(g => g.status === 'Regular');
    const pendingGeo = propertyGeo.find(g => g.status === 'Pendente' || g.status === 'Em Atualização');
    const irregularGeo = propertyGeo.find(g => g.status === 'Irregular');
    let geoScore = 0; let geoStatus = 'warning'; let geoDetails = [];
    if (regularGeo) { geoScore = 5; geoStatus = 'ok'; geoDetails = ['✓ Georreferenciamento regular']; }
    else if (pendingGeo) { geoScore = 2; geoStatus = 'warning'; geoDetails = [`⚠ Georreferenciamento ${pendingGeo.status}`]; }
    else if (irregularGeo) { geoScore = 1; geoStatus = 'warning'; geoDetails = ['⚠ Georreferenciamento irregular']; }
    else { geoDetails = ['⚠ Nenhum georreferenciamento com status Regular cadastrado']; }
    categories.push({ name: 'Georreferenciamento', icon: MapPin, weight: 5, score: geoScore, status: geoStatus, details: geoDetails });
    totalScore += geoScore;

    // ── 5. PROCESSOS (20pts) ──────────────────────────────────────────────
    const RESOLVED = ['Suspenso', 'Arquivado', 'Finalizado'];
    const CIVIL_RESOLVED_STATUSES = ['TAC firmado', 'Indenização paga', 'Acordo regular'];
    const active = propertyProcesses.filter(p => p.status === 'Em Andamento');
    const resolved = propertyProcesses.filter(p => RESOLVED.includes(p.status));
    const criminalActive = active.filter(p => p.process_type === 'Criminal');
    const adminCivilActive = active.filter(p => p.process_type !== 'Criminal');
    let procScore = 20; const procDetails = [];

    if (propertyProcesses.length === 0) {
      procDetails.push('✓ Sem processos registrados');
    } else if (active.length === 0) {
      procDetails.push(`✓ ${propertyProcesses.length} processo(s) — todos suspensos/arquivados/finalizados`);
    } else if (criminalActive.length > 0) {
      procScore = Math.round(20 * 0.05);
      procDetails.push(`✗ ${criminalActive.length} processo(s) criminal(is) em andamento`);
      if (adminCivilActive.length > 0) procDetails.push(`⚠ ${adminCivilActive.length} processo(s) administrativo(s)/civil(is) em andamento`);
    } else {
      // Verificar TAC firmado / multa paga
      const withTAC = adminCivilActive.filter(p => p.civil_inquiry_resolution && CIVIL_RESOLVED_STATUSES.includes(p.civil_inquiry_resolution));
      const withFinePaid = adminCivilActive.filter(p => p.fine_paid === true);
      const pending = adminCivilActive.filter(p =>
        !p.fine_paid && !(p.civil_inquiry_resolution && CIVIL_RESOLVED_STATUSES.includes(p.civil_inquiry_resolution))
      );

      if (pending.length === 0) {
        procScore = Math.round(20 * 0.75);
        procDetails.push(`⚠ ${adminCivilActive.length} proc. em andamento — regularizados (TAC/multa paga)`);
      } else {
        procScore = Math.round(20 * 0.35);
        procDetails.push(`⚠ ${pending.length} processo(s) administrativo(s)/civil(is) em andamento`);
      }
      if (withTAC.length > 0) procDetails.push(`✓ ${withTAC.length} com TAC firmado`);
      if (withFinePaid.length > 0) procDetails.push(`✓ ${withFinePaid.length} com multa paga`);
      if (resolved.length > 0) procDetails.push(`✓ ${resolved.length} processo(s) encerrado(s)`);
    }

    procScore = Math.max(0, Math.round(procScore));
    const hasPendingProc = criminalActive.length > 0 || adminCivilActive.some(p =>
      !p.fine_paid && !(p.civil_inquiry_resolution && CIVIL_RESOLVED_STATUSES.includes(p.civil_inquiry_resolution))
    );
    const procStatus = active.length === 0 ? 'ok' : criminalActive.length > 0 ? 'critical' : hasPendingProc ? 'warning' : 'ok';
    categories.push({ name: 'Situação Processual', icon: Scale, weight: 20, score: procScore, status: procStatus, details: procDetails });
    totalScore += procScore;

    // ── 7. PRAD (10pts) ───────────────────────────────────────────────────
    if (propertyPrads.length > 0) {
      const allConcluded = propertyPrads.every(p => p.status === 'Concluído' || p.status === 'Aprovado');
      const hasElaboration = propertyPrads.some(p => (p.status || '').toLowerCase().includes('elabor'));
      const hasInProgress = propertyPrads.some(p => p.status === 'Em Execução');
      const hasPending = propertyPrads.some(p => p.status === 'Pendente' || p.status === 'Não Iniciado');
      let pradScore = 0; let pradStatus = 'critical'; const pradDetails = [];
      if (allConcluded) {
        pradScore = 10; pradStatus = 'ok';
        pradDetails.push('✓ Todos os PRADs concluídos/aprovados');
      } else if (hasElaboration) {
        pradScore = Math.round(10 * 0.75); pradStatus = 'ok';
        pradDetails.push('✓ PRAD em elaboração — situação proativa');
      } else if (hasInProgress) {
        pradScore = Math.round(10 * 0.6); pradStatus = 'warning';
        pradDetails.push('⚠ PRAD em execução');
      } else if (hasPending) {
        pradScore = Math.round(10 * 0.2); pradStatus = 'critical';
        pradDetails.push('✗ PRAD(s) pendente(s) ou não iniciado(s)');
      }
      propertyPrads.forEach(p => pradDetails.push(`  • ${p.title || 'PRAD'} — ${p.status}`));
      categories.push({ name: 'PRAD — Recuperação de Área', icon: Leaf, weight: 10, score: pradScore, status: pradStatus, details: pradDetails });
      totalScore += pradScore;
    }

    const maxScore = 40 + 20 + 5 + 5 + 20 + (propertyPrads.length > 0 ? 10 : 0);
    const percentage = maxScore > 0 ? Math.min(100, Math.round((totalScore / maxScore) * 100)) : 0;
    return { percentage, categories };
  };

  const scoreData = selectedProperty ? calculateDetailedScore() : { percentage: 0, categories: [] };

  const getStatusConfig = (percentage) => {
    if (percentage >= 80) return { 
      color: 'green', 
      label: 'Regular', 
      icon: CheckCircle2, 
      bg: 'bg-green-50', 
      text: 'text-green-700',
      description: 'O cliente está em conformidade com as normas ambientais.'
    };
    if (percentage >= 50) return { 
      color: 'yellow', 
      label: 'Atenção', 
      icon: AlertTriangle, 
      bg: 'bg-yellow-50', 
      text: 'text-yellow-700',
      description: 'Existem pendências que requerem atenção para evitar irregularidades.'
    };
    return { 
      color: 'red', 
      label: 'Crítico', 
      icon: AlertCircle, 
      bg: 'bg-red-50', 
      text: 'text-red-700',
      description: 'Situação crítica - ação imediata necessária para evitar autos de infração.'
    };
  };

  const statusConfig = getStatusConfig(scoreData.percentage);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Link */}
      {!isConsultorFamily && (
        <a
          href="javascript:history.back()"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-medium"
        >
          <ChevronLeft className="w-3 h-3" />
          Voltar
        </a>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <TrendingUp className="w-7 sm:w-8 h-7 sm:h-8 text-emerald-600 flex-shrink-0" />
            <span>Relatório de Regularidade Ambiental</span>
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">{isConsultorFamily ? 'Análise completa da conformidade do cliente' : 'Análise completa e conformidade da propriedade'}</p>
        </div>
        <Button variant="outline" className="gap-2 w-full sm:w-auto">
          <Download className="w-4 h-4" />
          Baixar PDF
        </Button>
      </div>

      {/* Seletor de Propriedade */}
      {(effectiveProperties.length > 1 || isConsultorFamily || isClientConsultor) && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 flex-shrink-0">
                <MapPinned className="w-5 h-5 text-emerald-600" />
                <span className="text-gray-700 font-medium text-sm sm:text-base">Propriedade ou Empreendimento:</span>
              </div>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Selecione uma propriedade" />
                </SelectTrigger>
                <SelectContent>
                  {effectiveProperties.map(prop => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.property_name} - {prop.city}/{prop.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Principal */}
      <Card className={`border-2 ${statusConfig.bg}`}>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-7xl font-bold text-gray-900 mb-2">
                {scoreData.percentage}%
              </div>
              <Badge className={`${statusConfig.bg} ${statusConfig.text} px-4 py-2`}>
                <StatusIcon className="w-4 h-4 mr-2" />
                {statusConfig.label}
              </Badge>
            </div>
            <div className="md:col-span-2 flex items-center">
              <div className="space-y-4 w-full">
                <p className={`text-lg ${statusConfig.text} font-medium`}>
                  {statusConfig.description}
                </p>
                <Progress value={scoreData.percentage} className="h-3" />
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {user?.full_name || 'Cliente'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {moment().format('DD/MM/YYYY')}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedProperty?.property_name}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Análise por Categoria */}
      <div className="grid md:grid-cols-2 gap-6">
        {scoreData.categories.map((category, idx) => {
          const Icon = category.icon;
          const categoryStatus = category.status === 'ok' ? 
            { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' } :
            category.status === 'warning' ?
            { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' } :
            { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };

          const isPenalty = category.weight === 0;
          return (
            <Card key={idx} className={`border-2 ${categoryStatus.border}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-gray-700" />
                    <span className="text-base">{category.name}</span>
                  </div>
                  <div className={`text-xl font-bold ${isPenalty && category.score < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {isPenalty ? (category.score < 0 ? `${category.score} pts` : '✓') : `${category.score}/${category.weight}`}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {!isPenalty && (
                    <Progress value={Math.max(0, (category.score / category.weight) * 100)} className="h-2" />
                  )}
                  <ul className="space-y-1 mt-2">
                    {category.details.map((detail, i) => (
                      <li key={i} className="text-sm text-gray-700">
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Histórico e Tendências */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Conformidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Histórico será exibido conforme novas análises forem realizadas</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}