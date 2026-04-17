import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_ACCESS = {
  client_consultor: [
    'PropertyCentral',
    'DocumentsHub',
    'Licenses',
    'Processes',
    'EnvironmentalAlerts',
    'RegularityReport',
    'PRAD',
    'Georeferencing',
    'Mappings',
    'ClimateMonitoring',
    'CarbonCredits',
    'PSAContracts',
    'EnvironmentalAssets',
    'EnvironmentalEasements',
  ],
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { pageName } = body;

    if (!pageName) {
      return Response.json({ error: 'pageName é obrigatório' }, { status: 400 });
    }

    // Equipe e Client_Consultor herdam/restringem
    let effectiveUserType = user.user_type;
    if (user.user_type === 'equipe' && user.primary_consultor_type) {
      effectiveUserType = user.primary_consultor_type;
    }

    // Consultor e Produtor têm acesso total
    if (effectiveUserType === 'consultor' || effectiveUserType === 'produtor') {
      return Response.json({ allowed: true });
    }

    // Client_Consultor tem acesso restrito
    if (effectiveUserType === 'client_consultor') {
      const allowedPages = PAGE_ACCESS.client_consultor;
      const allowed = allowedPages.includes(pageName);
      return Response.json({ allowed });
    }

    // Padrão: negar
    return Response.json({ allowed: false });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});