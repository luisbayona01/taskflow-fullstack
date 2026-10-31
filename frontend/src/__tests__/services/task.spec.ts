import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'

import { http, invalidateApiCache } from '@/services/api'
import { taskService } from '@/services/task'
import type { Task } from '@/types/api'

const originalAdapter = http.defaults.adapter

const task: Task = {
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
}

function respondWith(data: unknown, status = 200): AxiosAdapter {
  return (config: InternalAxiosRequestConfig) =>
    Promise.resolve({
      data,
      status,
      statusText: 'OK',
      headers: {},
      config,
    })
}

describe('services/task', () => {
  let captured: InternalAxiosRequestConfig | undefined

  beforeEach(() => {
    invalidateApiCache()
    captured = undefined
    http.defaults.adapter = (config) => {
      captured = config
      return respondWith({
        success: true,
        message: 'Tasks retrieved successfully.',
        data: {
          tasks: [task],
          pagination: {
            total: 1,
            per_page: 15,
            current_page: 1,
            last_page: 1,
            from: 1,
            to: 1,
          },
        },
      })(config)
    }
  })

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    invalidateApiCache()
  })

  it('lista las tareas del proyecto', async () => {
    const result = await taskService.list(10)

    expect(captured?.method).toBe('get')
    expect(captured?.url).toBe('/projects/10/tasks')
    expect(result.tasks).toHaveLength(1)
    expect(result.pagination.total).toBe(1)
  })

  it('envía los filtros reales del backend como query params', async () => {
    await taskService.list(10, {
      status: 'done',
      priority: 'high',
      assigned_to: 7,
      due_date_from: '2026-11-01',
      due_date_to: '2026-12-31',
      search: 'login',
      sort_by: 'title',
      sort_direction: 'asc',
      per_page: 30,
      page: 2,
    })

    expect(captured?.url).toBe('/projects/10/tasks')
    expect(captured?.params).toEqual({
      status: 'done',
      priority: 'high',
      assigned_to: 7,
      due_date_from: '2026-11-01',
      due_date_to: '2026-12-31',
      search: 'login',
      sort_by: 'title',
      sort_direction: 'asc',
      per_page: 30,
      page: 2,
    })
  })

  it('crea una tarea con POST', async () => {
    http.defaults.adapter = (config) => {
      captured = config
      return respondWith(
        { success: true, message: 'Task created successfully.', data: { task } },
        201,
      )(config)
    }

    const created = await taskService.create(10, { title: 'Implementar el login' })

    expect(captured?.method).toBe('post')
    expect(captured?.url).toBe('/projects/10/tasks')
    expect(JSON.parse(String(captured?.data))).toEqual({ title: 'Implementar el login' })
    expect(created.id).toBe(100)
  })

  it('actualiza el estado con PATCH', async () => {
    http.defaults.adapter = (config) => {
      captured = config
      return respondWith({
        success: true,
        message: 'Task updated successfully.',
        data: { task: { ...task, status: 'done' } },
      })(config)
    }

    const updated = await taskService.updateStatus(10, 100, 'done')

    expect(captured?.method).toBe('patch')
    expect(captured?.url).toBe('/projects/10/tasks/100')
    expect(JSON.parse(String(captured?.data))).toEqual({ status: 'done' })
    expect(updated.status).toBe('done')
  })

  it('elimina una tarea con DELETE', async () => {
    http.defaults.adapter = (config) => {
      captured = config
      return respondWith('', 204)(config)
    }

    await taskService.remove(10, 100)

    expect(captured?.method).toBe('delete')
    expect(captured?.url).toBe('/projects/10/tasks/100')
  })

  it('no repite la misma consulta GET mientras la caché está vigente', async () => {
    const adapter = vi.fn(
      respondWith({
        success: true,
        message: 'Tasks retrieved successfully.',
        data: { tasks: [], pagination: { total: 0 } },
      }),
    )
    http.defaults.adapter = adapter

    await taskService.list(10)
    await taskService.list(10)

    expect(adapter).toHaveBeenCalledTimes(1)
  })
})
