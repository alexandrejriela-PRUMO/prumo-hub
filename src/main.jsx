// Step 1: patch React SYNCHRONOUSLY before anything else loads
import React from 'react';

const internals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

// Expose on window so SDK's bundled React copy can be intercepted at runtime
if (typeof window !== 'undefined') {
  window.__REACT_INTERNALS__ = internals;

  // When SDK's bundled React tries to set its own dispatcher objects,
  // redirect them to the real React internals via property interception
  const _orig = Object.defineProperty.bind(Object);
  Object.defineProperty = function(target, prop, descriptor) {
    const keys = ['ReactCurrentDispatcher', 'ReactCurrentBatchConfig', 'ReactCurrentActQueue', 'ReactCurrentOwner'];
    if (keys.includes(prop) && target !== internals) {
      // Redirect reads/writes to the real internals
      return _orig(target, prop, {
        get() { return internals[prop]; },
        set(v) { internals[prop] = v; },
        configurable: true,
        enumerable: true,
      });
    }
    return _orig(target, prop, descriptor);
  };
}

// Step 2: Now safe to load the rest of the app
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);