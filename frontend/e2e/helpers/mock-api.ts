/**
 * Doble de pruebas (test double) de la API REST de TaskFlow para Playwright.
 *
 * Reproduce las formas reales de respuesta del backend Laravel verificadas en
 * `backend/routes/api.php` y `backend/documentacion/api-docs.json`:
 *
 * - La mayoría de endpoints devuelven `{ success, message, data }`.
 * - `GET /projects/{id}/stats` devuelve únicamente `{ data }`.
 * - Los comentarios se serializan con `JsonResource`: la colección devuelve
 *   `{ data, links, meta }` y el alta `{ data }`.
 * - La paginación de tareas es un objeto propio
 *   (`total, per_page, current_page, last_page, from, to`).
 *
 * El doble mantiene estado (proyectos, tareas y comentarios) para que los
 * flujos E2E puedan crear recursos y comprobar que el listado se actualiza.
 */

import type { Page } from '@playwright/test'

import type {
  Comment,
  Project,
  ProjectMember,
  ProjectStats,
  Task,
  TaskPagination,
  User,
} from '@/types/api'

export interface RecordedRequest {
  method: string
  path: string
  query: Record<string, string>
  body: unknown
}

export interface MockApiOptions {
  /** Simula una sesión ya iniciada (token en `localStorage`). */
  authenticated?: boolean
  projects?: Project[]
  tasks?: Task[]
  comments?: Comment[]
  members?: ProjectMember[]
}

export interface MockApi {
  /** Todas las peticiones registradas, en orden. */
  requests: RecordedRequest[]
  /** Última petición registrada que coincide con método y ruta. */
  last(method: string, path: string): RecordedRequest | undefined
}

