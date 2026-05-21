import React from 'react';
import { useEffectiveUser } from '../../hooks/useEffectiveUser';
import { Users, Eye, EyeOff } from 'lucide-react';

const MODULE_LABELS = {
  office: 'Escritório',
  property_center: 'Propriedades',
  financial: 'Financeiro',
  reports: 'Relatórios',
  ai_chat: 'IA Rute',
  advanced_modules: 'Módulos Avançados',
  team_management: 'Gestão de Equipe',
};

export default function EquipeContextBanner() {
  const { isEquipe, consultorName, memberRole, permissions, loading } = useEffectiveUser();

  if (!isEquipe || loading) return null;

  const hasAccess = [];
  const noAccess = [];

  if (permissions?.office?.view) hasAccess.push('Escritório'); else noAccess.push('Escritório');
  if (permissions?.property_center?.view) hasAccess.push('Propriedades'); else noAccess.push('Propriedades');
  if (permissions?.financial?.view) hasAccess.push('Financeiro'); else noAccess.push('Financeiro');
  if (permissions?.reports?.view) hasAccess.push('Relatórios'); else noAccess.push('Relatórios');
  if (permissions?.ai_chat?.access) hasAccess.push('IA Rute'); else noAccess.push('IA Rute');

  return (
    <div className="mx-3 mb-2 p-3 bg-amber-900/25 border border-amber-600/35 rounded-xl">
      <div className="flex items-center gap-1.5 mb-2">
        <Users className="w-3 h-3 text-amber-400 flex-shrink-0" />
        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">Modo Equipe</span>
      </div>
      <div className="space-y-1">
        <p className="text-[11px] text-amber-200 leading-tight">
          <span className="text-amber-400 font-medium">Responsável: </span>
          {consultorName || 'N/A'}
        </p>
        {memberRole && (
          <p className="text-[11px] text-amber-200 leading-tight">
            <span className="text-amber-400 font-medium">Função: </span>
            {memberRole}
          </p>
        )}
        {permissions?.team_management?.manage && (
          <p className="text-[11px] text-amber-200 leading-tight">
            <span className="text-amber-400 font-medium">Admin de equipe</span>
          </p>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-amber-700/30 space-y-1">
        {hasAccess.length > 0 && (
          <div className="flex items-start gap-1">
            <Eye className="w-2.5 h-2.5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-emerald-300/80 leading-tight">{hasAccess.join(' · ')}</p>
          </div>
        )}
        {noAccess.length > 0 && (
          <div className="flex items-start gap-1">
            <EyeOff className="w-2.5 h-2.5 text-red-400/70 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-red-300/60 leading-tight">{noAccess.join(' · ')}</p>
          </div>
        )}
      </div>
    </div>
  );
}