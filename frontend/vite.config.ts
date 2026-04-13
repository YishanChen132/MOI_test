// 這個檔案負責設定前端的 Vite 開發與測試行為。
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
