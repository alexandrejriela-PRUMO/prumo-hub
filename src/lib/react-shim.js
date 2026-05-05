/**
 * React singleton shim.
 * This file must be imported FIRST in main.jsx (before any SDK or component imports).
 * It patches the global scope so that any bundled copy of React inside @base44/sdk
 * or other third-party packages resolves to the same instance as the app.
 */
import * as React from 'react';
import * as ReactDOM from 'react-dom';

// Expose on globalThis so any inline/bundled React copy can fall back to this instance
if (typeof globalThis !== 'undefined') {
  if (!globalThis.__REACT__) globalThis.__REACT__ = React;
  if (!globalThis.__REACT_DOM__) globalThis.__REACT_DOM__ = ReactDOM;
}

export default React;