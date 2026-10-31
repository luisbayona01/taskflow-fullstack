import { test, expect } from '@playwright/test'

import { disableAuthentication, mockApi } from './helpers/mock-api'

test('redirige a la pantalla de inicio de sesión cuando no hay sesión', async ({ page }) => {
  await mockApi(page, { authenticated: false })

  await page.goto('/')

  await expect(page).toHaveURL(/\/login(\?.*)?$/)
  await expect(page.getByText('TaskFlow', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})

test('permite navegar al formulario de registro', async ({ page }) => {
  await mockApi(page, { authenticated: false })

  await page.goto('/login')

  await page.getByRole('link', { name: 'Regístrate' }).click()

  await expect(page).toHaveURL(/\/register$/)
  await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeVisible()
})

test('abre el menú lateral en dispositivos móviles', async ({ page }) => {
  await mockApi(page)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible()

  const sidebar = page.locator('.app-shell__aside')
  await expect(sidebar).not.toHaveClass(/app-shell__aside--open/)

  await page.getByRole('button', { name: 'Abrir menú' }).click()

  await expect(sidebar).toHaveClass(/app-shell__aside--open/)
  await expect(sidebar.getByRole('link', { name: 'Proyectos' })).toBeVisible()
})

test('protege el panel cuando la API responde 401', async ({ page }) => {
  await mockApi(page)

  await page.route('**/api/projects', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        message: 'Unauthenticated.',
        errors: null,
      }),
    }),
  )

  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
})

test('muestra la pantalla de inicio de sesión cuando no hay sesión', async ({ page }) => {
  await mockApi(page)

  await page.goto('/login')
  await disableAuthentication(page)
  await page.goto('/login')

  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})
