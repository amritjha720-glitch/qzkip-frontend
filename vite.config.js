import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // This line prevents duplicate React instances
    dedupe: ['react', 'react-dom', 'react-router-dom'], 
  },
  // NEW: Fixes COOP popup block errors
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
    }
  }
});