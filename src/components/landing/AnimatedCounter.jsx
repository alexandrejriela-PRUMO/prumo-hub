import { useEffect, useRef, useState } from 'react';

function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return inView;
}

function Counter({ to, suffix = '', duration = 1800 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const increment = to / (duration / (1000 / 60));
    const timer = setInterval(() => {
      start += increment;
      if (start >= to) { setCount(to); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, to, duration]);

  return <span ref={ref}>{count.toLocaleString('pt-BR')}{suffix}</span>;
}

const stats = [
  { value: 500, suffix: '+', label: 'Propriedades Gerenciadas' },
  { value: 200, suffix: '+', label: 'Consultores Ativos' },
  { value: 30, suffix: '+', label: 'Módulos Integrados' },
  { value: 98, suffix: '%', label: 'Satisfação dos Clientes' },
];

export default function AnimatedCounter() {
  return (
    <div className="w-full py-12 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-white mb-1">
              <Counter to={s.value} suffix={s.suffix} />
            </div>
            <p className="text-emerald-300 text-xs font-medium leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}