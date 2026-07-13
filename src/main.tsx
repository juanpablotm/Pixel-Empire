import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { applyDemoFromQuery } from './ui/demo';
import './ui/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('No existe el elemento #root');

// Escaparate visual solo en dev (docs/13): `?demo=studio|gala` para capturas.
// En producción es un no-op que Vite elimina (import.meta.env.DEV = false).
applyDemoFromQuery();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
