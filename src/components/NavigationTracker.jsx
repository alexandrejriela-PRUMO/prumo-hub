import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useInRouterContext } from 'react-router-dom';

function NavigationTrackerInner() {
  const location = useLocation();
  useEffect(() => {
    // Track page navigation
  }, [location.pathname]);
  return null;
}

export default function NavigationTracker() {
  const inRouter = useInRouterContext();
  if (!inRouter) return null;
  return <NavigationTrackerInner />;
}