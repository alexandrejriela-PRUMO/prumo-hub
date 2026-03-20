import React from 'react';
import { CheckCircle2, XCircle, GraduationCap, Briefcase, Scale, Settings, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ROLE_DEFINITIONS = {
  'Engenheiro': {
    icon: Briefcase,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600',
    description: 'Acesso técnico completo. Pode editar dados ambientais, georref. e mapeamentos.',
    permissions: {
      office:           { view: true, edit: true },
      property_center:  { view: true, edit: true },
      advanced_modules: { access: true },
      reports:          { view: true },
      ai_chat:          { access: true },
      team_management:  { manage: false },
      financial:        { view: false },
    }
  },
  'Advogado': {
    icon: Scale,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    iconColor: 'text-purple-600',
    description: 'Acesso a contratos, processos e licenças. Atua na parte jurídica e documental.',
    permissions: {
      office:           { view: true, edit: true },
      property_center:  { view: true, edit: false },
      advanced_modules: { access: false },
      reports:          { view: true },
      ai_chat:          { access: true },
      team_management:  { manage: false },
      financial:        { view: false },
    }
  },
  'Administrador': {
    icon: Settings,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconColor: 'text-emerald-600',
    description: 'Gestão operacional completa. Controla equipe e visualiza financeiro.',
    permissions: {
      office:           { view: true, edit: true },
      property_center:  { view: true, edit: true },
      advanced_modules: { access: true },
      reports:          { view: true },
      ai_chat:          { access: true },
      team_management:  { manage: true },
      financial:        { view: true },
    }
  },
  'Estagiário': {
    icon: GraduationCap,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconColor: 'text-yellow-600',
    description: 'Apoio operacional com acesso de visualização. Não edita dados críticos.',
    permissions: {
      office:           { view: true, edit: false },
      property_center:  { view: true, edit: false },
      advanced_modules: { access: false },
      reports:          { view: false },
      ai_chat:          { access: false },
      team_management:  { manage: false },
      financial:        { view: false },
    }
  },
  'Outro': {
    icon: User,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    iconColor: 'text-gray-500',
    description: 'Acesso básico ao escritório e visualização de propriedades.',
    permissions: {
      office:           { view: true, edit: false },
      property_center:  { view: true, edit: false },
      advanced_modules: { access: false },
      reports:          { view: false },
      ai_chat:          { access: false },
      team_management:  { manage: false },
      financial:        { view: false },
    }
  },
};

const MODULE_LABELS = {
  office:           'Escritório (visualizar)',
  office_edit:      'Escritório (editar)',
  property_center:  'Propriedades (visualizar)',
  property_center_edit: 'Propriedades (editar)',
  advanced_modules: 'Módulos Avançados',
  reports:          'Relatórios',
  ai_chat:          'IA Rute',
  team_management:  'Gerenciar Equipe',
  financial:        'Financeiro',
};

function getAccessList(permissions) {
  const yes = [];
  const no = [];

  const check = (label, val) => (val ? yes : no).push(label);

  check('Escritório (visualizar)', permissions?.office?.view);
  check('Escritório (editar)', permissions?.office?.edit);
  check('Propriedades (visualizar)', permissions?.property_center?.view);
  check('Propriedades (editar)', permissions?.property_center?.edit);
  check('Módulos Avançados', permissions?.advanced_modules?.access);
  check('Relatórios', permissions?.reports?.view);
  check('IA Rute', permissions?.ai_chat?.access);
  check('Gerenciar Equipe', permissions?.team_management?.manage);
  check('Financeiro', permissions?.financial?.view);

  return { yes, no };
}

/** Mini preview usado no select de convite */
export function RolePermissionsInline({ role }) {
  const def = ROLE_DEFINITIONS[role];
  if (!def) return null;
  const Icon = def.icon;
  const { yes, no } = getAccessList(def.permissions);

  return (
    <div className="mt-3 p-3 rounded-xl border bg-gray-50 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${def.iconColor}`} />
        <span className="text-sm font-semibold text-gray-800">{role}</span>
        <Badge className={`text-xs border ${def.color}`}>{role}</Badge>
      </div>
      <p className="text-xs text-gray-600">{def.description}</p>
      <div className="grid grid-cols-1 gap-1 mt-1">
        {yes.map(item => (
          <div key={item} className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            <span className="text-xs text-gray-700">{item}</span>
          </div>
        ))}
        {no.map(item => (
          <div key={item} className="flex items-center gap-1.5">
            <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
            <span className="text-xs text-gray-400">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card completo para exibição na tela Minha Equipe */
export function RoleCard({ role }) {
  const def = ROLE_DEFINITIONS[role];
  if (!def) return null;
  const Icon = def.icon;
  const { yes, no } = getAccessList(def.permissions);

  return (
    <div className="p-4 rounded-xl border bg-white space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${def.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-semibold text-gray-900">{role}</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{def.description}</p>
      <div className="space-y-1">
        {yes.slice(0, 4).map(item => (
          <div key={item} className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            <span className="text-xs text-gray-700">{item}</span>
          </div>
        ))}
        {no.filter(n => ['Financeiro','Gerenciar Equipe'].includes(n)).map(item => (
          <div key={item} className="flex items-center gap-1.5">
            <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
            <span className="text-xs text-gray-400">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { ROLE_DEFINITIONS };