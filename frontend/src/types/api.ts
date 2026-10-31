/**
 * Tipos del contrato de la API REST de TaskFlow (backend Laravel 12).
 *
 * Reflejan las respuestas reales verificadas contra el backend
 * (`backend/routes/api.php`, `backend/documentacion/api-docs.json` y los
 * tests de contrato). No se asumen formas que no hayan sido comprobadas.
 */

/* -------------------------------------------------------------------------- */
/*  Envoltorios de respuesta                                                   */
/* -------------------------------------------------------------------------- */

/** Envoltorio estándar de las respuestas exitosas del backend. */
export interface ApiResponse<T> {
  success: true
  message: string
  data: T
}

/** Envoltorio estándar de las respuestas de error del backend (401/403/404/422/429/500). */
export interface ApiError {
  success: false
  message: string
  errors: Record<string, string[]> | null
}

/* -------------------------------------------------------------------------- */
/*  Paginación                                                                 */
/* -------------------------------------------------------------------------- */

/** Enlace de paginación generado por Laravel. */
export interface PaginationLink {
  url: string | null
  label: string
  page: number | null
  active: boolean
}

/** Metadatos de paginación de una colección de recursos de Laravel. */
export interface PaginationMeta {
  current_page: number
  from: number | null
  last_page: number
  links: PaginationLink[]
  path: string
  per_page: number
  to: number | null
  total: number
}

/**
 * Paginación del endpoint de tareas. El backend devuelve un objeto propio
 * (no el paginador estándar de Laravel), por eso se tipa aparte.
 */
export interface TaskPagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
  from: number | null
  to: number | null
}

/** Colección paginada de recursos (`JsonResource::collection()->response()`). */
export interface PaginatedCollection<T> {
  data: T[]
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
  meta: PaginationMeta
}

/* -------------------------------------------------------------------------- */
/*  Recursos                                                                   */
/* -------------------------------------------------------------------------- */

export interface User {
  id: number
  name: string
  email: string
  email_verified_at: string | null
  created_at: string | null
  updated_at: string | null
}

/**
 * Miembro de un proyecto. El backend serializa la colección de miembros con
 * `UserResource`, por lo que la forma es idéntica a `User` (el pivote `role`
 * existe en el modelo, pero no se expone en la respuesta actual).
 */
export type ProjectMember = User

export interface Project {
  id: number
  name: string
  description: string | null
  owner_id: number
  owner?: User | null
  members?: ProjectMember[] | null
  created_at: string | null
  updated_at: string | null
}

export type TaskStatus = 'pending' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type ProjectRole = 'owner' | 'member'

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus | null
  priority: TaskPriority | null
  due_date: string | null
  project_id: number
  assigned_to: number | null
  /** Solo aparece cuando el backend carga la relación `assignedUser`. */
  assigned_user?: User | null
  created_at: string | null
  updated_at: string | null
}

export interface CommentAuthor {
  id: number
  name: string
  email: string
}

export interface Comment {
  id: number
  body: string
  created_at: string
  author: CommentAuthor
}

export interface ProjectStats {
  total_tasks: number
  pending: number
  in_progress: number
  done: number
  overdue: number
  progress_percentage: number
}

/* -------------------------------------------------------------------------- */
/*  Payloads                                                                  */
/* -------------------------------------------------------------------------- */

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthPayload {
  user: User
  token: string
  token_type: string
}

export interface ProjectPayload {
  name: string
  description?: string | null
}

export interface TaskPayload {
  title: string
  description?: string | null
  status?: TaskStatus | null
  priority?: TaskPriority | null
  due_date?: string | null
  assigned_to?: number | null
}

export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: number
  due_date_from?: string
  due_date_to?: string
  search?: string
  sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'title' | 'status' | 'priority'
  sort_direction?: 'asc' | 'desc'
  per_page?: number
  page?: number
}

/* -------------------------------------------------------------------------- */
/*  Respuestas compuestas                                                     */
/* -------------------------------------------------------------------------- */

export type AuthResponse = ApiResponse<AuthPayload>
export type UserResponse = ApiResponse<{ user: User }>
export type ProjectsResponse = ApiResponse<{ projects: Project[] }>
export type ProjectResponse = ApiResponse<{ project: Project }>
export type MembersResponse = ApiResponse<{ members: ProjectMember[] }>
export type MessageResponse = ApiResponse<null>
export type TaskResponse = ApiResponse<{ task: Task }>
export type TasksResponse = ApiResponse<{ tasks: Task[]; pagination: TaskPagination }>
/** `GET /projects/{id}/stats` devuelve los datos sin el envoltorio `success/message`. */
export type StatsResponse = { data: ProjectStats }
/** Los comentarios se serializan como `JsonResource`, sin envoltorio `success/message`. */
export type CommentResponse = { data: Comment }
export type CommentsResponse = PaginatedCollection<Comment>
