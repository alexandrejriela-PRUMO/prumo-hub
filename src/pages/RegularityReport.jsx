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
  MapPinned
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import moment from 'moment';

export default function RegularityReport() {
  const [user, setUser] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);

  const isConsultor = user?.user_type === 'consultor';

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => isConsultor
      ? base44.entities.Property.filter({ consultor_email: user.email })
      : base44.entities.Property.filter({ owner_email: user.email }),
    enabled: !!user?.email
  });

  const propertyIdsForLicenses = properties.map(p => p.id);

  const { data: licenses = [] } = useQuery({
    queryKey: ['licenses', user?.email, propertyIdsForLicenses.join(',')],
    queryFn: async () => {
      if (isConsultor && propertyIdsForLicenses.length > 0) {
        const results = await Promise.all(
          propertyIdsForLicenses.map(pid => base44.entities.License.filter({ property_id: pid }))
        );
        return results.flat();
      }
      return base44.entities.License.filter({ owner_email: user.email });
    },
    enabled: !!user?.email && (isConsultor ? properties.length > 0 : true)
  });

  const propertyIds = properties.map(p => p.id);

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', user?.email, propertyIds.join(',')],
    queryFn: async () => {
      if (isConsultor && propertyIds.length > 0) {
        const results = await Promise.all(
          propertyIds.map(pid => Promise.all([
            base44.entities.Document.filter({ property_id: pid }),
            base44.entities.UnifiedDocument.filter({ entity_id: pid })
          ]))
        );
        return results.flat(2);
      }
      const propIds = properties.map(p => p.id);
      const [docs, ...unifiedResults] = await Promise.all([
        base44.entities.Document.filter({ owner_email: user.email }),
        ...propIds.map(pid => base44.entities.UnifiedDocument.filter({ entity_id: pid }))
      ]);
      return [...docs, ...unifiedResults.flat()];
    },
    enabled: !!user?.email && (isConsultor ? properties.length > 0 : true)
  });

  const { data: georeferencing = [] } = useQuery({
    queryKey: ['georeferencing', user?.email, propertyIds.join(',')],
    queryFn: async () => {
      if (isConsultor && propertyIds.length > 0) {
        const results = await Promise.all(
          propertyIds.map(pid => base44.entities.Georeferencing.filter({ property_id: pid }))
        );
        return results.flat();
      }
      return base44.entities.Georeferencing.filter({ owner_email: user.email });
    },
    enabled: !!user?.email && (isConsultor ? properties.length > 0 : true)
  });

  const { data: environmentalAlerts = [] } = useQuery({
    queryKey: ['envAlerts', user?.email, propertyIds.join(',')],
    queryFn: async () => {
      if (isConsultor && propertyIds.length > 0) {
        const results = await Promise.all(
          propertyIds.map(pid => base44.entities.EnvironmentalAlert.filter({ property_id: pid }))
        );
        return results.flat();
      }
      return base44.entities.EnvironmentalAlert.filter({ property_id: { $in: propertyIds } });
    },
    enabled: !!user?.email && (isConsultor ? properties.length > 0 : true)
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes', user?.email, propertyIds.join(',')],
    queryFn: async () => {
      if (isConsultor && propertyIds.length > 0) {
        const results = await Promise.all(
          propertyIds.map(pid => base44.entities.Process.filter({ property_id: pid }))
        );
        return results.flat();
      }
      return base44.entities.Process.filter({ client_email: user.email });
    },
    enabled: !!user?.email && (isConsultor ? properties.length > 0 : true)
  });

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const propertyLicenses = licenses.filter(l => l.property_id === selectedPropertyId);
  const propertyDocuments = documents.filter(d => 
    d.property_id === selectedPropertyId || d.entity_id === selectedPropertyId
  );

  // Cálculo de pontuação detalhado
  const calculateDetailedScore = () => {
    const categories = [];
    let totalScore = 0;
    let maxScore = 100;

    // Licenças (35 pontos)
    const licenseAnalysis = analyzeLicenses(propertyLicenses);
    categories.push({
      name: 'Licenças Ambientais',
      icon: FileCheck,
      weight: 35,
      score: licenseAnalysis.score,
      status: licenseAnalysis.status,
      details: licenseAnalysis.details
    });
    totalScore += licenseAnalysis.score;

    // Documentos (25 pontos)
    const docAnalysis = analyzeDocuments(propertyDocuments);
    categories.push({
      name: 'Documentação Cadastral',
      icon: FileText,
      weight: 25,
      score: docAnalysis.score,
      status: docAnalysis.status,
      details: docAnalysis.details
    });
    totalScore += docAnalysis.score;

    // Georreferenciamento (15 pontos)
    const propertyGeo = georeferencing.filter(g => g.property_id === selectedPropertyId);
    const geoAnalysis = analyzeGeoreferencing(selectedProperty, propertyGeo);
    categories.push({
      name: 'Georreferenciamento',
      icon: MapPin,
      weight: 15,
      score: geoAnalysis.score,
      status: geoAnalysis.status,
      details: geoAnalysis.details
    });
    totalScore += geoAnalysis.score;

    // Processos (10 pontos)
    const propertyProcesses = isConsultor
      ? processes.filter(p => p.property_id === selectedPropertyId)
      : processes;
    const processAnalysis = analyzeProcesses(propertyProcesses);
    categories.push({
      name: 'Situação Processual',
      icon: Scale,
      weight: 10,
      score: processAnalysis.score,
      status: processAnalysis.status,
      details: processAnalysis.details
    });
    totalScore += processAnalysis.score;

    // Alertas de Infrações (15 pontos)
    const propertyAlerts = environmentalAlerts.filter(a => a.property_id === selectedPropertyId);
    const alertAnalysis = analyzeAlerts(propertyAlerts);
    categories.push({
      name: 'Alertas de Infrações',
      icon: AlertTriangle,
      weight: 15,
      score: alertAnalysis.score,
      status: alertAnalysis.status,
      details: alertAnalysis.details
    });
    totalScore += alertAnalysis.score;

    const percentage = Math.round(totalScore);
    return { percentage, categories };
  };

  const analyzeLicenses = (licenses) => {
    if (!licenses || licenses.length === 0) {
      return {
        score: 0,
        status: 'critical',
        details: ['Nenhuma licença cadastrada']
      };
    }

    const now = new Date();
    const valid = licenses.filter(l => l.expiry_date && new Date(l.expiry_date) > now);
    const expired = licenses.filter(l => !l.expiry_date || new Date(l.expiry_date) <= now);
    const expiringSoon = licenses.filter(l => {
      if (!l.expiry_date) return false;
      const days = Math.floor((new Date(l.expiry_date) - now) / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 30;
    });

    const details = [];
    let score = 0;
    let status = 'ok';

    if (expired.length === 0 && expiringSoon.length === 0) {
      score = 40;
      status = 'ok';
      details.push(`✓ Todas as ${licenses.length} licenças válidas`);
    } else if (expired.length === 0) {
      score = 28;
      status = 'warning';
      details.push(`⚠ ${expiringSoon.length} licença(s) vencendo em até 30 dias`);
      details.push(`✓ ${valid.length - expiringSoon.length} licença(s) válidas`);
    } else {
      score = 12;
      status = 'critical';
      details.push(`✗ ${expired.length} licença(s) vencida(s)`);
      if (valid.length > 0) details.push(`✓ ${valid.length} licença(s) válidas`);
    }

    return { score, status, details };
  };

  const analyzeDocuments = (documents) => {
    if (!documents || documents.length === 0) {
      return {
        score: 0,
        status: 'critical',
        details: ['Nenhum documento cadastrado']
      };
    }

    const hasCAR = documents.some(d => d.document_type === 'CAR');
    const hasCCIR = documents.some(d => d.document_type === 'CCIR');
    const hasGeo = documents.some(d => d.document_type === 'Georreferenciamento');

    const details = [];
    let score = 0;
    let status = 'ok';

    if (hasCAR) {
      score += 12;
      details.push('✓ CAR cadastrado');
    } else {
      details.push('✗ CAR não cadastrado');
      status = 'warning';
    }

    if (hasCCIR) {
      score += 9;
      details.push('✓ CCIR cadastrado');
    } else {
      details.push('✗ CCIR não cadastrado');
      status = 'warning';
    }

    if (hasGeo) {
      score += 9;
      details.push('✓ Georreferenciamento cadastrado');
    } else {
      details.push('✗ Georreferenciamento não cadastrado');
      status = 'warning';
    }

    if (score === 30) status = 'ok';
    else if (score < 15) status = 'critical';

    return { score, status, details };
  };

  const analyzeGeoreferencing = (property, geoRecords = []) => {
    const hasCoordinates = !!property?.coordinates;
    const hasGeoRecord = geoRecords.length > 0;
    const regularGeo = geoRecords.find(g => g.status === 'Regular');

    if (!hasCoordinates && !hasGeoRecord) {
      return {
        score: 0,
        status: 'warning',
        details: ['Coordenadas não cadastradas']
      };
    }

    if (regularGeo) {
      return {
        score: 15,
        status: 'ok',
        details: ['✓ Georreferenciamento regular cadastrado']
      };
    }

    if (hasGeoRecord) {
      const geo = geoRecords[0];
      return {
        score: 10,
        status: 'warning',
        details: [`⚠ Georreferenciamento ${geo.status || 'cadastrado'} (não regular)`]
      };
    }

    return {
      score: 15,
      status: 'ok',
      details: ['✓ Coordenadas GPS cadastradas']
    };
  };

  const analyzeProcesses = (processes) => {
    if (!processes || processes.length === 0) {
      return {
        score: 15,
        status: 'ok',
        details: ['✓ Sem processos registrados']
      };
    }

    const active = processes.filter(p => p.status === 'Em Andamento');
    
    if (active.length === 0) {
      return {
        score: 15,
        status: 'ok',
        details: [`✓ ${processes.length} processo(s) arquivado(s) ou finalizado(s)`]
      };
    }

    return {
      score: 7,
      status: 'warning',
      details: [
        `⚠ ${active.length} processo(s) ativo(s)`,
        `${processes.length - active.length} processo(s) encerrado(s)`
      ]
    };
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <TrendingUp className="w-7 sm:w-8 h-7 sm:h-8 text-emerald-600 flex-shrink-0" />
            <span>Relatório de Regularidade Ambiental</span>
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Análise completa da conformidade do cliente</p>
        </div>
        <Button variant="outline" className="gap-2 w-full sm:w-auto">
          <Download className="w-4 h-4" />
          Baixar PDF
        </Button>
      </div>

      {/* Seletor de Propriedade */}
      {(properties.length > 1 || isConsultor) && (
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
                  {properties.map(prop => (
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

          return (
            <Card key={idx} className={`border-2 ${categoryStatus.border}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-gray-700" />
                    {category.name}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {category.score}/{category.weight}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={(category.score / category.weight) * 100} className="h-2" />
                  <ul className="space-y-1 mt-4">
                    {category.details.map((detail, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span>{detail}</span>
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