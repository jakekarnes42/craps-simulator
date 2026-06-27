import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/craps-simulator/',
  build: {
    outDir: 'build'
  }
});
