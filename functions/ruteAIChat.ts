import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { property_id, message, conversation_history } = await req.json();

    // Fetch property and related data
    const properties = await base44.entities.Property.filter({ id: property_id });
    const property = Array.isArray(properties) ? properties[0] : properties;

    if (!property) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }

    // Fetch all related environmental data
    const [carData, licenses, alerts, cra, documents, processes] = await Promise.all([
      base44.entities.CARManagement.filter({ property_id }).catch(() => []),
      base44.entities.License.filter({ property_id }).catch(() => []),
      base44.entities.EnvironmentalAlert.filter({ property_id }).catch(() => []),
      base44.entities.CRAOrigin.filter({ property_id }).catch(() => []),
      base44.entities.Document.filter({ property_id }).catch(() => []),
      base44.entities.Process.filter({ property_id }).catch(() => [])
    ]);

    const car = (Array.isArray(carData) ? carData[0] : carData) || {};
    const propertyLicenses = Array.isArray(licenses) ? licenses : [];
    const propertyAlerts = Array.isArray(alerts) ? alerts : [];
    const craOrigin = (Array.isArray(cra) ? cra[0] : cra) || {};
    const propertyDocs = Array.isArray(documents) ? documents : [];
    const propertyProcesses = Array.isArray(processes) ? processes : [];

    // Build context for AI
    const propertyContext = {
      name: property.property_name,
      location: `${property.city}/${property.state}`,
      totalArea: property.total_hectares,
      legalReserveRequired: property.legal_reserve_hectares,
      appArea: property.app_hectares,
      carStatus: car.car_status || 'Não informado',
      carNumber: car.car_number || property.car_numbers?.[0],
      validLicenses: propertyLicenses.filter(l => l.status === 'Vigente').length,
      totalLicenses: propertyLicenses.length,
      environmentalAlerts: propertyAlerts.length,
      highSeverityAlerts: propertyAlerts.filter(a => a.severity === 'Alta' || a.severity === 'Crítica').length,
      hasCRA: !!craOrigin.potential_cra_area_hectares,
      potentialCRA: craOrigin.potential_cra_area_hectares || 0,
      processes: propertyProcesses.length,
      documents: propertyDocs.length
    };

    // Create conversation context
    const conversationContext = conversation_history.map(msg => 
      `${msg.role === 'user' ? 'Cliente' : 'Rute'}: ${msg.content}`
    ).join('\n');

    // Build prompt for Claude/GPT
    const systemPrompt = `Você é a Rute, uma consultora ambiental especializada em legislação florestal brasileira (Código Florestal, Lei 12.651/2012). 
    
Propriedade analisada:
- Nome: ${propertyContext.name}
- Localização: ${propertyContext.location}
- Área total: ${propertyContext.totalArea} ha
- Status CAR: ${propertyContext.carStatus}
- Licenças vigentes: ${propertyContext.validLicenses}/${propertyContext.totalLicenses}
- Alertas ambientais: ${propertyContext.environmentalAlerts} (${propertyContext.highSeverityAlerts} críticos)
- Reserva Legal: ${propertyContext.legalReserveRequired} ha exigida
- APPs: ${propertyContext.appArea} ha

Você deve:
1. Responder de forma clara e técnica sobre questões ambientais e jurídicas
2. Fazer recomendações específicas baseadas na legislação brasileira
3. Sugerir próximos passos para regularização
4. Ser educado e profissional, mantendo tom consultivo
5. Quando apropriado, sugerir ferramentas do sistema (CRA, PRAD, etc)

Mantenha respostas concisas (máx 200 palavras). Se o usuário pergunta algo fora do escopo ambiental/jurídico, redirecione para tópicos relevantes.`;

    // Call LLM
    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nHistórico da conversa:\n${conversationContext}\n\nNova pergunta: ${message}`,
      model: 'gpt_5_mini'
    });

    // Generate contextual suggestions
    const suggestions = [];
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('car') && propertyContext.carStatus !== 'Validado') {
      suggestions.push('Como regularizar o CAR?');
    }
    if (lowerMessage.includes('reserva') || lowerMessage.includes('legal')) {
      suggestions.push('Como compensar déficit de Reserva Legal?');
    }
    if (propertyContext.highSeverityAlerts > 0) {
      suggestions.push('Quais são os alertas críticos detectados?');
    }
    if (propertyContext.hasCRA && !lowerMessage.includes('cra')) {
      suggestions.push('Como emitir CRA na minha propriedade?');
    }
    if (propertyContext.validLicenses < propertyContext.totalLicenses) {
      suggestions.push('Quais licenças estão vencidas ou inativas?');
    }
    if (!suggestions.length) {
      suggestions.push('Como gerar uma auditoria completa?', 'Quais são meus riscos ambientais?');
    }

    return Response.json({
      message: aiResponse,
      suggestions: suggestions.slice(0, 3)
    });
  } catch (error) {
    console.error('Error in ruteAIChat:', error);
    return Response.json(
      { 
        message: 'Desculpe, houve um erro ao processar sua pergunta. Tente novamente.',
        error: error.message 
      },
      { status: 500 }
    );
  }
});