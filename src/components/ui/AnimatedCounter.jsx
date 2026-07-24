import React, { useEffect, useRef, useState } from 'react';

export default function AnimatedCounter({ value = 0, duration = 0.8, className, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const startVal = fromRef.current;
    if (startVal === target) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    let startTs = null;
    const step = (ts) => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / (duration * 1000), 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(startVal + (target - startVal) * eased);
      setDisplay(current);
      fromRef.current = current;
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return <span className={className}>{display}{suffix}</span>;
}