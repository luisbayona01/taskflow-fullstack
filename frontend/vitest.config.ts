import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      server: {
        deps: {
          // `async-validator` se distribuye en CommonJS. Al externalizarlo,
          // Node devuelve `{ default: Schema }` y Element Plus deja de poder
          // instanciarlo, por lo que la validación de formularios falla.
          // Inlinearlo permite que Vite aplique la interoperabilidad CJS -> ESM.
          inline: ['element-plus', 'async-validator'],
        },
      },
    },
  }),
)
