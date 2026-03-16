import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { property_id, conversation_history } = await req.json();

    // Fetch all property data
    const properties = await base44.entities.Property.filter({ id: property_id });
    const property = Array.isArray(properties) ? properties[0] : properties;

    if (!property) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }

    // Fetch all related data in parallel
    const [
      carData, licenses, alerts, cra, documents, 
      processes, contracts, prad, georeferencing
    ] = await Promise.all([
      base44.entities.CARManagement.filter({ property_id }).catch(() => []),
      base44.entities.License.filter({ property_id }).catch(() => []),
      base44.entities.EnvironmentalAlert.filter({ property_id }).catch(() => []),
      base44.entities.CRAOrigin.filter({ property_id }).catch(() => []),
      base44.entities.Document.filter({ property_id }).catch(() => []),
      base44.entities.Process.filter({ property_id }).catch(() => []),
      base44.entities.ClientContract.filter({ property_id }).catch(() => []),
      base44.entities.PRAD.filter({ property_id }).catch(() => []),
      base44.entities.Georeferencing.filter({ property_id }).catch(() => [])
    ]);

    const car = (Array.isArray(carData) ? carData[0] : carData) || {};
    const propertyLicenses = Array.isArray(licenses) ? licenses : [];
    const propertyAlerts = Array.isArray(alerts) ? alerts : [];
    const craOrigin = (Array.isArray(cra) ? cra[0] : cra) || {};
    const propertyDocs = Array.isArray(documents) ? documents : [];
    const propertyProcesses = Array.isArray(processes) ? processes : [];
    const propertyContracts = Array.isArray(contracts) ? contracts : [];
    const pradData = Array.isArray(prad) ? prad : [];
    const geoData = Array.isArray(georeferencing) ? georeferencing : [];

    // Build comprehensive audit report
    const auditReport = {
      metadata: {
        generated_date: new Date().toISOString(),
        property_id: property.id,
        property_name: property.property_name,
        owner: property.owner_names,
        location: `${property.city}/${property.state}`,
        coordinates: property.coordinates
      },

      executive_summary: {
        total_area_hectares: property.total_hectares,
        property_type: property.property_type,
        main_activity: property.main_activity,
        car_status: car.car_status || 'Não informado',
        compliance_level: getComplianceLevel(propertyLicenses, propertyAlerts)
      },

      car_analysis: {
        car_number: car.car_number || 'Não cadastrado',
        registration_date: car.car_registration_date,
        last_update: car.car_last_update,
        status: car.car_status,
        total_area: car.car_area_hectares,
        inconsistencies: car.car_inconsistencies || 'Nenhuma',
        pra_status: car.pra_status,
        pra_deadline: car.pra_deadline,
        recommendations: buildCARRecommendations(car)
      },

      legal_reserve_analysis: {
        required_hectares: property.legal_reserve_hectares || 0,
        existing_hectares: car.recovery_area_hectares || 0,
        deficit: Math.max(0, (property.legal_reserve_hectares || 0) - (car.recovery_area_hectares || 0)),
        environmental_liabilities: car.environmental_liabilities || [],
        recovery_project_status: car.recovery_project_status,
        prad_projects: pradData.length,
        recommendations: buildReserveRecommendations(property, car)
      },

      app_analysis: {
        total_area_hectares: property.app_hectares || 0,
        alerts_detected: propertyAlerts.filter(a => a.alert_type === 'APP').length,
        high_severity_count: propertyAlerts.filter(a => a.alert_type === 'APP' && (a.severity === 'Alta' || a.severity === 'Crítica')).length,
        status: propertyAlerts.filter(a => a.alert_type === 'APP' && (a.severity === 'Alta' || a.severity === 'Crítica')).length === 0 ? 'Conforme' : 'Não conforme',
        recommendations: buildAPPRecommendations(propertyAlerts)
      },

      licenses_and_permits: {
        total_licenses: propertyLicenses.length,
        valid_licenses: propertyLicenses.filter(l => l.status === 'Vigente').length,
        expired_licenses: propertyLicenses.filter(l => l.status === 'Vencida').length,
        licenses_list: propertyLicenses.map(l => ({
          type: l.license_type,
          number: l.license_number,
          status: l.status,
          issue_date: l.issue_date,
          expiry_date: l.expiry_date,
          issuing_body: l.environmental_agency
        })),
        recommendations: buildLicenseRecommendations(propertyLicenses)
      },

      environmental_alerts: {
        total_alerts: propertyAlerts.length,
        critical_alerts: propertyAlerts.filter(a => a.severity === 'Crítica').length,
        high_severity: propertyAlerts.filter(a => a.severity === 'Alta').length,
        medium_severity: propertyAlerts.filter(a => a.severity === 'Média').length,
        alerts_list: propertyAlerts.map(a => ({
          type: a.alert_type,
          severity: a.severity,
          title: a.title,
          affected_area: a.affected_area_hectares,
          detection_date: a.detection_date,
          status: a.status
        })),
        detected_issues: extractDetectedIssues(propertyAlerts)
      },

      cra_and_assets: {
        has_surplus_reserve: craOrigin.potential_cra_area_hectares > 0,
        potential_cra_hectares: craOrigin.potential_cra_area_hectares || 0,
        surplus_vegetation: craOrigin.surplus_native_vegetation_hectares || 0,
        cra_recommendations: buildCRARecommendations(craOrigin),
        market_opportunities: getMarketOpportunities(craOrigin, propertyContracts)
      },

      processes_and_disputes: {
        total_processes: propertyProcesses.length,
        processes_list: propertyProcesses.map(p => ({
          number: p.process_number,
          status: p.status,
          type: p.process_type,
          filing_date: p.filing_date
        }))
      },

      contracts_and_agreements: {
        total_contracts: propertyContracts.length,
        contracts_list: propertyContracts.map(c => ({
          type: c.contract_type,
          status: c.status,
          start_date: c.start_date,
          end_date: c.end_date
        }))
      },

      documents: {
        total_documents: propertyDocs.length,
        document_types: countDocumentTypes(propertyDocs),
        documents_list: propertyDocs.slice(0, 20).map(d => ({
          type: d.document_type,
          name: d.document_name,
          upload_date: d.created_date
        }))
      },

      georeferencing: {
        available: geoData.length > 0,
        surveys_count: geoData.length,
        latest_survey: geoData.length > 0 ? geoData[0].created_date : null
      },

      legal_recommendations: buildLegalRecommendations(property, car, propertyLicenses, propertyAlerts),
      
      regularization_roadmap: buildRegularizationRoadmap(property, car, propertyLicenses, propertyAlerts),

      risk_assessment: {
        compliance_percentage: calculateCompliance(property, car, propertyLicenses, propertyAlerts),
        main_risks: identifyMainRisks(property, car, propertyAlerts),
        priority_actions: getPriorityActions(property, car, propertyLicenses, propertyAlerts)
      }
    };

    return Response.json(auditReport);
  } catch (error) {
    console.error('Error generating audit:', error);
    return Response.json(
      { error: 'Failed to generate audit', details: error.message },
      { status: 500 }
    );
  }
});

