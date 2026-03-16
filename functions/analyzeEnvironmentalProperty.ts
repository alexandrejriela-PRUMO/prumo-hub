import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { property_id } = await req.json();

    // Fetch all related data
    const property = property_id 
      ? await base44.entities.Property.filter({ id: property_id })
      : await base44.entities.Property.filter({ owner_email: user.email });

    const selectedProperty = Array.isArray(property) ? property[0] : property;
    if (!selectedProperty) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }

    // Fetch related data
    const [carManagement, licenses, environmentalAlerts, cra] = await Promise.all([
      base44.entities.CARManagement.filter({ property_id: selectedProperty.id }).catch(() => []),
      base44.entities.License.filter({ property_id: selectedProperty.id }).catch(() => []),
      base44.entities.EnvironmentalAlert.filter({ property_id: selectedProperty.id }).catch(() => []),
      base44.entities.CRAOrigin.filter({ property_id: selectedProperty.id }).catch(() => [])
    ]);

    const car = Array.isArray(carManagement) ? carManagement[0] : carManagement;
    const propertyLicenses = Array.isArray(licenses) ? licenses : [];
    const alerts = Array.isArray(environmentalAlerts) ? environmentalAlerts : [];
    const craOrigin = Array.isArray(cra) ? cra[0] : cra;

    // Analyze CAR Status
    const carStatus = car?.car_status || 'Não informado';
    const carOk = carStatus === 'Validado' || carStatus === 'Validado';

    // Analyze Legal Reserve
    const legalReserveRequired = selectedProperty.legal_reserve_hectares || 0;
    const legalReserveExisting = car?.recovery_area_hectares || selectedProperty.legal_reserve_hectares || 0;
    const legalReserveDeficit = Math.max(0, legalReserveRequired - legalReserveExisting);
    const legalReserveStatus = legalReserveDeficit === 0 ? 'ok' : legalReserveDeficit > 0 ? 'deficit' : 'surplus';

    // Analyze APPs
    const appTotal = selectedProperty.app_hectares || 0;
    const appIssues = alerts.filter(a => 
      (a.alert_type === 'APP' || a.alert_type === 'Desmatamento') && 
      a.severity !== 'Baixa'
    ).length;
    const appStatus = appIssues === 0 ? 'ok' : appIssues <= 2 ? 'warning' : 'critical';

    // Detect environmental liabilities
    const liabilities = car?.environmental_liabilities || [];
    const liabilitiesStatus = liabilities.length === 0 ? 'ok' : 'present';

    // Analyze environmental assets
    const hasValidLicenses = propertyLicenses.filter(l => l.status === 'Vigente').length > 0;
    const craAvailable = craOrigin ? craOrigin.potential_cra_area_hectares > 0 : false;

    // Calculate compliance percentage
    const complianceFactors = {
      car: carOk ? 1 : 0,
      legalReserve: legalReserveStatus === 'ok' ? 1 : 0.5,
      app: appStatus === 'ok' ? 1 : 0.5,
      liabilities: liabilitiesStatus === 'ok' ? 1 : 0,
      licenses: hasValidLicenses ? 1 : 0.5
    };
    const compliancePercentage = Math.round(
      (Object.values(complianceFactors).reduce((a, b) => a + b, 0) / Object.keys(complianceFactors).length) * 100
    );

    // Determine overall status
    let regularityStatus = 'regular';
    if (compliancePercentage >= 80) regularityStatus = 'regular';
    else if (compliancePercentage >= 50) regularityStatus = 'atencao';
    else regularityStatus = 'irregular';

    // Generate recommendations
    const recommendations = [];

    if (!carOk) {
      recommendations.push({
        title: 'Regularizar CAR',
        description: `O CAR encontra-se em situação ${carStatus}. Dirija-se ao órgão ambiental para atualizar ou validar o cadastro.`,
        priority: 'Alta'
      });
    }

    if (legalReserveDeficit > 0) {
      recommendations.push({
        title: 'Compensar Déficit de Reserva Legal',
        description: `Existe déficit de ${legalReserveDeficit.toFixed(2)}ha de Reserva Legal. Considere adquirir CRA (Cotas de Reserva Ambiental) para compensação.`,
        priority: 'Alta'
      });
    }

    if (appIssues > 0) {
      recommendations.push({
        title: 'Proteger Áreas de Preservação Permanente',
        description: `Foram detectados ${appIssues} alertas em APPs. Inspecione a propriedade e implemente medidas de proteção.`,
        priority: appIssues > 2 ? 'Alta' : 'Média'
      });
    }

    if (liabilities.length > 0) {
      recommendations.push({
        title: 'Regularizar Passivos Ambientais',
        description: `Identificados passivos: ${liabilities.join(', ')}. Elabore planos de recuperação ou compensação.`,
        priority: 'Alta'
      });
    }

    if (craAvailable) {
      recommendations.push({
        title: 'Emitir CRA',
        description: `A propriedade possui potencial para emissão de CRA. Isso pode gerar receita através da venda de créditos de reserva legal excedente.`,
        priority: 'Média'
      });
    }

    if (!hasValidLicenses) {
      recommendations.push({
        title: 'Renovar Licenças Ambientais',
        description: `Nenhuma licença válida detectada. Solicite licenças apropriadas conforme as atividades realizadas.`,
        priority: 'Média'
      });
    }

    // Build final report
    const report = {
      compliance_percentage: compliancePercentage,
      regularity_status: regularityStatus,
      
      executive_summary: `A propriedade ${selectedProperty.property_name} apresenta ${regularityStatus === 'regular' ? 'boa conformidade' : regularityStatus === 'atencao' ? 'conformidade parcial com atenção necessária' : 'não conformidade'} com a legislação ambiental. ${recommendations.length > 0 ? 'Recomenda-se tomar providências para regularização.' : 'Está em conformidade total.'}`,
      
      // CAR Analysis
      car_status: carStatus,
      car_details: `O CAR encontra-se em situação: ${carStatus}. ${car?.car_notes || 'Sem observações adicionais.'}`,
      car_inconsistencies: car?.car_inconsistencies || null,
      
      // Legal Reserve Analysis
      legal_reserve_status: legalReserveStatus,
      legal_reserve_required: legalReserveRequired.toFixed(2),
      legal_reserve_existing: legalReserveExisting.toFixed(2),
      legal_reserve_deficit: Math.max(0, legalReserveDeficit).toFixed(2),
      
      // APP Analysis
      app_status: appStatus,
      app_total_area: appTotal.toFixed(2),
      app_intact_area: (appTotal - (appIssues * 5)).toFixed(2), // Estimativa
      app_issues: appIssues > 0 
        ? `Detectados ${appIssues} alertas em APPs: ${alerts.filter(a => a.alert_type === 'APP').map(a => a.title).join(', ')}`
        : null,
      
      // Liabilities
      liabilities_status: liabilitiesStatus,
      liabilities: liabilities,
      
      // Environmental assets
      environmental_assets: {
        valid_licenses: propertyLicenses.filter(l => l.status === 'Vigente').length,
        cra_potential: craOrigin?.potential_cra_area_hectares || 0
      },
      
      // Alerts and risks
      environmental_risks: alerts
        .filter(a => a.severity === 'Alta' || a.severity === 'Crítica')
        .map(a => `${a.title} (${a.alert_type})`),
      
      // Recommendations
      recommendations: recommendations
    };

    return Response.json(report);
  } catch (error) {
    console.error('Error analyzing property:', error);
    return Response.json(
      { error: 'Failed to analyze property', details: error.message },
      { status: 500 }
    );
  }
});