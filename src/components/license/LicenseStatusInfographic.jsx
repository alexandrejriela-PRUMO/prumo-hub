import React, { useMemo, useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { AlertTriangle, Clock, CheckCircle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

function getLicenseStatusKey(license) {
  if (!license.expiry_date) return 'vigente';
  const days = differenceInDays(parseISO(license.expiry_date), new Date());
  const threshold = license.renewal_days_before || 90;
  if (days < 0) return 'vencida';
  if (days <= threshold) return 'a_vencer';
  return 'vigente';
}

export default function LicenseStatusInfographic({ allLicenses = [], allProperties = [], onFilterSelect, activeFilter, onSelectProperty }) {
  const [expandedGroup, setExpandedGroup] = useState(null);

  // Agrupa licenças por status e por propriedade
  const grouped = useMemo(() => {
    const result = {
      vencida: [],
      a_vencer: [],
      vigente: [],
    };
    allLicenses.forEach(lic => {
      const key = getLicenseStatusKey(lic);
      result[key].push(lic);
    });
    return result;
  }, [allLicenses]);

  // Para cada status, agrupa por propriedade
  const byProperty = useMemo(() => {
    const propMap = {};
    allProperties.forEach(p => { propMap[p.id] = p; });

    const groupByProp = (licenses) => {
      const map = {};
      licenses.forEach(lic => {
        const propId = lic.property_id;
        if (!map[propId]) {
          map[propId] = {
            property: propMap[propId],
            licenses: [],
          };
        }
        map[propId].licenses.push(lic);
      });
      return Object.values(map);
    };

    return {
      vencida: groupByProp(grouped.vencida),
      a_vencer: groupByProp(grouped.a_vencer),
      vigente: groupByProp(grouped.vigente),
    };
  }, [grouped, allProperties]);

  const total = allLicenses.length;
  if (total === 0) return null;

  const cards = [
    {
      key: 'vencida',
      label: 'Vencidas',
      count: grouped.vencida.length,
      icon: AlertTriangle,
      bg: 'bg-red-50 hover:bg-red-100',
      border: activeFilter === 'vencida' ? 'border-red-500 ring-2 ring-red-300' : 'border-red-200',
      iconColor: 'text-red-500',
      countColor: 'text-red-700',
      labelColor: 'text-red-600',
      barColor: 'bg-red-400',
      expandBg: 'bg-red-50 border-red-200',
      propBadge: 'bg-red-100 text-red-700',
    },
    {
      key: 'a_vencer',
      label: 'A Vencer',
      count: grouped.a_vencer.length,
      icon: Clock,
      bg: 'bg-amber-50 hover:bg-amber-100',
      border: activeFilter === 'a_vencer' ? 'border-amber-500 ring-2 ring-amber-300' : 'border-amber-200',
      iconColor: 'text-amber-500',
      countColor: 'text-amber-700',
      labelColor: 'text-amber-600',
      barColor: 'bg-amber-400',
      expandBg: 'bg-amber-50 border-amber-200',
      propBadge: 'bg-amber-100 text-amber-700',
    },
    {
      key: 'vigente',
      label: 'Vigentes',
      count: grouped.vigente.length,
      icon: CheckCircle,
      bg: 'bg-emerald-50 hover:bg-emerald-100',
      border: activeFilter === 'vigente' ? 'border-emerald-500 ring-2 ring-emerald-300' : 'border-emerald-200',
      iconColor: 'text-emerald-500',
      countColor: 'text-emerald-700',
      labelColor: 'text-emerald-600',
      barColor: 'bg-emerald-400',
      expandBg: 'bg-emerald-50 border-emerald-200',
      propBadge: 'bg-emerald-100 text-emerald-700',
    },
  ];

  const handleCardClick = (key) => {
    onFilterSelect(activeFilter === key ? null : key);
    setExpandedGroup(prev => prev === key ? null : key);
  };

  return (
    <div className="space-y-3">
      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map(card => {
          const Icon = card.icon;
          const pct = total > 0 ? Math.round((card.count / total) * 100) : 0;
          const isExpanded = expandedGroup === card.key;
          return (
            <div key={card.key} className="space-y-0">
              <button
                onClick={() => handleCardClick(card.key)}
                className={`w-full rounded-xl border-2 p-3 sm:p-4 transition-all duration-200 cursor-pointer text-left ${card.bg} ${card.border}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className={`text-2xl sm:text-3xl font-bold ${card.countColor}`}>{card.count}</div>
                <div className={`text-xs font-medium mt-0.5 ${card.labelColor}`}>{card.label}</div>
                {/* Barra de progresso */}
                <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${card.barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">{pct}% do total</div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Painel expandido: lista de propriedades com atalho */}
      {expandedGroup && byProperty[expandedGroup]?.length > 0 && (
        <div className={`rounded-xl border p-3 sm:p-4 space-y-2 ${cards.find(c => c.key === expandedGroup)?.expandBg}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Clientes com licenças {cards.find(c => c.key === expandedGroup)?.label.toLowerCase()}
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {byProperty[expandedGroup].map(({ property, licenses }) => (
              <div
                key={property?.id || 'unknown'}
                className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-3 py-2 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {property?.property_name || 'Propriedade não encontrada'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {property?.client_name || property?.owner_email || ''}
                    {property?.city ? ` · ${property.city}/${property.state}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cards.find(c => c.key === expandedGroup)?.propBadge}`}>
                    {licenses.length}
                  </span>
                  <button
                    onClick={() => onSelectProperty && onSelectProperty(property?.id)}
                    className="flex items-center gap-1 text-xs text-emerald-700 font-medium px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    title="Ver licenças desta propriedade"
                  >
                    Ver <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}