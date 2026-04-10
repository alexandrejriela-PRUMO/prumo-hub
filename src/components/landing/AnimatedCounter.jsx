import { useEffect, useRef, useState } from 'react';

const stats = [
  { value: 500, suffix: '+', label: 'Propriedades Gerenciadas' },
  { value: 200, suffix: '+', label: 'Consultores Ativos' },
  { value: 30, suffix: '+', label: 'Módulos Integrados' },
  { value: 98, suffix: '%', label: 'Satisfação dos Clientes' },
];

function animateCount(to, duration, onUpdate, onDone) {
  const start = performance.now();
  const tick = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    onUpdate(Math.floor(progress * to));
    if (progress < 1) requestAnimationFrame(tick);
    else onDone();
  };
  requestAnimationFrame(tick);
}

export default function AnimatedCounter() {
  const containerRef = useRef(null);
  const [counts, setCounts] = useState(stats.map(() => 0));
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          obs.disconnect();
          stats.forEach((s, i) => {
            animateCount(
              s.value,
              1600,
              (val) => setCounts(prev => { const next = [...prev]; next[i] = val; return next; }),
              () => setCounts(prev => { const next = [...prev]; next[i] = s.value; return next; })
            );
          });
        }
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [started]);

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