/**
 * Comprobación responsive del frontend de TaskFlow.
 *
 * Para cada viewport exigido se recorren las vistas principales y se verifica
 * que el documento no tiene scroll horizontal injustificado
 * (`documentElement.scrollWidth <= documentElement.clientWidth`).
 *
 * Los datos provienen del doble de la API (`e2e/helpers/mock-api.ts`), por lo
 * que la comprobación no necesita backend ni base de datos.
 */

import { test, expect } from '@playwright/test'

import { disableAuthentication, mockApi } from './helpers/mock-api'

interface Viewport {
  name: string
  width: number
  height: number
}

interface Route {
  name: string
  path: string
  /** Selector que debe estar visible antes de medir. */
  ready: string
}

const VIEWPORTS: Viewport[] = [
  { name: 'desktop 1920x1080', width: 1920, height: 1080 },
  { name: 'laptop 1366x768', width: 1366, height: 768 },
  { name: 'tablet 768x1024', width: 768, height: 1024 },
  { name: 'móvil 390x844', width: 390, height: 844 },
  { name: 'móvil pequeño 360x800', width: 360, height: 800 },
]

const ROUTES: Route[] = [
  // Los selectores de espera dependen de los datos de la API: cuando aparecen,
  // la vista ya está pintada con su contenido definitivo. El listado de
  // proyectos usa tabla en escritorio y tarjetas por debajo de 900 px.
  { name: 'panel', path: '/', ready: '.dashboard__stat-value' },
  { name: 'listado de proyectos', path: '/projects', ready: '.project-card, .el-table__row' },
  { name: 'detalle de proyecto', path: '/projects/10', ready: '.member-list__item' },
  { name: 'listado de tareas', path: '/projects/10/tasks', ready: '.el-table__row' },
  { name: 'detalle de tarea', path: '/projects/10/tasks/100', ready: '.comment-item' },
]

for (const viewport of VIEWPORTS) {
  test.describe(`responsive en ${viewport.name}`, () => {
    // El viewport se fija al crear el contexto: es más estable que redimensionar
    // la página en caliente (WebKit falla al redimensionar la ventana).
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('no hay scroll horizontal en las vistas principales', async ({ page }) => {
      await mockApi(page)

      const measurements: Array<{ route: string; scrollWidth: number; clientWidth: number }> = []

      for (const route of ROUTES) {
        await page.goto(route.path)
        await page.locator(route.ready).first().waitFor()

        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))

        measurements.push({ route: route.name, ...metrics })
      }

      const overflows = measurements
        .filter((measurement) => measurement.scrollWidth > measurement.clientWidth)
        .map(
          (measurement) =>
            `${measurement.route}: scrollWidth ${measurement.scrollWidth} > clientWidth ${measurement.clientWidth}`,
        )

      expect(overflows, `Scroll horizontal en ${viewport.name}`).toEqual([])
    })

    test('la pantalla de login no tiene scroll horizontal', async ({ page }) => {
      await mockApi(page)

      await page.goto('/login')
      await disableAuthentication(page)
      await page.goto('/login')

      await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()

      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))

      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
    })
  })
}

test.describe('responsive en móvil 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('el menú lateral se convierte en drawer y el listado usa tarjetas', async ({ page }) => {
    await mockApi(page)

    await page.goto('/projects')

    await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible()

    const sidebar = page.locator('.app-shell__aside')
    await expect(sidebar).not.toHaveClass(/app-shell__aside--open/)

    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await expect(sidebar).toHaveClass(/app-shell__aside--open/)

    // Con menos de 900 px el listado de proyectos se muestra en modo tarjetas.
    await expect(page.locator('.project-list__grid')).toBeVisible()
    await expect(page.locator('.project-table')).toHaveCount(0)
  })
})
