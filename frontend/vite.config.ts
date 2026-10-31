import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Proxy hacia el backend Laravel. Se activa usando VITE_API_BASE_URL=/api
    // en lugar de la URL absoluta (recomendado en desarrollo).
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
  build: {
    // Element Plus se importa completo, por lo que se separa en su propio
    // chunk para no bloquear la carga inicial de la aplicación.
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          if (/node_modules[\\/]element-plus[\\/]/.test(id)) {
            return 'element-plus'
          }

          if (/node_modules[\\/](vue|vue-router|pinia|axios)[\\/]/.test(id)) {
            return 'vendor'
          }

          return undefined
        },
      },
    },
  },
})
