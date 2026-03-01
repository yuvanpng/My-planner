import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { seedDefaultData } from './lib/store';
import { pullFromSupabase, testConnection } from './lib/sync';

// Initial sync: pull data from Supabase, then seed defaults if needed
async function init() {
  const connected = await testConnection();
  if (connected) {
    console.log('[App] Supabase connected. Pulling data...');
    await pullFromSupabase();
  } else {
    console.log('[App] Supabase not available. Using localStorage only.');
  }
  seedDefaultData();
}

init();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
