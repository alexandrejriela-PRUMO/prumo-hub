import React, { useEffect, useRef, useState } from 'react';

export default function AnimatedCounter({ value = 0, duration = 1.2, className, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const target = Number(value) || 0;
          let startTs = null;
          const step = (ts) => {
            if (!startTs) startTs = ts;
            const progress = Math.min((ts - startTs) / (duration * 1000), 1);
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setDisplay(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref} className={className}>{display}{suffix}</span>;
}