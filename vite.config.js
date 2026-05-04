import { defineConfig } from 'vite';

export default defineConfig({
  // Allow Vite to expose variables starting with SUPABASE_ to the client
  envPrefix: ['VITE_', 'SUPABASE_'],
});
