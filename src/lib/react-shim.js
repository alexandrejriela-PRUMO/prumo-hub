/**
 * React singleton enforcer.
 *
 * The @base44/sdk ships with a bundled copy of React inside chunk-CMM6OKGN.js.
 * When that chunk initializes, it calls useState() on its own null-initialized
 * React instance before the app's React is ready.
 *
 * Fix: we grab the app's React internals object and store it on `window.__react_internals`.
 * Then we override `Object.defineProperty` temporarily so that when the SDK chunk
 * tries to define its own ReactCurrentDispatcher (the thing that holds useState),
 * it gets redirected to the app's dispatcher instead.
 */
import React from 'react';
import ReactDOM from 'react-dom';

const internals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

// Store the canonical dispatcher reference globally
if (typeof window !== 'undefined') {
  window.__REACT_INTERNALS__ = internals;
  window.__REACT_CURRENT_OWNER__ = internals;

  // Patch: any object that tries to set ReactCurrentDispatcher gets the real one
  const _defineProperty = Object.defineProperty.bind(Object);
  Object.defineProperty = function(obj, prop, descriptor) {
    if (
      prop === 'ReactCurrentDispatcher' ||
      prop === 'ReactCurrentBatchConfig' ||
      prop === 'ReactCurrentOwner'
    ) {
      // Redirect to the app's internals instead of the bundled one
      return _defineProperty(obj, prop, {
        get: () => internals[prop],
        set: (v) => { internals[prop] = v; },
        configurable: true,
      });
    }
    return _defineProperty(obj, prop, descriptor);
  };
}

export { React as default, ReactDOM };