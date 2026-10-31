import { test, expect, type Page } from '@playwright/test'

const user = {
  id: 1,
  name: 'Ada Lovelace',
  email: 'ada@taskflow.test',
  email_verified_at: null,
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

const ownerProject = {
  id: 10,
  name: 'TaskFlow',
  description: 'Gestión de proyectos',
  owner_id: user.id,
  owner: user,
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

const foreignProject = {
  id: 11,
  name: 'Proyecto ajeno',
  description: 'No soy el propietario',
  owner_id: 2,
  owner: { ...user, id: 2, name: 'Grace Hopper', email: 'grace@taskflow.test' },
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

const stats = {
  total_tasks: 3,
  pending: 1,
  in_progress: 1,
  done: 1,
  overdue: 0,
  progress_percentage: 33,
}

/**
 * Intercepta la API del backend para poder probar el módulo de proyectos
 * sin depender de una base de datos.
 */
async function mockApi(page: Page, options: { projects?: unknown[] } = {}): Promise<void> {
  const projects = options.projects ?? [ownerProject, foreignProject]

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api', '')
    const method = request.method()

    if (path === '/me' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Authenticated user.', data: { user } }),
      })
      return
    }

    if (path === '/projects' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Projects retrieved successfully.',
          data: { projects },
        }),
      })
      return
    }

    if (path === '/projects' && method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Project created successfully.',
          data: { project: { ...ownerProject, id: 12, name: 'Proyecto creado' } },
        }),
      })
      return
    }

    if (/^\/projects\/\d+$/.test(path) && method === 'DELETE') {
      await route.fulfill({ status: 204, body: '' })
      return
    }

    if (/^\/projects\/\d+\/stats$/.test(path) && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: stats }),
      })
      return
    }

    if (/^\/projects\/\d+\/tasks$/.test(path) && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Tasks retrieved successfully.',
          data: {
            tasks: [
              {
                id: 100,
                title: 'Implementar el login',
                description: null,
                status: 'pending',
                priority: 'high',
                due_date: null,
                project_id: 10,
                assigned_to: null,
                created_at: '2026-10-30T18:00:00.000000Z',
                updated_at: '2026-10-30T18:00:00.000000Z',
              },
            ],
            pagination: {
              total: 1,
              per_page: 15,
              current_page: 1,
              last_page: 1,
              from: 1,
              to: 1,
            },
          },
        }),
      })
      return
    }

    if (/^\/projects\/\d+$/.test(path) && method === 'GET') {
      const isCreated = path === '/projects/12'

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Project retrieved successfully.',
          data: {
            project: isCreated
              ? { ...ownerProject, id: 12, name: 'Proyecto creado', members: [user] }
              : { ...ownerProject, members: [user] },
          },
        }),
      })
      return
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        message: 'The requested endpoint or resource was not found.',
        errors: null,
      }),
    })
  })

  await page.addInitScript(() => {
    window.localStorage.setItem('taskflow.token', 'fake-token')
  })
}

test.beforeEach(async ({ page }) => {
  await mockApi(page)
})

test('muestra el listado de proyectos con su propietario y su rol', async ({ page }) => {
  await page.goto('/projects')

  await expect(page.getByRole('heading', { name: 'Proyectos' })).toBeVisible()
  await expect(page.getByText('TaskFlow', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Proyecto ajeno', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Ada Lovelace').first()).toBeVisible()
  await expect(page.getByText('Propietario').first()).toBeVisible()
})

test('filtra los proyectos con el buscador', async ({ page }) => {
  await page.goto('/projects')

  await page.getByPlaceholder('Buscar por nombre o descripción').fill('ajeno')

  await expect(page.locator('.el-table__row', { hasText: 'Proyecto ajeno' })).toHaveCount(1)
  await expect(page.locator('.el-table__row', { hasText: 'TaskFlow' })).toHaveCount(0)
})

test('crea un proyecto y redirige al detalle', async ({ page }) => {
  await page.goto('/projects')

  await page.getByRole('button', { name: 'Nuevo proyecto' }).first().click()
  await page.getByPlaceholder('Nombre del proyecto').fill('Proyecto creado')
  await page.getByRole('button', { name: 'Crear proyecto' }).click()

  await expect(page).toHaveURL(/\/projects\/12$/)
  await expect(page.getByRole('heading', { name: 'Proyecto creado' })).toBeVisible()
})
test('elimina un proyecto con confirmación y vuelve al listado', async ({ page }) => {
  await page.goto('/projects')

  const row = page.locator('.el-table__row', { hasText: 'TaskFlow' })
  await row.getByRole('button', { name: 'Eliminar' }).click()

  const confirm = page.locator('.el-message-box')
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: 'Eliminar' }).click()

  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.locator('.el-table__row', { hasText: 'TaskFlow' })).toHaveCount(0)
  await expect(page.locator('.el-table__row', { hasText: 'Proyecto ajeno' })).toHaveCount(1)
})

test('oculta las acciones de administración en proyectos de otro usuario', async ({ page }) => {
  await page.goto('/projects')

  const ownRow = page.locator('.el-table__row', { hasText: 'TaskFlow' })
  const foreignRow = page.locator('.el-table__row', { hasText: 'Proyecto ajeno' })

  await expect(ownRow.getByRole('button', { name: 'Editar' })).toBeVisible()
  await expect(foreignRow.getByRole('button', { name: 'Editar' })).toHaveCount(0)
  await expect(foreignRow.getByRole('button', { name: 'Eliminar' })).toHaveCount(0)
})

test('muestra el detalle con miembros, estadísticas y tareas', async ({ page }) => {
  await page.goto('/projects/10')

  await expect(page.getByRole('heading', { name: 'TaskFlow' })).toBeVisible()
  await expect(page.getByText('Miembros (1)')).toBeVisible()
  await expect(page.getByText('Implementar el login')).toBeVisible()
  await expect(page.getByText('Tareas totales')).toBeVisible()
})
