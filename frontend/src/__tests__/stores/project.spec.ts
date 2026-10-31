import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { projectService } from '@/services/project'
import { taskService } from '@/services/task'
import { useAuthStore } from '@/stores/auth'
import { useProjectStore } from '@/stores/project'
import { ApiRequestError } from '@/services/api'
import type { Project, ProjectStats, Task, User } from '@/types/api'

vi.mock('@/services/project', () => ({
  projectService: {
    list: vi.fn<() => Promise<Project[]>>(),
    get: vi.fn<(projectId: number) => Promise<Project>>(),
    create: vi.fn<(payload: { name: string; description?: string | null }) => Promise<Project>>(),
    update: vi.fn<
      (projectId: number, payload: { name: string; description?: string | null }) => Promise<Project>
    >(),
    remove: vi.fn<(projectId: number) => Promise<void>>(),
    stats: vi.fn<(projectId: number) => Promise<ProjectStats>>(),
  },
}))

vi.mock('@/services/task', () => ({
  taskService: {
    list: vi.fn<(projectId: number) => Promise<{ tasks: Task[]; pagination: unknown }>>(),
    get: vi.fn<() => Promise<Task>>(),
    create: vi.fn<() => Promise<Task>>(),
    update: vi.fn<() => Promise<Task>>(),
    updateStatus: vi.fn<() => Promise<Task>>(),
    remove: vi.fn<() => Promise<void>>(),
  },
}))

const owner: User = {
  id: 1,
  name: 'Ada Lovelace',
  email: 'ada@taskflow.test',
  email_verified_at: null,
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 10,
    name: 'TaskFlow',
    description: 'Gestión de proyectos',
    owner_id: owner.id,
    owner,
    created_at: '2026-10-30T18:00:00.000000Z',
    updated_at: '2026-10-30T18:00:00.000000Z',
    ...overrides,
  }
}

const stats: ProjectStats = {
  total_tasks: 4,
  pending: 1,
  in_progress: 1,
  done: 2,
  overdue: 0,
  progress_percentage: 50,
}

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

describe('stores/project', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    const authStore = useAuthStore()
    authStore.$patch({ user: owner, token: 'fake-token' })
  })

  it('carga el listado de proyectos', async () => {
    vi.mocked(projectService.list).mockResolvedValue([buildProject()])
    const store = useProjectStore()

    await store.fetchProjects()

    expect(projectService.list).toHaveBeenCalledTimes(1)
    expect(store.projects).toHaveLength(1)
    expect(store.projects[0]?.name).toBe('TaskFlow')
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('deja el listado vacío cuando la API responde con un error', async () => {
    vi.mocked(projectService.list).mockRejectedValue(
      new ApiRequestError('No tienes permisos para realizar esta acción.', 403),
    )
    const store = useProjectStore()

    await store.fetchProjects()

    expect(store.projects).toEqual([])
    expect(store.error).toContain('permisos')
    expect(store.isEmpty).toBe(true)
  })

  it('carga las estadísticas de los proyectos indicados', async () => {
    vi.mocked(projectService.stats).mockResolvedValue(stats)
    const store = useProjectStore()

    await store.fetchStats([10, 11])

    expect(projectService.stats).toHaveBeenCalledTimes(2)
    expect(store.statsByProject[10]).toEqual(stats)
  })

  it('no falla la carga de estadísticas si una petición falla', async () => {
    vi.mocked(projectService.stats).mockRejectedValueOnce(new Error('boom'))
    vi.mocked(projectService.stats).mockResolvedValueOnce(stats)
    const store = useProjectStore()

    await store.fetchStats([10, 11])

    expect(store.statsByProject[10]).toBeUndefined()
    expect(store.statsByProject[11]).toEqual(stats)
  })

  it('carga el detalle del proyecto con sus estadísticas y tareas', async () => {
    vi.mocked(projectService.get).mockResolvedValue(
      buildProject({ members: [owner, { ...owner, id: 2, name: 'Grace', email: 'grace@test.dev' }] }),
    )
    vi.mocked(projectService.stats).mockResolvedValue(stats)
    vi.mocked(taskService.list).mockResolvedValue({ tasks: [task], pagination: {} })

    const store = useProjectStore()
    await store.fetchProject(10)

    expect(store.current?.name).toBe('TaskFlow')
    expect(store.current?.members).toHaveLength(2)
    expect(store.currentStats).toEqual(stats)
    expect(store.currentTasks).toHaveLength(1)
    expect(store.detailError).toBeNull()
  })

  it('expone el error 404 al cargar un proyecto inexistente', async () => {
    vi.mocked(projectService.get).mockRejectedValue(
      new ApiRequestError('No se ha encontrado el recurso solicitado.', 404),
    )
    const store = useProjectStore()

    await store.fetchProject(999)

    expect(store.current).toBeNull()
    expect(store.detailError).toContain('No se ha encontrado')
  })

  it('crea un proyecto y lo añade al listado', async () => {
    vi.mocked(projectService.create).mockResolvedValue(buildProject({ id: 11, name: 'Nuevo' }))
    const store = useProjectStore()

    const created = await store.createProject({ name: 'Nuevo', description: null })

    expect(projectService.create).toHaveBeenCalledWith({ name: 'Nuevo', description: null })
    expect(created.id).toBe(11)
    expect(store.projects[0]?.id).toBe(11)
    expect(store.saving).toBe(false)
  })

  it('propaga los errores de validación del backend al crear', async () => {
    vi.mocked(projectService.create).mockRejectedValue(
      new ApiRequestError('Los datos enviados no son válidos.', 422, {
        name: ['The name field is required.'],
      }),
    )
    const store = useProjectStore()

    const error = await store.createProject({ name: '' }).catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).fieldErrors.name).toEqual(['The name field is required.'])
    expect(store.projects).toHaveLength(0)
    expect(store.saving).toBe(false)
  })

  it('actualiza el proyecto y sincroniza el listado', async () => {
    vi.mocked(projectService.list).mockResolvedValue([buildProject()])
    vi.mocked(projectService.update).mockResolvedValue(
      buildProject({ name: 'Renombrado', description: null }),
    )

    const store = useProjectStore()
    await store.fetchProjects()

    await store.updateProject(10, { name: 'Renombrado', description: null })

    expect(projectService.update).toHaveBeenCalledWith(10, {
      name: 'Renombrado',
      description: null,
    })
    expect(store.projects[0]?.name).toBe('Renombrado')
    expect(store.current?.name).toBe('Renombrado')
  })

  it('elimina el proyecto y lo quita del listado', async () => {
    vi.mocked(projectService.list).mockResolvedValue([buildProject()])
    vi.mocked(projectService.remove).mockResolvedValue(undefined)

    const store = useProjectStore()
    await store.fetchProjects()

    await store.deleteProject(10)

    expect(projectService.remove).toHaveBeenCalledWith(10)
    expect(store.projects).toHaveLength(0)
    expect(store.deleting).toBe(false)
  })

  it('resuelve el rol del usuario actual según el propietario', async () => {
    vi.mocked(projectService.list).mockResolvedValue([
      buildProject({ id: 10, owner_id: owner.id }),
      buildProject({ id: 11, owner_id: 99 }),
    ])

    const store = useProjectStore()
    await store.fetchProjects()

    expect(store.roleFor(store.projects[0]!)).toBe('owner')
    expect(store.isOwner(store.projects[0]!)).toBe(true)
    expect(store.roleFor(store.projects[1]!)).toBe('member')
    expect(store.isOwner(store.projects[1]!)).toBe(false)
  })
})
