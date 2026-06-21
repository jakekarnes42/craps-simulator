import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base to the homepage path in package.json or '/'
  base: '/craps-simulator/',
  build: {
    outDir: 'build'
  }
});