export const MOCK_USER: User = {
  id: 1,
  name: 'Ada Lovelace',
  email: 'ada@taskflow.test',
  email_verified_at: null,
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

export const MOCK_PROJECT: Project = {
  id: 10,
  name: 'TaskFlow',
  description: 'Gestión de proyectos',
  owner_id: MOCK_USER.id,
  owner: MOCK_USER,
  members: [MOCK_USER],
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

export const MOCK_PENDING_TASK: Task = {
  id: 100,
  title: 'Implementar el login',
  description: 'Pantalla de acceso con validación',
  status: 'pending',
  priority: 'high',
  due_date: '2026-11-30',
  project_id: MOCK_PROJECT.id,
  assigned_to: MOCK_USER.id,
  assigned_user: MOCK_USER,
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

export const MOCK_DONE_TASK: Task = {
  ...MOCK_PENDING_TASK,
  id: 101,
  title: 'Documentar la API',
  description: null,
  status: 'done',
  priority: 'medium',
  due_date: null,
}

export const MOCK_COMMENT: Comment = {
  id: 1,
  body: 'Primer comentario de la tarea',
  created_at: '2026-10-30 18:00:00',
  author: { id: MOCK_USER.id, name: MOCK_USER.name, email: MOCK_USER.email },
}

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'Authorization,Content-Type,Accept',
}

/** Opciones de `route.fulfill()` admitidas por el doble de la API. */
interface FulfillOptions {
  status?: number
  contentType?: string
  headers?: Record<string, string>
  body?: string
}

function json(body: unknown, status = 200): FulfillOptions {
  return {
    status,
    contentType: 'application/json',
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  }
}

function success(data: unknown, message: string, status = 200): FulfillOptions {
  return json({ success: true, message, data }, status)
}

function notFound(): FulfillOptions {
  return json(
    {
      success: false,
      message: 'The requested endpoint or resource was not found.',
      errors: null,
    },
    404,
  )
}

function computeStats(tasks: Task[]): ProjectStats {
  const pending = tasks.filter((task) => task.status === 'pending').length
  const inProgress = tasks.filter((task) => task.status === 'in_progress').length
  const done = tasks.filter((task) => task.status === 'done').length

  return {
    total_tasks: tasks.length,
    pending,
    in_progress: inProgress,
    done,
    overdue: 0,
    progress_percentage: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
  }
}

/**
 * Aplica los filtros reales de `GET /api/projects/{project}/tasks` sobre el
 * conjunto de tareas del doble.
 */
function filterTasks(tasks: Task[], query: Record<string, string>): Task[] {
  let result = [...tasks]

  const search = query.search?.toLowerCase()
  if (search) {
    result = result.filter((task) => task.title.toLowerCase().includes(search))
  }

  if (query.status) {
    result = result.filter((task) => task.status === query.status)
  }

  if (query.priority) {
    result = result.filter((task) => task.priority === query.priority)
  }

  if (query.assigned_to) {
    result = result.filter((task) => String(task.assigned_to) === query.assigned_to)
  }

  if (query.due_date_from) {
    result = result.filter((task) => (task.due_date ?? '') >= query.due_date_from)
  }

  if (query.due_date_to) {
    result = result.filter((task) => (task.due_date ?? '') <= query.due_date_to)
  }

  const sortBy = query.sort_by ?? 'created_at'
  const direction = query.sort_direction === 'asc' ? 1 : -1

  result.sort((a, b) => {
    const left = String(a[sortBy as keyof Task] ?? '')
    const right = String(b[sortBy as keyof Task] ?? '')

    return left.localeCompare(right) * direction
  })

  return result
}

function paginate(
  tasks: Task[],
  query: Record<string, string>,
): {
  tasks: Task[]
  pagination: TaskPagination
} {
  const perPage = Number.parseInt(query.per_page ?? '15', 10) || 15
  const currentPage = Number.parseInt(query.page ?? '1', 10) || 1
  const total = tasks.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  const start = (currentPage - 1) * perPage
  const visible = tasks.slice(start, start + perPage)

  return {
    tasks: visible,
    pagination: {
      total,
      per_page: perPage,
      current_page: currentPage,
      last_page: lastPage,
      from: visible.length > 0 ? start + 1 : null,
      to: visible.length > 0 ? start + visible.length : null,
    },
  }
}

function parseBody(raw: string | null): unknown {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

/**
 * Instala el doble de la API en la página y devuelve la grabadora de
 * peticiones para poder verificar URLs, parámetros y payloads.
 */
export async function mockApi(page: Page, options: MockApiOptions = {}): Promise<MockApi> {
  const authenticated = options.authenticated ?? true
  const projects = [...(options.projects ?? [MOCK_PROJECT])]
  const tasks = [...(options.tasks ?? [MOCK_PENDING_TASK, MOCK_DONE_TASK])]
  const comments = [...(options.comments ?? [MOCK_COMMENT])]
  const members = [...(options.members ?? [MOCK_USER])]
  const requests: RecordedRequest[] = []

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')

    // Peticiones de preflight CORS.
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' })
      return
    }

    const query: Record<string, string> = {}
    url.searchParams.forEach((value, key) => {
      query[key] = value
    })

    const body = parseBody(request.postData())

    requests.push({ method, path, query, body })

    /* ------------------------------ Autenticación ------------------------------ */

    if (path === '/login' && method === 'POST') {
      await route.fulfill(
        success(
          { user: MOCK_USER, token: 'fake-token', token_type: 'Bearer' },
          'Login successful.',
        ),
      )
      return
    }

    if (path === '/register' && method === 'POST') {
      await route.fulfill(
        success(
          { user: MOCK_USER, token: 'fake-token', token_type: 'Bearer' },
          'Registration successful.',
          201,
        ),
      )
      return
    }

    if (path === '/logout' && method === 'POST') {
      await route.fulfill(success(null, 'Logged out successfully.'))
      return
    }

    if (path === '/me' && method === 'GET') {
      await route.fulfill(success({ user: MOCK_USER }, 'Authenticated user retrieved.'))
      return
    }

    /* -------------------------------- Proyectos ------------------------------- */

    if (path === '/projects' && method === 'GET') {
      await route.fulfill(success({ projects }, 'Projects retrieved successfully.'))
      return
    }

    if (path === '/projects' && method === 'POST') {
      const payload = (body ?? {}) as { name?: string; description?: string | null }
      const created: Project = {
        ...MOCK_PROJECT,
        id: 12,
        name: payload.name ?? 'Proyecto sin nombre',
        description: payload.description ?? null,
      }
      projects.push(created)

      await route.fulfill(success({ project: created }, 'Project created successfully.', 201))
      return
    }

    const projectMatch = /^\/projects\/(\d+)$/.exec(path)

    if (projectMatch && method === 'GET') {
      const project = projects.find((item) => item.id === Number(projectMatch[1]))
      await route.fulfill(
        project ? success({ project }, 'Project retrieved successfully.') : notFound(),
      )
      return
    }

    if (projectMatch && (method === 'PUT' || method === 'PATCH')) {
      const payload = (body ?? {}) as { name?: string; description?: string | null }
      const project = projects.find((item) => item.id === Number(projectMatch[1]))

      if (!project) {
        await route.fulfill(notFound())
        return
      }

      Object.assign(project, payload)
      await route.fulfill(success({ project }, 'Project updated successfully.'))
      return
    }

    if (projectMatch && method === 'DELETE') {
      const index = projects.findIndex((item) => item.id === Number(projectMatch[1]))

      if (index >= 0) {
        projects.splice(index, 1)
      }

      await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' })
      return
    }

    const statsMatch = /^\/projects\/(\d+)\/stats$/.exec(path)

    if (statsMatch && method === 'GET') {
      const projectTasks = tasks.filter((task) => task.project_id === Number(statsMatch[1]))
      await route.fulfill(json({ data: computeStats(projectTasks) }))
      return
    }

    /* --------------------------------- Miembros -------------------------------- */

    if (/^\/projects\/\d+\/members$/.test(path) && method === 'GET') {
      await route.fulfill(success({ members }, 'Members retrieved successfully.'))
      return
    }

    if (/^\/projects\/\d+\/members$/.test(path) && method === 'POST') {
      await route.fulfill(success(null, 'User added to project successfully.'))
      return
    }

    if (/^\/projects\/\d+\/members\/\d+$/.test(path) && method === 'DELETE') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' })
      return
    }

    /* ---------------------------------- Tareas --------------------------------- */

    const tasksMatch = /^\/projects\/(\d+)\/tasks$/.exec(path)

    if (tasksMatch && method === 'GET') {
      const projectTasks = tasks.filter((task) => task.project_id === Number(tasksMatch[1]))
      const result = paginate(filterTasks(projectTasks, query), query)

      await route.fulfill(success(result, 'Tasks retrieved successfully.'))
      return
    }

    if (tasksMatch && method === 'POST') {
      const payload = (body ?? {}) as {
        title?: string
        description?: string | null
        status?: Task['status']
        priority?: Task['priority']
        due_date?: string | null
        assigned_to?: number | null
      }
      const created: Task = {
        id: 102,
        title: payload.title ?? 'Tarea sin título',
        description: payload.description ?? null,
        status: payload.status ?? 'pending',
        priority: payload.priority ?? 'medium',
        due_date: payload.due_date ?? null,
        project_id: Number(tasksMatch[1]),
        assigned_to: payload.assigned_to ?? null,
        created_at: '2026-10-31T10:00:00.000000Z',
        updated_at: '2026-10-31T10:00:00.000000Z',
      }
      tasks.push(created)

      await route.fulfill(success({ task: created }, 'Task created successfully.', 201))
      return
    }

    const taskMatch = /^\/projects\/(\d+)\/tasks\/(\d+)$/.exec(path)

    if (taskMatch && method === 'GET') {
      const task = tasks.find((item) => item.id === Number(taskMatch[2]))
      await route.fulfill(task ? success({ task }, 'Task retrieved successfully.') : notFound())
      return
    }

    if (taskMatch && (method === 'PATCH' || method === 'PUT')) {
      const payload = (body ?? {}) as Partial<Task>
      const task = tasks.find((item) => item.id === Number(taskMatch[2]))

      if (!task) {
        await route.fulfill(notFound())
        return
      }

      Object.assign(task, payload)
      await route.fulfill(success({ task }, 'Task updated successfully.'))
      return
    }

    if (taskMatch && method === 'DELETE') {
      const index = tasks.findIndex((item) => item.id === Number(taskMatch[2]))

      if (index >= 0) {
        tasks.splice(index, 1)
      }

      await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' })
      return
    }

    /* -------------------------------- Comentarios ------------------------------- */

    const commentsMatch = /^\/projects\/\d+\/tasks\/\d+\/comments$/.exec(path)

    if (commentsMatch && method === 'GET') {
      await route.fulfill({
        ...json({
          data: comments,
          links: { first: null, last: null, prev: null, next: null },
          meta: {
            current_page: 1,
            from: comments.length > 0 ? 1 : null,
            last_page: 1,
            links: [],
            path: `http://127.0.0.1:8000/api${path}`,
            per_page: 15,
            to: comments.length > 0 ? comments.length : null,
            total: comments.length,
          },
        }),
      })
      return
    }

    if (commentsMatch && method === 'POST') {
      const payload = (body ?? {}) as { body?: string }
      const created: Comment = {
        id: comments.length + 1,
        body: payload.body ?? '',
        created_at: '2026-10-31 10:05:00',
        // El autor lo determina el backend a partir de la sesión autenticada.
        author: { id: MOCK_USER.id, name: MOCK_USER.name, email: MOCK_USER.email },
      }
      comments.unshift(created)

      await route.fulfill(json({ data: created }, 201))
      return
    }

    await route.fulfill(notFound())
  })

  if (authenticated) {
    await page.addInitScript(() => {
      // `disableAuthentication()` permite comprobar la pantalla de login
      // dentro de una misma página sin que el script reactive la sesión.
      if (window.sessionStorage.getItem('taskflow.e2e.auth') !== 'off') {
        window.localStorage.setItem('taskflow.token', 'fake-token')
      }
    })
  }

  return {
    requests,
    last(method: string, path: string): RecordedRequest | undefined {
      return [...requests].reverse().find((item) => item.method === method && item.path === path)
    },
  }
}

/** Elimina la sesión simulada para poder visitar la pantalla de login. */
export async function disableAuthentication(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.sessionStorage.setItem('taskflow.e2e.auth', 'off')
    window.localStorage.removeItem('taskflow.token')
  })
}
