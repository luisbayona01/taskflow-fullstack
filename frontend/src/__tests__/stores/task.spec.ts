import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { taskService } from '@/services/task'
import { useTaskStore } from '@/stores/task'
import { ApiRequestError } from '@/services/api'
import type { Task, TaskPagination } from '@/types/api'

vi.mock('@/services/task', () => ({
  taskService: {
    list: vi.fn<
      (
        projectId: number,
        filters?: Record<string, unknown>,
      ) => Promise<{
        tasks: Task[]
        pagination: TaskPagination
      }>
    >(),
    get: vi.fn<(projectId: number, taskId: number) => Promise<Task>>(),
    create: vi.fn<(projectId: number, payload: { title: string }) => Promise<Task>>(),
    update: vi.fn<(projectId: number, taskId: number, payload: object) => Promise<Task>>(),
    updateStatus: vi.fn<(projectId: number, taskId: number, status: string) => Promise<Task>>(),
    remove: vi.fn<(projectId: number, taskId: number) => Promise<void>>(),
  },
}))

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

const pagination: TaskPagination = {
  total: 1,
  per_page: 15,
  current_page: 1,
  last_page: 1,
  from: 1,
  to: 1,
}

describe('stores/task', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('lista las tareas con su paginación', async () => {
    vi.mocked(taskService.list).mockResolvedValue({ tasks: [task], pagination })
    const store = useTaskStore()

    await store.fetchTasks(10)

    expect(taskService.list).toHaveBeenCalledWith(10, {})
    expect(store.tasks).toHaveLength(1)
    expect(store.pagination?.total).toBe(1)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('conserva los filtros aplicados y los envía al servicio', async () => {
    vi.mocked(taskService.list).mockResolvedValue({ tasks: [], pagination })
    const store = useTaskStore()

    await store.fetchTasks(10, { status: 'done', search: 'login', page: 2 })

    expect(taskService.list).toHaveBeenCalledWith(10, {
      status: 'done',
      search: 'login',
      page: 2,
    })
    expect(store.filters).toEqual({ status: 'done', search: 'login', page: 2 })
  })

  it('expone el error y vacía el listado cuando la API falla', async () => {
    vi.mocked(taskService.list).mockRejectedValue(
      new ApiRequestError('No tienes permisos para realizar esta acción.', 403),
    )
    const store = useTaskStore()

    await store.fetchTasks(10)

    expect(store.tasks).toEqual([])
    expect(store.pagination).toBeNull()
    expect(store.error).toContain('permisos')
  })

  it('crea una tarea y devuelve la tarea creada', async () => {
    vi.mocked(taskService.create).mockResolvedValue(task)
    const store = useTaskStore()

    const created = await store.createTask(10, { title: 'Implementar el login' })

    expect(taskService.create).toHaveBeenCalledWith(10, { title: 'Implementar el login' })
    expect(created.id).toBe(100)
    expect(store.saving).toBe(false)
  })

  it('propaga el error de validación al crear una tarea', async () => {
    vi.mocked(taskService.create).mockRejectedValue(
      new ApiRequestError('Los datos enviados no son válidos.', 422, {
        title: ['The title field is required.'],
      }),
    )

    const store = useTaskStore()
    const error = await store.createTask(10, { title: '' }).catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).fieldErrors.title).toEqual(['The title field is required.'])
    expect(store.saving).toBe(false)
  })

  it('actualiza el estado de la tarea en el listado', async () => {
    vi.mocked(taskService.list).mockResolvedValue({ tasks: [task], pagination })
    vi.mocked(taskService.updateStatus).mockResolvedValue({ ...task, status: 'done' })

    const store = useTaskStore()
    await store.fetchTasks(10)

    const updated = await store.updateStatus(10, 100, 'done')

    expect(taskService.updateStatus).toHaveBeenCalledWith(10, 100, 'done')
    expect(updated.status).toBe('done')
    expect(store.tasks[0]?.status).toBe('done')
    expect(store.saving).toBe(false)
  })

  it('elimina una tarea y la quita del listado', async () => {
    vi.mocked(taskService.list).mockResolvedValue({ tasks: [task], pagination })
    vi.mocked(taskService.remove).mockResolvedValue(undefined)

    const store = useTaskStore()
    await store.fetchTasks(10)

    await store.removeTask(10, 100)

    expect(taskService.remove).toHaveBeenCalledWith(10, 100)
    expect(store.tasks).toHaveLength(0)
    expect(store.saving).toBe(false)
  })

  it('propaga el error al eliminar una tarea que no existe', async () => {
    vi.mocked(taskService.remove).mockRejectedValue(
      new ApiRequestError('No se ha encontrado el recurso solicitado.', 404),
    )

    const store = useTaskStore()
    const error = await store.removeTask(10, 999).catch((reason: unknown) => reason)

    expect((error as ApiRequestError).status).toBe(404)
    expect(store.saving).toBe(false)
  })

  it('reinicia el estado del store', async () => {
    vi.mocked(taskService.list).mockResolvedValue({ tasks: [task], pagination })
    const store = useTaskStore()
    await store.fetchTasks(10, { status: 'pending' })

    store.reset()

    expect(store.tasks).toEqual([])
    expect(store.pagination).toBeNull()
    expect(store.filters).toEqual({})
    expect(store.error).toBeNull()
  })
})
