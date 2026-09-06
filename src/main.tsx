import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './design/tokens.css';
import './design/base.css';
import './design/components.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js'); });
}
