import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'VITE_');
  if (!environment.VITE_APP_BASE_URL) throw new Error('VITE_APP_BASE_URL is not configured.');

  const pathname = new URL(environment.VITE_APP_BASE_URL).pathname;
  const base = pathname === '/' ? '/' : `${pathname.replace(/\/+$/, '')}/`;

  return {
    base,
    plugins: [react(), tailwindcss()],
  };
});
