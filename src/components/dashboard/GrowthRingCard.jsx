import React from 'react';
import { MapPin, ShieldCheck } from 'lucide-react';

const COLORS = {
  alerts: '#AF6659',
  processes: '#C9A353',
  licenses: '#47845D',
  documents: '#6C7A72',
};

const STATUS_CONFIG = {
  critical: { badge: 'CRÍTICA', color: COLORS.alerts },
  attention: { badge: 'ATENÇÃO', color: COLORS.processes },
  normal: { badge: 'NORMAL', color: COLORS.licenses },
};

export default function GrowthRingCard({
  property,
  status,
  regularity,
  alerts,
  processes,
  licensesValid,
  licensesTotal,
  documents,
  onClick,
  onManualReview,
}) {
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.normal;

  // SVG ring — 4 equal segments (80° each) with 10° gaps
  const r = 36;
  const C = 2 * Math.PI * r;
  const segmentArc = C * (80 / 360);
  const segmentOffset = C / 4;

  const segments = [
    { color: COLORS.licenses, dashoffset: 0 },
    { color: COLORS.documents, dashoffset: -segmentOffset },
    { color: COLORS.alerts, dashoffset: -2 * segmentOffset },
    { color: COLORS.processes, dashoffset: -3 * segmentOffset },
  ];

  const dataItems = [
    { label: 'Alertas ativos', value: alerts, color: COLORS.alerts },
    { label: 'Processos abertos', value: processes, color: COLORS.processes },
    { label: 'Licenças em dia', value: `${licensesValid}/${licensesTotal}`, color: COLORS.licenses },
    { label: 'Documentos', value: documents, color: COLORS.documents },
  ];

  const locationText = property.city || property.state
    ? `${property.city || '—'}/${property.state || '—'}`
    : '—/—';

  return (
    <div
      onClick={onClick}
      className="relative rounded-3xl overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      style={{ background: 'linear-gradient(135deg, #14281E 0%, #1A3326 100%)' }}
    >
      {/* Subtle glow on hover */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: statusCfg.color }} />

      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#A5B3AA' }} />
            <p className="text-xs font-medium tracking-wide uppercase" style={{ color: '#A5B3AA' }}>
              {locationText}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {property.manual_regularity_enabled && (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-semibold rounded-full px-2 py-0.5"
                style={{ background: 'rgba(71,132,93,0.2)', color: '#6BAE83' }}
              >
                <ShieldCheck className="w-2.5 h-2.5" />
                Reavaliado
              </span>
            )}
            <span
              className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
              style={{ background: statusCfg.color, color: '#FFFFFF' }}
            >
              {statusCfg.badge}
            </span>
          </div>
        </div>

        {/* Property name + client + type */}
        <div className="mb-5">
          <h3 className="text-lg sm:text-xl font-bold text-white truncate leading-tight">
            {property.property_name || 'Propriedade'}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {(property.client_name || property.owner_names) && (
              <p className="text-sm truncate min-w-0" style={{ color: '#A5B3AA' }}>
                {property.client_name || property.owner_names}
              </p>
            )}
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#A5B3AA' }}
            >
              {property.property_type === 'urbano' ? '🏙️ Urbano' : '🌾 Rural'}
            </span>
          </div>
        </div>

        {/* Ring + Data list */}
        <div className="flex items-center gap-5 sm:gap-6">
          {/* Segmented Ring */}
          <div className="relative flex-shrink-0">
            <svg width="100" height="100" viewBox="0 0 100 100" className="flex-shrink-0 transition-transform duration-500 group-hover:scale-110" style={{ transformOrigin: 'center' }}>
               {/* Background track */}
               <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
               {/* Segments */}
               <g transform="rotate(-90 50 50)">
                 {segments.map((seg, i) => (
                   <circle
                     key={i}
                     cx="50"
                     cy="50"
                     r={r}
                     fill="none"
                     stroke={seg.color}
                     strokeWidth="7"
                     strokeLinecap="round"
                     style={{
                       strokeDasharray: `${segmentArc} ${C}`,
                       strokeDashoffset: seg.dashoffset,
                       animation: `draw-arc 1s ease-out ${0.15 * i}s both`,
                     }}
                   />
                 ))}
               </g>
             </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-white leading-none">{regularity}%</span>
              <span className="text-[9px] mt-0.5" style={{ color: '#A5B3AA' }}>regular.</span>
            </div>
          </div>

          {/* Data list */}
          <div className="flex-1 space-y-2.5 min-w-0">
            {dataItems.map((item) => (
              <div key={item.label} className="group/item flex items-center justify-between gap-2 rounded-lg px-2 py-0.5 -mx-2 transition-colors duration-200 hover:bg-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-300 group-hover/item:scale-[1.6]" style={{ background: item.color }} />
                  <span className="text-xs truncate" style={{ color: '#A5B3AA' }}>{item.label}</span>
                </div>
                <span className="text-sm font-bold text-white flex-shrink-0">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reavaliar button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={(e) => { e.stopPropagation(); onManualReview(); }}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors ${
              property.manual_regularity_enabled
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Reavaliação manual de regularidade"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Reavaliar
          </button>
        </div>
      </div>
    </div>
  );
}