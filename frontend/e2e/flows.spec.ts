/**
 * Flujos E2E principales de TaskFlow.
 *
 * Los nueve flujos solicitados (login, dashboard, proyectos, crear proyecto,
 * crear tarea, filtrar tareas, detalle, comentar y logout) se ejecutan contra
 * un doble de la API REST (`e2e/helpers/mock-api.ts`), de modo que la suite
 * no depende de una base de datos ni de un backend en marcha.
 *
 * Para ejecutarlos contra el backend real, consulta `e2e/README.md`.
 */

import { test, expect } from '@playwright/test'

import { mockApi } from './helpers/mock-api'

test.describe('Flujos principales de TaskFlow', () => {
  /* ------------------------------- 1. Login -------------------------------- */

  test('inicia sesión con credenciales válidas', async ({ page }) => {
    const api = await mockApi(page, { authenticated: false })

    await page.goto('/login')

    await page.getByPlaceholder('tu@correo.com').fill('ada@taskflow.test')
    await page.getByPlaceholder('••••••••').fill('secret123')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()

    const loginRequest = api.last('POST', '/login')

    expect(loginRequest?.body).toEqual({ email: 'ada@taskflow.test', password: 'secret123' })
  })

  /* ----------------------------- 2. Dashboard ------------------------------- */

  test('visualiza el panel con los totales de proyectos y tareas', async ({ page }) => {
    await mockApi(page)

    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Progreso global' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Proyectos recientes' })).toBeVisible()

    const labels = page.locator('.dashboard__stat-label')
    await expect(labels).toHaveText(['Proyectos', 'Tareas', 'Completadas', 'En curso', 'Vencidas'])

    const values = page.locator('.dashboard__stat-value')
    await expect(values.nth(0)).toHaveText('1')
    await expect(values.nth(1)).toHaveText('2')
    await expect(values.nth(2)).toHaveText('1')
  })

  /* --------------------------- 3. Consultar proyectos ----------------------- */

  test('consulta el listado de proyectos', async ({ page }) => {
    await mockApi(page)

    await page.goto('/projects')

    await expect(page.getByRole('heading', { name: 'Proyectos' })).toBeVisible()

    const row = page.locator('.el-table__row', { hasText: 'TaskFlow' })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('Ada Lovelace')
    await expect(row).toContainText('Propietario')
  })

  /* ---------------------------- 4. Crear proyecto --------------------------- */

  test('crea un proyecto y accede a su detalle', async ({ page }) => {
    const api = await mockApi(page)

    await page.goto('/projects')

    await page.getByRole('button', { name: 'Nuevo proyecto' }).first().click()
    await page.getByPlaceholder('Nombre del proyecto').fill('Proyecto E2E')
    await page.getByPlaceholder('Descripción opcional del proyecto').fill('Creado desde Playwright')
    await page.getByRole('button', { name: 'Crear proyecto' }).click()

    await expect(page).toHaveURL(/\/projects\/12$/)
    await expect(page.getByRole('heading', { name: 'Proyecto E2E' })).toBeVisible()

    const createRequest = api.last('POST', '/projects')

    expect(createRequest?.body).toEqual({
      name: 'Proyecto E2E',
      description: 'Creado desde Playwright',
    })
  })

  /* ----------------------------- 5. Crear tarea ----------------------------- */

  test('crea una tarea y abre su detalle', async ({ page }) => {
    const api = await mockApi(page)

    await page.goto('/projects/10/tasks')

    await page.getByRole('button', { name: 'Nueva tarea' }).click()
    await page.getByPlaceholder('Título de la tarea').fill('Tarea creada en E2E')
    await page.getByRole('button', { name: 'Crear tarea' }).click()

    await expect(page).toHaveURL(/\/projects\/10\/tasks\/102$/)
    await expect(page.getByRole('heading', { name: 'Tarea creada en E2E' })).toBeVisible()

    const createRequest = api.last('POST', '/projects/10/tasks')

    expect(createRequest?.body).toMatchObject({ title: 'Tarea creada en E2E' })
  })

  /* ---------------------------- 6. Filtrar tareas --------------------------- */

  test('filtra las tareas por estado', async ({ page }) => {
    const api = await mockApi(page)

    await page.goto('/projects/10/tasks')

    // El placeholder de Element Plus se superpone al input del `el-select`,
    // por eso se hace clic sobre el propio `el-select` que contiene el filtro.
    const statusSelect = page
      .locator('.task-filters .el-select')
      .filter({ has: page.getByRole('combobox', { name: 'Filtrar por estado' }) })

    await statusSelect.click()
    await page.getByRole('option', { name: 'Completada' }).click()
    await page.getByRole('button', { name: 'Aplicar' }).click()

    await expect(page.locator('.el-table__row', { hasText: 'Documentar la API' })).toHaveCount(1)
    await expect(page.locator('.el-table__row', { hasText: 'Implementar el login' })).toHaveCount(0)

    const listRequest = api.last('GET', '/projects/10/tasks')

    expect(listRequest?.query.status).toBe('done')
    expect(listRequest?.query.page).toBe('1')
  })

  /* --------------------------- 7. Consultar detalle ------------------------- */

  test('consulta el detalle de una tarea con sus comentarios', async ({ page }) => {
    await mockApi(page)

    await page.goto('/projects/10/tasks/100')

    await expect(page.getByRole('heading', { name: 'Implementar el login' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Detalles' })).toBeVisible()
    await expect(page.getByText('Primer comentario de la tarea')).toBeVisible()
    await expect(page.getByText('Ada Lovelace').first()).toBeVisible()
  })

  /* -------------------------- 8. Publicar comentario ------------------------ */

  test('publica un comentario y actualiza el listado', async ({ page }) => {
    const api = await mockApi(page)

    await page.goto('/projects/10/tasks/100')

    await page.locator('.task-comments__form textarea').fill('Comentario publicado desde E2E')
    await page.getByRole('button', { name: 'Publicar' }).click()

    await expect(page.getByText('Comentario publicado desde E2E')).toBeVisible()

    const commentRequest = api.last('POST', '/projects/10/tasks/100/comments')

    expect(commentRequest?.body).toEqual({ body: 'Comentario publicado desde E2E' })
  })

  /* ----------------------------- 9. Cerrar sesión --------------------------- */

  test('cierra la sesión y vuelve al inicio de sesión', async ({ page }) => {
    const api = await mockApi(page)

    await page.goto('/')

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()

    expect(api.last('POST', '/logout')).toBeDefined()
  })
})
