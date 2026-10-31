import { test, expect } from '@playwright/test'

test('redirige a la pantalla de inicio de sesión cuando no hay sesión', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login(\?.*)?$/)
  await expect(page.getByText('TaskFlow', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})

test('permite navegar al formulario de registro', async ({ page }) => {
  await page.goto('/login')

  await page.getByRole('link', { name: 'Regístrate' }).click()

  await expect(page).toHaveURL(/\/register$/)
  await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeVisible()
})

test('abre el menú lateral en dispositivos móviles', async ({ page }) => {
  // Sesión simulada: basta con responder al endpoint /me del backend.
  await page.route('**/api/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Authenticated.',
        data: {
          user: {
            id: 1,
            name: 'Ada Lovelace',
            email: 'ada@taskflow.test',
            email_verified_at: null,
            created_at: null,
            updated_at: null,
          },
        },
      }),
    }),
  )

  await page.addInitScript(() => {
    window.localStorage.setItem('taskflow.token', 'fake-token')
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible()

  const sidebar = page.locator('.app-shell__aside')
  await expect(sidebar).not.toHaveClass(/app-shell__aside--open/)

  await page.getByRole('button', { name: 'Abrir menú' }).click()

  await expect(sidebar).toHaveClass(/app-shell__aside--open/)
  await expect(sidebar.getByRole('link', { name: 'Proyectos' })).toBeVisible()
})
