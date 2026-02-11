import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    __LOG_LEVEL__: JSON.stringify(mode === 'production' ? 'warn' : 'debug'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 9020,
    host: true,
    allowedHosts: ['spark.local', 'localhost'],
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'certs/cert.pem')),
    },
  },
  preview: {
    port: 9020,
  },
}));
