import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward /api to the backend in dev so we can use same-origin axios
      '/api': {
        target: 'http://localhost:5001', // Changed from 5000 to match backend port
        changeOrigin: true,
      },
    },
  },
});
