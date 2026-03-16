/**
 * PRUMO Layout & Design System
 * Guia de padrões para consistência visual em toda a aplicação
 */

export const layoutSystem = {
  // Espaçamentos - seguir padrão Tailwind
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
  },

  // Padding padrão para containers
  containerPadding: {
    mobile: 'p-4',      // 16px
    tablet: 'sm:p-6',   // 24px
    desktop: 'lg:p-8',  // 32px
  },

  // Gap padrão entre elementos
  gap: {
    items: 'gap-3',     // Entre itens (8px)
    sections: 'gap-6',  // Entre seções (24px)
    cards: 'gap-4',     // Entre cards (16px)
  },

  // Tamanhos máximos
  maxWidth: {
    full: 'max-w-full',
    sm: 'max-w-md',     // 448px
    md: 'max-w-2xl',    // 672px
    lg: 'max-w-4xl',    // 896px
    xl: 'max-w-6xl',    // 1152px
    '2xl': 'max-w-7xl', // 1280px
  },

  // Alinhamentos de grid
  grid: {
    cols1: 'grid-cols-1',
    cols2mobile: 'md:grid-cols-2',
    cols3desktop: 'lg:grid-cols-3',
    cols4desktop: 'xl:grid-cols-4',
    gap: 'gap-4',
  },

  // Alimentos de título e conteúdo
  typography: {
    title: 'text-2xl sm:text-3xl font-bold text-gray-900',
    subtitle: 'text-lg sm:text-xl font-semibold text-gray-800',
    body: 'text-sm sm:text-base text-gray-700',
    small: 'text-xs sm:text-sm text-gray-600',
  },

  // Cards padrão
  card: 'rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6',

  // Botões padrão
  button: {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg transition-colors',
    tertiary: 'border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors',
  },

  // Cores da marca
  colors: {
    primary: '#1B4332',      // Emerald-950
    secondary: '#40916C',    // Emerald-600
    accent: '#C9A227',       // Amber-500
    success: '#10b981',      // Emerald-500
    warning: '#f59e0b',      // Amber-500
    error: '#ef4444',        // Red-500
    info: '#3b82f6',         // Blue-500
  },
};

// Componente para documentar padrões de layout
export default function LayoutStyleGuide() {
  return (
    <div className="space-y-12 p-8 max-w-6xl mx-auto">
      <section>
        <h1 className="text-3xl font-bold mb-4">Guia de Layout PRUMO</h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">📋 Princípios de Design</h2>
          <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
            <li><strong>Consistência:</strong> Mesmos espaçamentos, cores e estilos em toda a app</li>
            <li><strong>Responsividade:</strong> Mobile-first, escalando para tablets e desktops</li>
            <li><strong>Clareza:</strong> Hierarquia visual clara com tipografia bem definida</li>
            <li><strong>Alinhamento:</strong> Elementos sempre alinhados em grid invisible de 4px</li>
            <li><strong>Espaçamento:</strong> Usar múltiplos de 4px ou 8px (padrão Tailwind)</li>
          </ul>
        </div>

        <div className="space-y-6">
          {/* Exemplo de Card */}
          <div>
            <h3 className="font-semibold mb-2">Card Padrão</h3>
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
              <h4 className="font-semibold text-gray-900 mb-2">Título do Card</h4>
              <p className="text-sm text-gray-600">Conteúdo com espaçamento padrão e alinhamento consistente.</p>
            </div>
          </div>

          {/* Exemplo de Grid */}
          <div>
            <h3 className="font-semibold mb-2">Grid de Cards (Responsivo)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
                  <p className="font-semibold mb-2">Card {i}</p>
                  <p className="text-sm text-gray-600">Responsivo: 1 coluna mobile, 2 tablet, 3 desktop</p>
                </div>
              ))}
            </div>
          </div>

          {/* Exemplo de Buttons */}
          <div>
            <h3 className="font-semibold mb-2">Botões Padrão</h3>
            <div className="flex flex-wrap gap-3">
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors">
                Primário
              </button>
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg transition-colors">
                Secundário
              </button>
              <button className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors">
                Terciário
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}