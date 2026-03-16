/**
 * Padrões de Consistência para PRUMO
 * Componentes-padrão para usar em toda a aplicação
 */

import React from 'react';
import { cn } from '@/lib/utils';

// Container-padrão para páginas
export const PageContainer = ({ children, className }) => (
  <div className={cn('space-y-6 sm:space-y-8', className)}>
    {children}
  </div>
);

// Header-padrão com título
export const PageHeader = ({ title, subtitle, children, className }) => (
  <div className={cn('pb-6 sm:pb-8 border-b border-gray-200', className)}>
    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
      {title}
    </h1>
    {subtitle && (
      <p className="text-sm sm:text-base text-gray-600">
        {subtitle}
      </p>
    )}
    {children}
  </div>
);

// Seção-padrão
export const Section = ({ title, subtitle, children, className }) => (
  <div className={cn('space-y-4', className)}>
    {title && (
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-600">
            {subtitle}
          </p>
        )}
      </div>
    )}
    {children}
  </div>
);

// Card-padrão com espaçamento consistente
export const CardComponent = ({ children, className, clickable = false }) => (
  <div className={cn(
    'rounded-lg border border-gray-200 bg-white shadow-sm p-4 sm:p-6 transition-all',
    clickable && 'hover:shadow-md cursor-pointer',
    className
  )}>
    {children}
  </div>
);

// Grid responsivo-padrão
export const ResponsiveGrid = ({ children, cols = 3, gap = 4, className }) => {
  const colMap = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  const gapMap = {
    3: 'gap-3',
    4: 'gap-4',
    6: 'gap-6',
  };

  return (
    <div className={cn(
      'grid grid-cols-1',
      colMap[cols] || colMap[3],
      gapMap[gap] || gapMap[4],
      className
    )}>
      {children}
    </div>
  );
};

// Botões padronizados
export const PrimaryButton = ({ children, className, ...props }) => (
  <button className={cn(
    'bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors duration-200 flex items-center gap-2',
    className
  )} {...props}>
    {children}
  </button>
);

export const SecondaryButton = ({ children, className, ...props }) => (
  <button className={cn(
    'bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium px-4 py-2.5 rounded-lg transition-colors duration-200 flex items-center gap-2',
    className
  )} {...props}>
    {children}
  </button>
);

export const TertiaryButton = ({ children, className, ...props }) => (
  <button className={cn(
    'border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-lg transition-colors duration-200 flex items-center gap-2',
    className
  )} {...props}>
    {children}
  </button>
);

// Inputs padronizados
export const InputField = ({ label, error, className, ...props }) => (
  <div className="space-y-2">
    {label && (
      <label className="block text-sm font-medium text-gray-900">
        {label}
      </label>
    )}
    <input className={cn(
      'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors',
      error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
      className
    )} {...props} />
    {error && (
      <p className="text-xs text-red-600">{error}</p>
    )}
  </div>
);

// Alert padronizado
export const Alert = ({ type = 'info', title, message, children, className }) => {
  const typeConfig = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={cn(
      'rounded-lg border p-4',
      typeConfig[type],
      className
    )}>
      {title && (
        <h4 className="font-semibold mb-1">{title}</h4>
      )}
      {message && (
        <p className="text-sm">{message}</p>
      )}
      {children}
    </div>
  );
};

// Badge padronizado
export const BadgeComponent = ({ variant = 'default', children, className }) => {
  const variants = {
    default: 'bg-gray-200 text-gray-800',
    primary: 'bg-emerald-100 text-emerald-800',
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

// Loading skeleton
export const SkeletonLoader = ({ className }) => (
  <div className={cn(
    'animate-pulse bg-gray-200 rounded-lg',
    className
  )} />
);

// Exemplo de uso
export default function PatternDemo() {
  return (
    <PageContainer>
      <PageHeader
        title="Padrões de Consistência"
        subtitle="Componentes-padrão para usar em toda a aplicação"
      />

      <Section title="Cards Responsivos">
        <ResponsiveGrid cols={3}>
          {[1, 2, 3].map(i => (
            <CardComponent key={i}>
              <h3 className="font-semibold mb-2">Card {i}</h3>
              <p className="text-sm text-gray-600">Conteúdo consistente com espaçamento padrão</p>
            </CardComponent>
          ))}
        </ResponsiveGrid>
      </Section>

      <Section title="Botões Padrão">
        <div className="flex flex-wrap gap-3">
          <PrimaryButton>Primário</PrimaryButton>
          <SecondaryButton>Secundário</SecondaryButton>
          <TertiaryButton>Terciário</TertiaryButton>
        </div>
      </Section>

      <Section title="Alertas">
        <div className="space-y-3">
          <Alert type="success" title="Sucesso" message="Operação realizada com sucesso" />
          <Alert type="error" title="Erro" message="Algo deu errado" />
          <Alert type="warning" title="Aviso" message="Atenção necessária" />
          <Alert type="info" title="Informação" message="Dados adicionais" />
        </div>
      </Section>
    </PageContainer>
  );
}