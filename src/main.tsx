import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { hydrate } from '@/db/store';
import './index.css';

const el = document.getElementById('root')!;
const root = createRoot(el);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

hydrate().catch((err) => {
  console.error('Failed to open local database', err);
  root.unmount();
  el.innerHTML = `<div style="padding:2rem;font-family:system-ui;color:#f4f4f5;background:#09090b;min-height:100vh">
    <h1 style="font-size:1.25rem;font-weight:700">Storage unavailable</h1>
    <p style="color:#a1a1aa;margin-top:.5rem">Collab Tracker needs IndexedDB. Private browsing modes on some browsers disable it — please open the app in a normal window.</p>
  </div>`;
});
