import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import ElementPlus from 'element-plus'

import TaskFilters from '@/components/tasks/TaskFilters.vue'
import TaskListView from '@/modules/tasks/TaskListView.vue'
import { memberService } from '@/services/member'
import { projectService } from '@/services/project'
import { taskService } from '@/services/task'
import { ApiRequestError } from '@/services/api'
import type { Project, ProjectMember, ProjectStats, Task } from '@/types/api'

vi.mock('@/services/task', () => ({
  taskService: {
    list: vi.fn<
      (
        projectId: number,
        filters?: Record<string, unknown>,
      ) => Promise<{
        tasks: Task[]
        pagination: {
          total: number
          per_page: number
          current_page: number
          last_page: number
          from: number | null
          to: number | null
        }
      }>
    >(),
    get: vi.fn<(projectId: number, taskId: number) => Promise<Task>>(),
    create: vi.fn<(projectId: number, payload: { title: string }) => Promise<Task>>(),
    update: vi.fn<(projectId: number, taskId: number, payload: object) => Promise<Task>>(),
    updateStatus: vi.fn<(projectId: number, taskId: number, status: string) => Promise<Task>>(),
    remove: vi.fn<(projectId: number, taskId: number) => Promise<void>>(),
  },
}))

vi.mock('@/services/member', () => ({
  memberService: {
    list: vi.fn<(projectId: number) => Promise<ProjectMember[]>>(),
    add: vi.fn<(projectId: number, userId: number) => Promise<unknown>>(),
    remove: vi.fn<(projectId: number, userId: number) => Promise<void>>(),
  },
}))

vi.mock('@/services/project', () => ({
  projectService: {
    list: vi.fn<() => Promise<Project[]>>(),
    get: vi.fn<(projectId: number) => Promise<Project>>(),
    create: vi.fn<(payload: { name: string }) => Promise<Project>>(),
    update: vi.fn<(projectId: number, payload: object) => Promise<Project>>(),
    remove: vi.fn<(projectId: number) => Promise<void>>(),
    stats: vi.fn<(projectId: number) => Promise<ProjectStats>>(),
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

const project: Project = {
  id: 10,
  name: 'TaskFlow',
  description: 'Gestión de proyectos',
  owner_id: 1,
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

const pagination = {
  total: 1,
  per_page: 15,
  current_page: 1,
  last_page: 1,
  from: 1,
  to: 1,
}

function buildRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/projects/:projectId/tasks', name: 'task-list', component: TaskListView },
      { path: '/projects/:projectId', name: 'project-detail', component: { template: '<div />' } },
      {
        path: '/projects/:projectId/tasks/:taskId',
        name: 'task-detail',
        component: { template: '<div />' },
      },
    ],
  })
}

async function mountListView() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = buildRouter()
  await router.push('/projects/10/tasks')
  await router.isReady()

  const wrapper = mount(TaskListView, {
    global: { plugins: [pinia, router, ElementPlus] },
  })

  await flushPromises()

  return wrapper
}

describe('modules/tasks/TaskListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(taskService.list).mockResolvedValue({ tasks: [task], pagination })
    vi.mocked(memberService.list).mockResolvedValue([])
    vi.mocked(projectService.get).mockResolvedValue(project)
  })

  it('lista las tareas del proyecto', async () => {
    const wrapper = await mountListView()

    expect(taskService.list).toHaveBeenCalledWith(10, {})
    expect(wrapper.text()).toContain('Implementar el login')
    expect(wrapper.text()).toContain('Pendiente')
    expect(wrapper.text()).toContain('1 tarea(s) en total.')
  })

  it('muestra el estado vacío cuando no hay tareas', async () => {
    vi.mocked(taskService.list).mockResolvedValue({ tasks: [], pagination })

    const wrapper = await mountListView()

    expect(wrapper.text()).toContain('No hay tareas que coincidan con los filtros aplicados.')
  })

  it('envía los filtros aplicados al backend', async () => {
    const wrapper = await mountListView()

    wrapper.findComponent(TaskFilters).vm.$emit('apply', { status: 'done' })
    await flushPromises()

    expect(taskService.list).toHaveBeenLastCalledWith(10, { status: 'done', page: 1 })
  })

  it('muestra el error devuelto por la API', async () => {
    vi.mocked(taskService.list).mockRejectedValue(
      new ApiRequestError('No tienes permisos para realizar esta acción.', 403),
    )

    const wrapper = await mountListView()

    expect(wrapper.text()).toContain('No tienes permisos')
  })
})
