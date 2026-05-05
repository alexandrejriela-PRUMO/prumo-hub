// Step 1: patch React SYNCHRONOUSLY before anything else loads
import React from 'react';

const internals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

// Expose on window so SDK's bundled React copy can be intercepted at runtime
if (typeof window !== 'undefined') {
  window.__REACT_INTERNALS__ = internals;
  window.__REACT__ = React;

  const KEYS = ['ReactCurrentDispatcher', 'ReactCurrentBatchConfig', 'ReactCurrentActQueue', 'ReactCurrentOwner'];

  // Patch Object.defineProperty so any foreign React copy redirects its internals to ours
  const _orig = Object.defineProperty.bind(Object);
  Object.defineProperty = function(target, prop, descriptor) {
    if (KEYS.includes(prop) && target !== internals) {
      return _orig(target, prop, {
        get() { return internals[prop]; },
        set(v) { internals[prop] = v; },
        configurable: true,
        enumerable: true,
      });
    }
    return _orig(target, prop, descriptor);
  };

  // Also patch Object.assign so a foreign React copy can't overwrite dispatcher via assign
  const _origAssign = Object.assign;
  Object.assign = function(target, ...sources) {
    for (const src of sources) {
      if (src && typeof src === 'object') {
        for (const key of KEYS) {
          if (key in src && target !== internals) {
            // Silently redirect — don't copy the foreign value
            delete src[key];
          }
        }
      }
    }
    return _origAssign(target, ...sources);
  };
}

// Step 2: Now safe to load the rest of the app
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);