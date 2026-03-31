/**
 * PRUMO - Guia de Responsividade e Espaçamento
 * Melhores práticas para layout consistente em todos os dispositivos
 */

export const ResponsivityGuide = {
  // Breakpoints do Tailwind (não alterar)
  breakpoints: {
    mobile: '0px',        // Padrão
    sm: '640px',          // Telefones maiores
    md: '768px',          // Tablets
    lg: '1024px',         // Desktops pequenos
    xl: '1280px',         // Desktops
    '2xl': '1536px',      // Desktops grandes
  },

  // Padrão mobile-first (começar simples, adicionar complexidade)
  mobileFirstRules: {
    1: 'Começar com layout de coluna única',
    2: 'Usar classes padrão para mobile',
    3: 'Adicionar sm:, md:, lg: para tamanhos maiores',
    4: 'Nunca usar max-[quebra]',
    5: 'Testar em todos os breakpoints',
  },

  // Padrões de espaçamento por screen
  spacingPatterns: {
    mobile: {
      containerPadding: 'p-4',        // 16px
      betweenElements: 'gap-3',       // 12px (ou mb-3)
      sectionMargin: 'mb-4',          // 16px
      headerPadding: 'pb-4',          // 16px
    },
    tablet: {
      containerPadding: 'sm:p-6',     // 24px
      betweenElements: 'sm:gap-4',    // 16px
      sectionMargin: 'sm:mb-6',       // 24px
      headerPadding: 'sm:pb-6',       // 24px
    },
    desktop: {
      containerPadding: 'lg:p-8',     // 32px
      betweenElements: 'lg:gap-6',    // 24px
      sectionMargin: 'lg:mb-8',       // 32px
      headerPadding: 'lg:pb-8',       // 32px
    },
  },

  // Exemplos de componentes responsivos
  examples: {
    // Container responsivo
    containerResponsive: `
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Conteúdo com padding escalonado */}
      </div>
    `,

    // Grid responsivo
    gridResponsive: `
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Cards em 1 coluna mobile, 2 tablet, 3 desktop */}
      </div>
    `,

    // Tipografia responsiva
    typographyResponsive: `
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
        Título escalável
      </h1>
      <p className="text-sm sm:text-base text-gray-600">
        Parágrafo responsivo
      </p>
    `,

    // Botões responsivos
    buttonResponsive: `
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button className="flex-1 px-4 py-2 sm:py-2.5 text-sm sm:text-base">
          Botão adaptável
        </button>
      </div>
    `,

    // Forms responsivos
    formResponsive: `
      <form className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <input className="w-full px-3 py-2" placeholder="Campo 1" />
          <input className="w-full px-3 py-2" placeholder="Campo 2" />
        </div>
      </form>
    `,
  },
};

// Checklist de responsividade
export const ResponsivityChecklist = [
  '✓ Teste em mobile (320px), tablet (768px) e desktop (1024px)',
  '✓ Padding escalonado: p-4 → sm:p-6 → lg:p-8',
  '✓ Gap escalonado: gap-3 → sm:gap-4 → lg:gap-6',
  '✓ Tipografia escalável: text-sm → sm:text-base → lg:text-lg',
  '✓ Imagens responsivas: usar img com max-w-full',
  '✓ Botões: width full em mobile, auto em desktop',
  '✓ Grids: grid-cols-1 → md:grid-cols-2 → lg:grid-cols-3',
  '✓ Overflow: não há scroll horizontal',
  '✓ Toque: botões min 44x44px em mobile',
  '✓ Textos: linha máxima ~65 caracteres',
];

// Cores consistentes
export const ColorPalette = {
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  emerald: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#145231',
    950: '#0f2f1f',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
};

// Exemplo de componente bem estruturado
export const ExampleWellStructuredComponent = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50/20">
      {/* Header com espaçamento responsivo */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Exemplo Bem Estruturado
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Este componente segue todos os padrões de responsividade
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Section com espaçamento */}
        <section className="mb-8 sm:mb-10 lg:mb-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
            Seção com Grid Responsivo
          </h2>
          
          {/* Grid responsivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">
                  Card {i}
                </h3>
                <p className="text-sm text-gray-600">
                  Conteúdo com espaçamento responsivo e consistente
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Botões responsivos */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors">
            Botão Primário
          </button>
          <button className="flex-1 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors">
            Botão Secundário
          </button>
        </div>
      </main>
    </div>
  );
};

// Documento final
export default function ResponsivityGuideDoc() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">Guia de Responsividade PRUMO</h1>
        <p className="text-lg text-gray-600">
          Padrões para garantir layout consistente em todos os dispositivos
        </p>
      </div>

      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">Checklist de Responsividade</h2>
        <ul className="space-y-2">
          {ResponsivityChecklist.map((item, i) => (
            <li key={i} className="text-sm text-blue-800">{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Regras Mobile-First</h2>
        <ol className="space-y-2 list-decimal list-inside text-gray-700">
          <li>Começar com layout de coluna única</li>
          <li>Usar classes padrão (sem prefixo) para mobile</li>
          <li>Adicionar sm:, md:, lg: para tamanhos maiores</li>
          <li>Nunca usar max-[quebra] para regras (usar min em seu lugar)</li>
          <li>Testar em todos os breakpoints</li>
        </ol>
      </section>

      <ExampleWellStructuredComponent />
    </div>
  );
}