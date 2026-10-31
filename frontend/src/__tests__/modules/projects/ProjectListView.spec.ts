import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import ElementPlus from 'element-plus'

import ProjectListView from '@/modules/projects/ProjectListView.vue'
import { projectService } from '@/services/project'
import { taskService } from '@/services/task'
import { useAuthStore } from '@/stores/auth'
import { ApiRequestError } from '@/services/api'
import type { Project, ProjectStats, Task, User } from '@/types/api'

vi.mock('@/services/project', () => ({
  projectService: {
    list: vi.fn<() => Promise<Project[]>>(),
    get: vi.fn<(projectId: number) => Promise<Project>>(),
    create: vi.fn<(payload: { name: string; description?: string | null }) => Promise<Project>>(),
    update: vi.fn<
      (
        projectId: number,
        payload: { name: string; description?: string | null },
      ) => Promise<Project>
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

const currentUser: User = {
  id: 1,
  name: 'Ada Lovelace',
  email: 'ada@taskflow.test',
  email_verified_at: null,
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

const otherUser: User = {
  ...currentUser,
  id: 2,
  name: 'Grace Hopper',
  email: 'grace@taskflow.test',
}

function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 10,
    name: 'TaskFlow',
    description: 'Gestión de proyectos',
    owner_id: currentUser.id,
    owner: currentUser,
    created_at: '2026-10-30T18:00:00.000000Z',
    updated_at: '2026-10-30T18:00:00.000000Z',
    ...overrides,
  }
}

function buildRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/projects', name: 'projects', component: ProjectListView },
      { path: '/projects/:projectId', name: 'project-detail', component: { template: '<div />' } },
    ],
  })
}

async function mountListView() {
  const pinia = createPinia()
  setActivePinia(pinia)

  useAuthStore().$patch({ user: currentUser, token: 'fake-token' })

  const router = buildRouter()
  await router.push('/projects')
  await router.isReady()

  const wrapper = mount(ProjectListView, {
    global: {
      plugins: [pinia, router, ElementPlus],
    },
  })

  await flushPromises()

  return wrapper
}

describe('modules/projects/ProjectListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(projectService.stats).mockResolvedValue({
      total_tasks: 3,
      pending: 1,
      in_progress: 1,
      done: 1,
      overdue: 0,
      progress_percentage: 33,
    })
  })

  it('muestra los proyectos del usuario', async () => {
    vi.mocked(projectService.list).mockResolvedValue([
      buildProject(),
      buildProject({ id: 11, name: 'Otro proyecto', owner_id: otherUser.id, owner: otherUser }),
    ])

    const wrapper = await mountListView()

    expect(wrapper.text()).toContain('TaskFlow')
    expect(wrapper.text()).toContain('Otro proyecto')
    expect(projectService.list).toHaveBeenCalledTimes(1)
  })

  it('muestra el estado vacío cuando no hay proyectos', async () => {
    vi.mocked(projectService.list).mockResolvedValue([])

    const wrapper = await mountListView()

    expect(wrapper.text()).toContain('Todavía no tienes proyectos')
  })

  it('muestra el mensaje de error cuando la API responde con un 403', async () => {
    vi.mocked(projectService.list).mockRejectedValue(
      new ApiRequestError('No tienes permisos para realizar esta acción.', 403),
    )

    const wrapper = await mountListView()

    expect(wrapper.text()).toContain('No tienes permisos')
  })

  it('filtra los proyectos con el buscador', async () => {
    vi.mocked(projectService.list).mockResolvedValue([
      buildProject({ name: 'TaskFlow' }),
      buildProject({ id: 11, name: 'Informe mensual', description: 'Resumen del mes' }),
    ])

    const wrapper = await mountListView()

    await wrapper.find('input').setValue('informe')
    await flushPromises()

    expect(wrapper.text()).not.toContain('TaskFlow')
    expect(wrapper.text()).toContain('Informe mensual')
  })

  it('oculta las acciones de administración en los proyectos de otro usuario', async () => {
    vi.mocked(projectService.list).mockResolvedValue([
      buildProject({ name: 'Mi proyecto' }),
      buildProject({ id: 11, name: 'Proyecto ajeno', owner_id: otherUser.id, owner: otherUser }),
    ])

    const wrapper = await mountListView()
    const rows = wrapper.findAll('.el-table__row')

    expect(rows).toHaveLength(2)

    const ownActions = rows[0]!.findAll('button').map((button) => button.text())
    const otherActions = rows[1]!.findAll('button').map((button) => button.text())

    expect(ownActions).toContain('Editar')
    expect(ownActions).toContain('Eliminar')
    expect(otherActions).not.toContain('Editar')
    expect(otherActions).not.toContain('Eliminar')
    expect(otherActions).toContain('Ver')
  })
})