// Helper functions
function getComplianceLevel(licenses, alerts) {
  const validLicenses = licenses.filter(l => l.status === 'Vigente').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'Crítica' || a.severity === 'Alta').length;
  
  if (validLicenses === 0 || criticalAlerts > 2) return 'Crítico';
  if (criticalAlerts > 0) return 'Atenção';
  return 'Conforme';
}

function calculateCompliance(property, car, licenses, alerts) {
  let score = 0;
  
  if (car.car_status === 'Validado') score += 30;
  else score += 10;
  
  const validLicenses = licenses.filter(l => l.status === 'Vigente').length;
  score += Math.min(20, (validLicenses / Math.max(1, licenses.length)) * 20);
  
  const criticalAlerts = alerts.filter(a => a.severity === 'Crítica' || a.severity === 'Alta').length;
  score += Math.max(0, 30 - (criticalAlerts * 5));
  
  score += 20; // Base score
  
  return Math.min(100, score);
}

function buildCARRecommendations(car) {
  const recs = [];
  if (car.car_status !== 'Validado') {
    recs.push('Atualizar CAR com dados mais recentes');
  }
  if (car.car_inconsistencies) {
    recs.push('Resolver inconsistências apontadas pelo CAR');
  }
  if (car.pra_status !== 'Concluído') {
    recs.push('Acompanhar cronograma do PRA');
  }
  return recs;
}

