import { useEffect, useRef, useState } from 'react';

const stats = [
  { value: 500, suffix: '+', label: 'Propriedades Gerenciadas' },
  { value: 200, suffix: '+', label: 'Consultores Ativos' },
  { value: 30, suffix: '+', label: 'Módulos Integrados' },
  { value: 98, suffix: '%', label: 'Satisfação dos Clientes' },
];

export default function AnimatedCounter() {
  const containerRef = useRef(null);
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const startedRef = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          obs.disconnect();

          const duration = 1800;
          const startTime = performance.now();

          const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease out
            const eased = 1 - Math.pow(1 - progress, 3);

            setCounts(stats.map(s => Math.floor(eased * s.value)));

            if (progress < 1) requestAnimationFrame(tick);
            else setCounts(stats.map(s => s.value));
          };

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full py-8 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((s, i) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-white mb-1">
              {counts[i].toLocaleString('pt-BR')}{s.suffix}
            </div>
            <p className="text-emerald-300 text-xs font-medium leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}