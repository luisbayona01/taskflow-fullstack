/**
 * Preparación global del entorno de pruebas (jsdom).
 *
 * jsdom no implementa `window.scrollTo`, que Vue Router usa en su
 * `scrollBehavior`. Se sustituye por una función inofensiva para que las
 * pruebas no ensucien la salida con avisos del navegador simulado.
 */

import { beforeAll } from 'vitest'

beforeAll(() => {
  window.scrollTo = (): void => {
    /* Sin efecto en jsdom. */
  }
})