function buildReserveRecommendations(property, car) {
  const deficit = Math.max(0, (property.legal_reserve_hectares || 0) - (car.recovery_area_hectares || 0));
  const recs = [];
  if (deficit > 0) {
    recs.push(`Compensar ${deficit.toFixed(2)}ha através de CRA ou Servidão Ambiental`);
  }
  return recs;
}

function buildAPPRecommendations(alerts) {
  const appAlerts = alerts.filter(a => a.alert_type === 'APP');
  return appAlerts.length > 0 
    ? [`Proteger ${appAlerts.length} áreas de APP identificadas`]
    : ['APPs em conformidade com legislação'];
}

function buildLicenseRecommendations(licenses) {
  const expired = licenses.filter(l => l.status === 'Vencida');
  return expired.length > 0 
    ? [`Renovar ${expired.length} licença(s) vencida(s)`]
    : ['Todas as licenças vigentes'];
}

function buildCRARecommendations(craOrigin) {
  const recs = [];
  if (craOrigin.potential_cra_area_hectares > 0) {
    recs.push(`Emitir ${craOrigin.potential_cra_area_hectares.toFixed(2)}ha em CRA`);
    recs.push('Gerar receita através da comercialização de créditos ambientais');
  }
  return recs;
}

function buildLegalRecommendations(property, car, licenses, alerts) {
  const recs = [];
  
  // CAR recommendations
  if (!car.car_status || car.car_status !== 'Validado') {
    recs.push({
      category: 'CAR',
      text: 'Protocolar atualização do CAR conforme Lei 12.651/2012',
      priority: 'Alta'
    });
  }

  // License recommendations
  const expiredLicenses = licenses.filter(l => l.status === 'Vencida');
  if (expiredLicenses.length > 0) {
    recs.push({
      category: 'Licenças',
      text: `Renovar ${expiredLicenses.length} licença(s) em atraso conforme legislação ambiental`,
      priority: 'Alta'
    });
  }

  return recs;
}

function buildRegularizationRoadmap(property, car, licenses, alerts) {
  return {
    phase_1_immediate: 'Atualizar documentação e protocolar CAR',
    phase_2_short_term: 'Renovar licenças e resolver inconsistências',
    phase_3_medium_term: 'Implementar planos de recuperação (PRAD)',
    phase_4_long_term: 'Consolidar conformidade e buscar certificações'
  };
}

function identifyMainRisks(property, car, alerts) {
  const risks = [];
  const criticalAlerts = alerts.filter(a => a.severity === 'Crítica' || a.severity === 'Alta');
  
  if (criticalAlerts.length > 0) {
    risks.push(`Risco ambiental crítico: ${criticalAlerts.length} alerta(s) detectado(s)`);
  }
  if (car.car_status !== 'Validado') {
    risks.push('Risco jurídico: CAR não validado');
  }
  
  return risks;
}

function getPriorityActions(property, car, licenses, alerts) {
  return [
    'Protocolar atualização do CAR',
    'Renovar licenças vencidas',
    'Mapear áreas com alertas críticos',
    'Implementar planos de recuperação'
  ];
}

function extractDetectedIssues(alerts) {
  return alerts
    .filter(a => a.severity === 'Alta' || a.severity === 'Crítica')
    .map(a => `${a.title} (${a.alert_type})`)
    .slice(0, 5);
}

function countDocumentTypes(documents) {
  const types = {};
  documents.forEach(d => {
    types[d.document_type || 'Outro'] = (types[d.document_type || 'Outro'] || 0) + 1;
  });
  return types;
}

function getMarketOpportunities(craOrigin, contracts) {
  const opps = [];
  if (craOrigin.potential_cra_area_hectares > 100) {
    opps.push('Alto potencial de comercialização de CRA');
  }
  return opps;
}