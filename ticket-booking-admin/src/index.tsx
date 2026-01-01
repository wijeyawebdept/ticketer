import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './i18n/config';

// Prevent number inputs from changing value on mouse wheel scroll
document.addEventListener('wheel', (e) => {
  const target = e.target as HTMLElement;
  if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
    // Only prevent if the input is focused
    if (document.activeElement === target) {
      e.preventDefault();
    }
  }
}, { passive: false });

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
