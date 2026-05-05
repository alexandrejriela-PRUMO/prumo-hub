/**
 * React singleton enforcer — must run before any SDK or lazy page import.
 *
 * Problem: @base44/sdk bundles its own React copy in chunk-CMM6OKGN.js.
 * That chunk initializes React with ReactCurrentDispatcher = null.
 * When a lazy page mounts, it calls useState() on that null dispatcher → crash.
 *
 * Fix: We grab the real React internals and use Object.defineProperty to make
 * ReactCurrentDispatcher on ANY object always point to the real one.
 */
import React from 'react';

const realInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

// Keep a strong reference so GC doesn't collect it
if (typeof window !== 'undefined') {
  window.__REAL_REACT__ = React;
  window.__REAL_REACT_INTERNALS__ = realInternals;
}

// Intercept Object.defineProperty so when the bundled SDK React tries to
// set up its own dispatcher slots, they get redirected to the real ones.
const _origDefineProperty = Object.defineProperty;
Object.defineProperty = function patchedDefineProperty(target, prop, descriptor) {
  if (
    prop === 'ReactCurrentDispatcher' ||
    prop === 'ReactCurrentBatchConfig' ||
    prop === 'ReactCurrentActQueue' ||
    prop === 'ReactCurrentOwner'
  ) {
    // Only intercept if target is NOT the real internals (i.e. it's the SDK's copy)
    if (target !== realInternals && typeof realInternals[prop] !== 'undefined') {
      return _origDefineProperty(target, prop, {
        get() { return realInternals[prop]; },
        set(v) { realInternals[prop] = v; },
        configurable: true,
        enumerable: true,
      });
    }
  }
  return _origDefineProperty(target, prop, descriptor);
};

export default React;