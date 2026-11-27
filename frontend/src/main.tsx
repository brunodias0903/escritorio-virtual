import './app/styles/tokens.css';
import './app/styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Elemento #root não encontrado.');
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
