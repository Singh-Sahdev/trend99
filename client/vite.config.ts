import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  server: {
    proxy: {
      '/stream-generate': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true, // Only if you're using websockets
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  }
})
