import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default defineConfig(async (env) => {
  // `vite.config.ts` se exporta como función (necesita el modo para leer el
  // entorno), por lo que hay que resolverlo antes de fusionarlo.
  const base = typeof viteConfig === 'function' ? await viteConfig(env) : viteConfig

  return mergeConfig(base, {
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      setupFiles: ['./src/__tests__/setup.ts'],
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
  })
})
