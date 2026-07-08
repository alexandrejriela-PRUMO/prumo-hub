// Páginas por tipo de usuário
const PAGE_ACCESS = {
  // Client_Consultor: apenas visualização/download
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

  // Equipe: acesso do principal (Consultor/Produtor)
  equipe: 'inherit',
  equipe_consultor: 'inherit',
  equipe_produtor: 'inherit',

  // Consultor: acesso completo + gerenciamento
  consultor: '*',

  // Produtor: acesso completo
  produtor: '*',
};

// Permissões por tipo de usuário
const PERMISSIONS = {
  client_consultor: {
    view: true,
    download: true,
    edit: false,
    delete: false,
    invite: false,
    admin: false,
  },
  equipe: 'inherit',
  equipe_consultor: 'inherit',
  equipe_produtor: 'inherit',
  consultor: {
    view: true,
    download: true,
    edit: true,
    delete: true,
    invite: true,
    admin: false,
  },
  produtor: {
    view: true,
    download: true,
    edit: true,
    delete: true,
    invite: true,
    admin: false,
  },
};

// Quem pode pagar
const PAYING_USERS = ['consultor', 'produtor'];

// Quem pode convidar qual tipo
const INVITE_RULES = {
  consultor: ['equipe', 'equipe_consultor', 'equipe_produtor', 'client_consultor'],
  produtor: ['equipe', 'equipe_produtor'],
  equipe: [],
  equipe_consultor: [],
  equipe_produtor: [],
  client_consultor: [],
};

export function canAccessPage(userType, pageName) {
  if (!userType) return false;
  const pages = PAGE_ACCESS[userType];
  if (pages === '*') return true;
  if (pages === 'inherit') return false; // Equipe deve usar do principal
  return pages?.includes(pageName) || false;
}

export function getPermissions(userType) {
  if (!userType) return null;
  const perms = PERMISSIONS[userType];
  if (perms === 'inherit') return null; // Equipe herda do principal
  return perms;
}

export function hasPermission(userType, action) {
  const perms = getPermissions(userType);
  if (!perms) return false;
  return perms[action] === true;
}

export function canPayForSubscription(userType) {
  return PAYING_USERS.includes(userType);
}

export function canInviteUserType(userType, targetUserType) {
  const allowedTypes = INVITE_RULES[userType] || [];
  return allowedTypes.includes(targetUserType);
}

export function isClient(userType) {
  return userType === 'client_consultor';
}

export function isTeamMember(userType) {
  return userType === 'equipe' || userType === 'equipe_consultor' || userType === 'equipe_produtor';
}

export function isPrincipal(userType) {
  return userType === 'consultor' || userType === 'produtor';
}

export function requiresPayment(userType) {
  return PAYING_USERS.includes(userType);
}

export function getMenuItems(userType) {
  if (userType === 'client_consultor') {
    return 'client_consultor'; // Menu reduzido
  }
  if (userType === 'equipe' || userType === 'equipe_consultor' || userType === 'equipe_produtor') {
    return 'inherit'; // Herda do principal
  }
  if (userType === 'consultor') {
    return 'consultor'; // Menu completo consultor
  }
  if (userType === 'produtor') {
    return 'produtor'; // Menu completo produtor
  }
  return null;
}