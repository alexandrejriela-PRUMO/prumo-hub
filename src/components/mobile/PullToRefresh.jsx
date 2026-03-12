import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const PULL_THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);

  const isAtTop = () => window.scrollY <= 2;

  const handleTouchStart = useCallback((e) => {
    if (isAtTop()) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!pulling.current || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.45, PULL_THRESHOLD + 24));
    } else {
      pulling.current = false;
      startY.current = null;
      setPullDistance(0);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = null;
  }, [pullDistance, onRefresh, refreshing]);

  const showIndicator = pullDistance > 8 || refreshing;
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative' }}
    >
      {/* Indicator */}
      <div
        style={{
          position: 'fixed',
          top: 72,
          left: '50%',
          transform: `translateX(-50%) translateY(${showIndicator ? Math.min(pullDistance, 56) : -48}px)`,
          transition: refreshing || pullDistance === 0 ? 'transform 0.3s ease' : 'none',
          zIndex: 60,
          pointerEvents: 'none',
        }}
        className="lg:hidden"
      >
        <div className="bg-white border border-emerald-200 rounded-full p-2 shadow-md">
          <RefreshCw
            className="w-5 h-5 text-emerald-600"
            style={{
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
              transform: !refreshing ? `rotate(${progress * 360}deg)` : undefined,
              opacity: Math.max(0.3, progress),
            }}
          />
        </div>
      </div>

      {/* Content shift on pull */}
      <div
        style={{
          transform: showIndicator ? `translateY(${Math.min(pullDistance * 0.4, 28)}px)` : 'translateY(0)',
          transition: pullDistance === 0 ? 'transform 0.3s ease' : 'none',
        }}
      >
        {children}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}