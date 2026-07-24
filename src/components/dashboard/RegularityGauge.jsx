import React from 'react';

/**
 * Gauge circular interativo e futurista para exibir regularidade.
 * SVG com gradiente, glow e animação de preenchimento.
 */
export default function RegularityGauge({ value = 0, size = 72, label = 'Regularidade' }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  // Cor dinâmica baseada no valor
  const colorSet =
    value >= 70
      ? { from: '#10b981', to: '#34d399', glow: '#10b981' }
      : value >= 40
      ? { from: '#f59e0b', to: '#fbbf24', glow: '#f59e0b' }
      : { from: '#ef4444', to: '#f87171', glow: '#ef4444' };

  const gradientId = `gauge-grad-${value}-${size}`;

  return (
    <div className="relative flex flex-col items-center justify-center group" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 transform transition-transform group-hover:scale-105 duration-300">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorSet.from} />
            <stop offset="100%" stopColor={colorSet.to} />
          </linearGradient>
          <filter id={`glow-${gradientId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-200 dark:text-slate-700"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter={`url(#glow-${gradientId})`}
          style={{
            transition: 'stroke-dashoffset 0.8s ease-in-out',
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold text-sm leading-none"
          style={{ color: colorSet.from }}
        >
          {value}%
        </span>
      </div>
    </div>
  );
}