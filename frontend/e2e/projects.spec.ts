import { test, expect } from '@playwright/test'

import { MOCK_PROJECT, MOCK_USER, mockApi } from './helpers/mock-api'
import type { Project } from '@/types/api'

const foreignProject: Project = {
  id: 11,
  name: 'Proyecto ajeno',
  description: 'No soy el propietario',
  owner_id: 2,
  owner: { ...MOCK_USER, id: 2, name: 'Grace Hopper', email: 'grace@taskflow.test' },
  members: [],
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

test.beforeEach(async ({ page }) => {
  await mockApi(page, { projects: [MOCK_PROJECT, foreignProject] })
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
